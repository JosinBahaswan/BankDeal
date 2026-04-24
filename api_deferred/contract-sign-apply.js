import { createHash, createSign, createPublicKey } from "crypto";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  resolveClientIp,
  normalizePem,
} from "../lib/server/contractsShared.js";
import {
  loadContractBundle,
  renderBundlePdfBuffer,
  persistGeneratedPdf,
  CONTRACTS_BUCKET,
} from "../lib/server/contractsDocumentService.js";

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!m) return null;
  return { mime: m[1], data: Buffer.from(m[2], "base64") };
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type" });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, { keyPrefix: "contract-sign-apply", max: Number(process.env.RATE_LIMIT_CONTRACT_SIGN_APPLY_MAX || 300), windowMs: Number(process.env.RATE_LIMIT_CONTRACT_SIGN_APPLY_WINDOW_MS || 60_000) });
  if (!rateLimit.allowed) return res.status(429).json({ error: "Too many requests. Please retry later." });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const rawToken = asText(body.token);
  const signerName = asText(body.signerName || body.signer_name);
  const sigMethod = asText(body.sigMethod || body.sig_method || "typed");
  const sigDataUrl = asText(body.sigImage || body.sig_image || body.sigImageDataUrl || "");

  if (!rawToken || !signerName) return res.status(400).json({ error: "token and signerName are required" });

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unable to initialize Supabase admin client" });
  }

  // Resolve delivery attempt row by token stored in payload
  const { data: attemptRow, error: attemptError } = await supabaseAdmin
    .from("contract_delivery_attempts")
    .select("id, contract_id, recipient_email, recipient_name, recipient_role, payload, status")
    .eq("payload->>signing_token_hash", tokenHash)
    .maybeSingle();

  if (attemptError) {
    return res.status(500).json({ error: `Failed to validate signing token: ${attemptError.message}` });
  }

  if (!attemptRow?.id) {
    return res.status(400).json({ error: "Invalid or unknown signing token" });
  }

  const expiresAt = asText(attemptRow.payload?.signing_token_expires_at || "");
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return res.status(410).json({ error: "Signing token has expired" });
  }

  const contractId = asText(attemptRow.contract_id);
  const recipientEmail = asText(attemptRow.recipient_email || "");
  const recipientRole = asText(attemptRow.recipient_role || "Signer");

  // Generate PDF buffer and compute doc hash
  let pdfBuffer;
  try {
    const bundle = await loadContractBundle(supabaseAdmin, contractId);
    pdfBuffer = await renderBundlePdfBuffer(bundle);
  } catch (err) {
    return res.status(500).json({ error: `Failed to render contract PDF: ${err?.message || err}` });
  }

  const docHash = createHash("sha256").update(pdfBuffer).digest("hex");

  // Persist signature image if provided
  let sigImagePath = null;
  if (sigDataUrl) {
    const parsed = parseDataUrl(sigDataUrl);
    if (parsed) {
      const path = `contracts/${contractId}/signatures/${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;
      const { error: uploadError } = await supabaseAdmin.storage.from(CONTRACTS_BUCKET).upload(path, parsed.data, { upsert: true, contentType: parsed.mime });
      if (uploadError) {
        console.error("contract-sign-apply: signature upload failed", uploadError.message || uploadError);
      } else {
        sigImagePath = path;
      }
    }
  }

  // Resolve party id for this role (optional)
  const { data: partyRow } = await supabaseAdmin
    .from("contract_parties")
    .select("id")
    .eq("contract_id", contractId)
    .eq("role", recipientRole)
    .maybeSingle();

  const partyId = partyRow?.id || null;

  // Build canonical attestation payload and sign it using server private key (RS256)
  function canonicalSignaturePayload(payload) {
    return JSON.stringify({
      version: 1,
      contractId: payload.contractId,
      partyRole: payload.partyRole,
      signerName: payload.signerName,
      signerEmail: payload.signerEmail,
      signerIp: payload.signerIp,
      signedAt: payload.signedAt,
      sigMethod: payload.sigMethod,
      docHash: payload.docHash,
      signerUserId: payload.signerUserId,
    });
  }

  const signedAt = asText(body.signedAt) || new Date().toISOString();
  const signerIp = resolveClientIp(req) || null;
  const signerUserId = null; // public signing flow (no authenticated user)

  const privateKeyPem = normalizePem(process.env.CONTRACTS_SIGNING_PRIVATE_KEY_PEM || "");
  if (!privateKeyPem) {
    return res.status(500).json({ error: "Server is missing CONTRACTS_SIGNING_PRIVATE_KEY_PEM" });
  }

  const certPem = normalizePem(process.env.CONTRACTS_SIGNING_CERT_PEM || "");

  let signatureAlgorithm = "RS256";
  let signaturePayload = "";
  let signatureValue = "";
  let signingCertFingerprint = null;
  let serverSignedAt = new Date().toISOString();

  try {
    signaturePayload = canonicalSignaturePayload({
      contractId,
      partyRole: recipientRole,
      signerName,
      signerEmail: recipientEmail,
      signerIp,
      signedAt,
      sigMethod,
      docHash,
      signerUserId,
    });

    const signer = createSign("RSA-SHA256");
    signer.update(signaturePayload);
    signer.end();
    signatureValue = signer.sign(privateKeyPem, "base64");

    if (certPem) {
      signingCertFingerprint = createHash("sha256").update(certPem).digest("hex");
    } else {
      const publicKeyPem = createPublicKey(privateKeyPem).export({ format: "pem", type: "spki" });
      signingCertFingerprint = createHash("sha256").update(String(publicKeyPem)).digest("hex");
    }
  } catch (err) {
    console.error("contract-sign-apply: attestation signing failed", err?.message || err);
    return res.status(500).json({ error: "Failed to create RS256 attestation for signature" });
  }

  // Insert signature record as admin (include attestation fields)
  const signatureInsert = {
    contract_id: contractId,
    party_id: partyId,
    signer_name: signerName,
    signer_email: recipientEmail || asText(body.signerEmail || body.signer_email || ""),
    signer_ip: signerIp,
    signed_at: signedAt,
    server_signed_at: serverSignedAt,
    sig_method: sigMethod === "drawn" ? "drawn" : "typed",
    sig_image_url: sigImagePath,
    doc_hash: docHash,
    party_role: recipientRole,
    signature_algorithm: signatureAlgorithm,
    signature_payload: signaturePayload,
    signature_value: signatureValue,
    signing_cert_fingerprint: signingCertFingerprint,
    signing_cert_pem: certPem || null,
  };

  const { error: insertError } = await supabaseAdmin
    .from("contract_signatures")
    .insert(signatureInsert);

  if (insertError) {
    return res.status(500).json({ error: `Failed to persist signature: ${insertError.message}` });
  }

  // Mark delivery attempt delivered
  await supabaseAdmin
    .from("contract_delivery_attempts")
    .update({ status: "delivered", attempt_count: (attemptRow.attempt_count || 0) + 1, last_attempt_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
    .eq("id", attemptRow.id);

  // Check if all parties have signed
  const [{ data: parties }, { data: signatures }] = await Promise.all([
    supabaseAdmin.from("contract_parties").select("id, role").eq("contract_id", contractId),
    supabaseAdmin.from("contract_signatures").select("id, party_role").eq("contract_id", contractId),
  ]);

  const partyRoles = (parties || []).map((p) => String(p.role || "").toLowerCase());
  const signedRoles = new Set((signatures || []).map((s) => String(s.party_role || "").toLowerCase()));

  const allSigned = partyRoles.length > 0 && partyRoles.every((r) => signedRoles.has(r));

  if (allSigned) {
    // mark contract fully executed and persist final PDF if needed
    try {
      await supabaseAdmin.from("contracts").update({ status: "fully_executed", executed_at: new Date().toISOString() }).eq("id", contractId);
      // persist final generated PDF (overwrite)
      await persistGeneratedPdf(supabaseAdmin, contractId, pdfBuffer);
    } catch (err) {
      console.error("contract-sign-apply: failed to finalize contract", err?.message || err);
    }
  }

  return res.status(200).json({ ok: true, contractId, signed: true, fullyExecuted: !!allSigned });
}
