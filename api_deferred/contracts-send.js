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
import {
  loadContractBundle,
  renderBundlePdfBuffer,
  persistGeneratedPdf,
  CONTRACTS_BUCKET,
} from "../lib/server/contractsDocumentService.js";

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

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "contracts-send",
    max: Number(process.env.RATE_LIMIT_CONTRACTS_SEND_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_CONTRACTS_SEND_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req) || {};
  const { email: rawEmail, address, price, sellerName } = body;

  const sellerEmail = asEmail(rawEmail || "");
  if (!sellerEmail || !address) {
    return res.status(400).json({ error: "Email and property address are required" });
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
    // 1) Create a minimal contract record (assignment template)
    const contractTitle = `${asText(address)} · ${asText(sellerName || actor.name || "Seller")}`;

    const { data: contractRow, error: contractError } = await supabaseAdmin
      .from("contracts")
      .insert({
        creator_id: actor.userId,
        template: "assignment",
        title: contractTitle,
        fee_pct: 1.5,
      })
      .select("id")
      .single();

    if (contractError) {
      throw new Error(`Failed to create contract: ${contractError.message}`);
    }

    const contractId = contractRow?.id;

    // 2) Create contract parties (Assignor = seller, Assignee = current user)
    const partiesPayload = [
      { contract_id: contractId, role: "Assignor", name: asText(sellerName), email: sellerEmail, party_order: 1 },
      { contract_id: contractId, role: "Assignee", name: asText(actor.name), email: asEmail(actor.email), party_order: 2 },
    ];

    const { error: partiesError } = await supabaseAdmin
      .from("contract_parties")
      .insert(partiesPayload);

    if (partiesError) {
      throw new Error(`Failed to create contract parties: ${partiesError.message}`);
    }

    // 3) Insert basic form values
    const formPayload = [];
    formPayload.push({ contract_id: contractId, field_key: "propertyAddress", field_value: asText(address) });
    if (price) formPayload.push({ contract_id: contractId, field_key: "purchasePrice", field_value: String(price) });
    if (body.assignmentFee) formPayload.push({ contract_id: contractId, field_key: "assignmentFee", field_value: String(body.assignmentFee) });
    if (body.closeDate) formPayload.push({ contract_id: contractId, field_key: "closeDate", field_value: String(body.closeDate) });

    if (formPayload.length > 0) {
      const { error: formError } = await supabaseAdmin
        .from("contract_form_values")
        .insert(formPayload);

      if (formError) {
        throw new Error(`Failed to persist contract form values: ${formError.message}`);
      }
    }

    // 4) Generate and persist server-side PDF for the newly created contract
    let pdfBuffer;
    try {
      const bundle = await loadContractBundle(supabaseAdmin, contractId);
      pdfBuffer = await renderBundlePdfBuffer(bundle);
    } catch (err) {
      throw new Error(`Failed to render contract PDF: ${err?.message || err}`);
    }

    let persisted;
    try {
      persisted = await persistGeneratedPdf(supabaseAdmin, contractId, pdfBuffer);
    } catch (err) {
      throw new Error(`Failed to persist contract PDF: ${err?.message || err}`);
    }

    // 5) Create a signing token and record a delivery attempt row that contains the token hash
    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = signingTokenExpiryIso();

    const { error: deliveryError } = await supabaseAdmin
      .from("contract_delivery_attempts")
      .insert({
        contract_id: contractId,
        recipient_email: sellerEmail,
        recipient_name: asText(sellerName || "Seller"),
        recipient_role: "Assignor",
        channel: "email",
        status: "pending",
        attempt_count: 0,
        last_attempt_at: null,
        next_retry_at: new Date().toISOString(),
        last_error: null,
        payload: {
          signing_token_hash: tokenHash,
          signing_token_expires_at: expiresAt,
        },
      });

    if (deliveryError) {
      throw new Error(`Failed to record delivery attempt: ${deliveryError.message}`);
    }

    // 6) Send a signing invitation email with link
    const signUrl = `${appBaseUrl(req)}/api/contract-sign?token=${encodeURIComponent(rawToken)}`;

    const sendgridKey = asText(process.env.SENDGRID_API_KEY || "");
    const fromEmail = asText(process.env.SENDGRID_FROM_EMAIL || "no-reply@dealbank.local");

    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      const msg = {
        to: sellerEmail,
        from: fromEmail,
        subject: `Please sign contract for ${asText(address)}`,
        text: `Hello ${asText(sellerName || "Seller")},\n\nPlease review and sign the attached DealBank contract: ${signUrl}\n\nIf you have any questions reply to this email.\n\nThanks.`,
        html: `<div style="font-family: Arial,Helvetica,sans-serif;line-height:1.6;color:#111827"><p>Hello ${asText(sellerName || "Seller")},</p><p>Please review and sign the DealBank contract for <strong>${asText(address)}</strong>.</p><p><a href="${signUrl}" style="display:inline-block;padding:10px 14px;border-radius:6px;background:#111827;color:#fff;text-decoration:none">Open & Sign Contract</a></p><p>If you have questions reply to this email.</p></div>`,
      };

      try {
        await sgMail.send(msg);
        // update delivery attempt to reflect that email was sent
        await supabaseAdmin
          .from("contract_delivery_attempts")
          .update({ status: "delivered", attempt_count: 1, last_attempt_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
          .eq("contract_id", contractId)
          .eq("recipient_email", sellerEmail)
          .eq("recipient_role", "Assignor");
      } catch (err) {
        console.error("contracts-send: sendgrid error", err?.message || err);
      }
    }

    return res.status(200).json({ ok: true, contractId, signUrl, pdfUrl: asText(persisted?.signedUrl) });
  } catch (err) {
    console.error("contracts-send error", err);
    return res.status(500).json({ error: err?.message || "Failed to process contract delivery" });
  }
}
