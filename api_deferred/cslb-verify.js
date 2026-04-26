import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  resolveClientIp,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import {
  isCslbLicenseFormat,
  normalizeCslbLicense,
  verifyCslbLicenseNumber,
} from "../lib/server/cslbVerification.js";

function cacheIsFresh(lastVerifiedAt, ttlHours) {
  const ts = new Date(lastVerifiedAt || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const ttlMs = Math.max(1, Number(ttlHours || 24)) * 60 * 60 * 1000;
  return Date.now() - ts <= ttlMs;
}

function normalizeCacheRow(row) {
  if (!row) return null;

  return {
    valid: Boolean(row.valid),
    licenseNumber: asText(row.license_number),
    status: asText(row.status, row.valid ? "Active" : "Unknown"),
    legalName: asText(row.legal_name),
    expiresOn: asText(row.expires_on),
    source: asText(row.source, "cache"),
    message: row.valid
      ? "License verified using cached CSLB result."
      : "Cached CSLB result indicates a non-active license.",
    payload: row.raw_payload || {},
    cached: true,
    cachedAt: row.last_verified_at,
  };
}

async function insertVerificationAttempt(supabaseAdmin, input) {
  await supabaseAdmin
    .from("cslb_verification_attempts")
    .insert({
      license_number: input.licenseNumber,
      user_id: input.userId || null,
      request_ip: input.requestIp || null,
      source: input.source || "unknown",
      success: Boolean(input.success),
      valid: input.valid,
      status: input.status || null,
      message: input.message || null,
      response_payload: input.payload || {},
    });
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "cslb-verify",
    max: Number(process.env.RATE_LIMIT_CSLB_MAX || 30),
    windowMs: Number(process.env.RATE_LIMIT_CSLB_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const licenseNumber = normalizeCslbLicense(body.licenseNumber);
  if (!isCslbLicenseFormat(licenseNumber)) {
    return res.status(400).json({ error: "Invalid CSLB license number format" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin, {
      allowedTypes: ["contractor", "admin"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  const requestIp = resolveClientIp(req);
  const cacheTtlHours = Math.max(1, Number(process.env.CSLB_CACHE_TTL_HOURS || 24));

  const { data: cachedRow } = await supabaseAdmin
    .from("cslb_license_cache")
    .select("license_number, valid, status, legal_name, expires_on, source, last_verified_at, raw_payload")
    .eq("license_number", licenseNumber)
    .maybeSingle();

  if (cachedRow && cacheIsFresh(cachedRow.last_verified_at, cacheTtlHours)) {
    const payload = normalizeCacheRow(cachedRow);

    await insertVerificationAttempt(supabaseAdmin, {
      licenseNumber,
      userId: actor.userId,
      requestIp,
      source: payload?.source || "cache",
      success: true,
      valid: payload?.valid,
      status: payload?.status,
      message: payload?.message,
      payload: payload?.payload,
    });

    return res.status(200).json(payload);
  }

  const verification = await verifyCslbLicenseNumber(licenseNumber);

  if (!verification.ok) {
    await insertVerificationAttempt(supabaseAdmin, {
      licenseNumber,
      userId: actor.userId,
      requestIp,
      source: verification.source,
      success: false,
      valid: verification.valid,
      status: verification.status,
      message: verification.message,
      payload: verification.payload,
    });

    if (cachedRow) {
      const fallback = normalizeCacheRow(cachedRow);
      return res.status(200).json({
        ...fallback,
        message: `${verification.message} Returning last cached verification result.`,
      });
    }

    return res.status(503).json({
      error: verification.message || "Unable to verify CSLB license right now.",
    });
  }

  const upsertPayload = {
    license_number: licenseNumber,
    valid: Boolean(verification.valid),
    status: asText(verification.status, verification.valid ? "Active" : "Unknown"),
    legal_name: asText(verification.legalName),
    expires_on: asText(verification.expiresOn) || null,
    source: asText(verification.source, "unknown"),
    last_verified_at: new Date().toISOString(),
    raw_payload: verification.payload || {},
  };

  await supabaseAdmin
    .from("cslb_license_cache")
    .upsert(upsertPayload, { onConflict: "license_number" });

  await insertVerificationAttempt(supabaseAdmin, {
    licenseNumber,
    userId: actor.userId,
    requestIp,
    source: upsertPayload.source,
    success: true,
    valid: upsertPayload.valid,
    status: upsertPayload.status,
    message: verification.message,
    payload: verification.payload,
  });

  return res.status(200).json({
    valid: upsertPayload.valid,
    licenseNumber,
    status: upsertPayload.status,
    legalName: upsertPayload.legal_name,
    expiresOn: upsertPayload.expires_on || "",
    source: upsertPayload.source,
    message: verification.message || (upsertPayload.valid ? "License verified." : "License is not currently active."),
    cached: false,
  });
}
