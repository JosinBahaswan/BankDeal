import { randomBytes, createHash } from "crypto";
import sgMail from "@sendgrid/mail";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  appBaseUrl,
  asEmail,
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import { verifySendgridSetup } from "../lib/server/sendgridShared.js";

function signingTokenExpiryIso() {
  const ttlHours = Math.max(1, Number(process.env.SIGNING_TOKEN_TTL_HOURS || 168));
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "contract-invite",
    max: Number(process.env.RATE_LIMIT_CONTRACT_INVITE_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_CONTRACT_INVITE_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req) || {};
  const { contractId } = body;

  if (!contractId) {
    return res.status(400).json({ error: "contractId is required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin);
  } catch (err) {
    return res.status(401).json({ error: err?.message || "Unauthorized request" });
  }

  try {
    // 1) Load contract and its parties
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("contracts")
      .select("id, creator_id, title, status")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    if (contract.creator_id !== actor.userId && !actor.isAdmin) {
      return res.status(403).json({ error: "You do not have permission to send invitations for this contract" });
    }

    const { data: parties, error: partiesError } = await supabaseAdmin
      .from("contract_parties")
      .select("id, role, name, email, party_order")
      .eq("contract_id", contractId);

    if (partiesError) throw partiesError;

    const { data: signatures, error: sigError } = await supabaseAdmin
      .from("contract_signatures")
      .select("party_id, party_role")
      .eq("contract_id", contractId);

    if (sigError) throw sigError;

    const signedPartyRoles = new Set(signatures.map(s => String(s.party_role || "").toLowerCase()));
    const signedPartyIds = new Set(signatures.map(s => s.party_id).filter(Boolean));

    const pendingParties = parties.filter(p => {
      const roleLower = String(p.role || "").toLowerCase();
      return !signedPartyRoles.has(roleLower) && !signedPartyIds.has(p.id);
    });

    if (pendingParties.length === 0) {
      return res.status(200).json({ ok: true, message: "All parties have already signed." });
    }

    // 2) Verify SendGrid
    let sendgridConfig;
    try {
      sendgridConfig = verifySendgridSetup();
    } catch (err) {
      throw new Error(err?.message || "SendGrid configuration error");
    }

    const sendgridKey = asText(sendgridConfig.apiKey || process.env.SENDGRID_API_KEY || "");
    const fromEmail = asText(sendgridConfig.fromEmail || process.env.SENDGRID_FROM_EMAIL || "no-reply@dealbank.local");
    sgMail.setApiKey(sendgridKey);

    const rootUrl = appBaseUrl(req);
    const results = [];

    // 3) Process each pending party
    for (const party of pendingParties) {
      const email = asEmail(party.email);
      if (!email) {
        results.push({ role: party.role, status: "skipped", reason: "missing_email" });
        continue;
      }

      // Skip the creator if they are the first party and haven't signed (they can sign from dashboard)
      // but in production, we might want to send it anyway if they prefer email.
      // For now, let's send to everyone pending.

      const rawToken = randomBytes(24).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = signingTokenExpiryIso();

      // Record delivery attempt
      const { error: deliveryError } = await supabaseAdmin
        .from("contract_delivery_attempts")
        .insert({
          contract_id: contractId,
          recipient_email: email,
          recipient_name: asText(party.name || party.role),
          recipient_role: party.role,
          channel: "email",
          status: "pending",
          payload: {
            signing_token_hash: tokenHash,
            signing_token_expires_at: expiresAt,
          },
        });

      if (deliveryError) {
        results.push({ role: party.role, status: "failed", reason: "db_error", error: deliveryError.message });
        continue;
      }

      const signUrl = `${rootUrl}/api/contract-sign?token=${encodeURIComponent(rawToken)}`;
      
      const msg = {
        to: email,
        from: fromEmail,
        subject: `Signature Requested: ${contract.title}`,
        text: `Hello ${asText(party.name || party.role)},\n\nYou have been invited to review and sign a contract on DealBank: ${contract.title}\n\nSign here: ${signUrl}\n\nThanks.`,
        html: `<div style="font-family: Arial,Helvetica,sans-serif;line-height:1.6;color:#111827">
          <p>Hello ${asText(party.name || party.role)},</p>
          <p>You have been invited to review and sign the following DealBank contract:</p>
          <p><strong>${asText(contract.title)}</strong></p>
          <p><a href="${signUrl}" style="display:inline-block;padding:10px 14px;border-radius:6px;background:#111827;color:#fff;text-decoration:none">Review & Sign Contract</a></p>
          <p style="font-size: 12px; color: #6b7280;">This link will expire in 7 days.</p>
        </div>`,
      };

      try {
        await sgMail.send(msg);
        await supabaseAdmin
          .from("contract_delivery_attempts")
          .update({ status: "delivered", attempt_count: 1, last_attempt_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
          .eq("contract_id", contractId)
          .eq("recipient_email", email)
          .eq("recipient_role", party.role);
        
        results.push({ role: party.role, status: "sent", email });
      } catch (err) {
        results.push({ role: party.role, status: "failed", reason: "sendgrid_error", error: err.message });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error("contract-invite error", err);
    return res.status(500).json({ error: err?.message || "Failed to process invitations" });
  }
}
