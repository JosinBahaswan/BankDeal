import { createHash, createPublicKey, createSign } from "crypto";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asEmail,
  asText,
  createSupabaseAdminClient,
  jsonBody,
  normalizePem,
  resolveClientIp,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

function validateDocHash(docHash) {
  return /^[a-f0-9]{64}$/i.test(String(docHash || "").trim());
}

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

function certificateFingerprint(privateKeyPem, certPem) {
  if (certPem) {
    return createHash("sha256").update(certPem).digest("hex");
  }

  const publicKeyPem = createPublicKey(privateKeyPem).export({
    format: "pem",
    type: "spki",
  });

  return createHash("sha256").update(String(publicKeyPem)).digest("hex");
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

    const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "contracts-signature-attestation",
    max: Number(process.env.RATE_LIMIT_CONTRACT_SIGNATURE_MAX || 40),
    windowMs: Number(process.env.RATE_LIMIT_CONTRACT_SIGNATURE_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const privateKeyPem = normalizePem(process.env.CONTRACTS_SIGNING_PRIVATE_KEY_PEM);
  const certPem = normalizePem(process.env.CONTRACTS_SIGNING_CERT_PEM);

  if (!privateKeyPem) {
    return res.status(500).json({
      error: "Server is missing CONTRACTS_SIGNING_PRIVATE_KEY_PEM",
    });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const contractId = asText(body.contractId);
  const partyRole = asText(body.partyRole);
  const signerName = asText(body.signerName);
  const signerEmail = asEmail(body.signerEmail);
  const signedAt = asText(body.signedAt, new Date().toISOString());
  const sigMethod = asText(body.sigMethod).toLowerCase();
  const docHash = asText(body.docHash).toLowerCase();

  if (!contractId || !partyRole || !signerName || !signerEmail || !sigMethod || !docHash) {
    return res.status(400).json({
      error: "contractId, partyRole, signerName, signerEmail, sigMethod, and docHash are required",
    });
  }

  if (!["typed", "drawn"].includes(sigMethod)) {
    return res.status(400).json({ error: "sigMethod must be typed or drawn" });
  }

  if (!validateDocHash(docHash)) {
    return res.status(400).json({ error: "docHash must be a SHA-256 hex digest" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  const { data: contractRow, error: contractError } = await supabaseAdmin
    .from("contracts")
    .select("id, creator_id")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    return res.status(500).json({ error: `Failed to resolve contract: ${contractError.message}` });
  }

  if (!contractRow?.id) {
    return res.status(404).json({ error: "Contract not found" });
  }

  const { data: partyRows, error: partiesError } = await supabaseAdmin
    .from("contract_parties")
    .select("id, role, email")
    .eq("contract_id", contractId);

  if (partiesError) {
    return res.status(500).json({ error: `Failed to resolve contract parties: ${partiesError.message}` });
  }

  const matchedParty = (partyRows || []).find((row) => asText(row.role).toLowerCase() === partyRole.toLowerCase());
  if (!matchedParty?.id) {
    return res.status(400).json({ error: `Unknown party role for contract: ${partyRole}` });
  }

  const actorCanSign = actor.isAdmin
    || asText(contractRow.creator_id) === actor.userId
    || (partyRows || []).some((row) => asEmail(row.email) && asEmail(row.email) === actor.email);

  if (!actorCanSign) {
    return res.status(403).json({ error: "Authenticated user is not allowed to sign this contract" });
  }

  if (asEmail(matchedParty.email) && asEmail(matchedParty.email) !== signerEmail && !actor.isAdmin) {
    return res.status(403).json({ error: "Signer email does not match assigned party email" });
  }

  const signerIp = resolveClientIp(req);
  const signaturePayload = canonicalSignaturePayload({
    contractId,
    partyRole,
    signerName,
    signerEmail,
    signerIp,
    signedAt,
    sigMethod,
    docHash,
    signerUserId: actor.userId,
  });

  let signatureValue;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(signaturePayload);
    signer.end();

    // support PKCS#1 / PKCS#8 keys and base64-encoded single-line keys
    let toSignKey = privateKeyPem;
    // If key looks like base64 (no PEM header but long), decode it
    const compact = String(privateKeyPem || "").replace(/\s+/g, "");
    if (!toSignKey.includes("-----BEGIN ") && /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 100) {
      try {
        const decoded = Buffer.from(compact, "base64").toString("utf8");
        toSignKey = decoded.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
      } catch {
        // leave as-is
      }
    }

    signatureValue = signer.sign(toSignKey, "base64");
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to sign contract attestation payload",
    });
  }

  let certFingerprint;
  try {
    certFingerprint = certificateFingerprint(privateKeyPem, certPem);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to compute signing certificate fingerprint",
    });
  }

  return res.status(200).json({
    signerIp,
    signerUserId: actor.userId,
    algorithm: "RS256",
    signaturePayload,
    signaturePayloadB64: Buffer.from(signaturePayload, "utf8").toString("base64url"),
    signatureValue,
    certFingerprint,
    certPem: certPem || "",
    serverSignedAt: new Date().toISOString(),
  });
}
