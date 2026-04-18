import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

function normalizePlatform(value) {
  const normalized = asText(value, "unknown").toLowerCase();
  if (["ios", "android", "web"].includes(normalized)) return normalized;
  return "unknown";
}

function normalizeDeviceId(value) {
  const normalized = asText(value);
  if (!normalized) return "";
  return normalized.slice(0, 120);
}

function normalizeAppVersion(value) {
  const normalized = asText(value);
  if (!normalized) return "";
  return normalized.slice(0, 64);
}

function validatePushToken(token) {
  const normalized = asText(token);
  if (!normalized) return "";
  if (normalized.length < 16 || normalized.length > 512) return "";
  return normalized;
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "mobile-push-token",
    max: Number(process.env.RATE_LIMIT_PUSH_TOKEN_MAX || process.env.RATE_LIMIT_MAX || 60),
    windowMs: Number(process.env.RATE_LIMIT_PUSH_TOKEN_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
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

  const token = validatePushToken(body.token);
  if (!token) {
    return res.status(400).json({ error: "A valid push token is required" });
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
      allowedTypes: ["dealmaker", "contractor", "realtor", "admin"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  const payload = {
    user_id: actor.userId,
    token,
    platform: normalizePlatform(body.platform),
    app_version: normalizeAppVersion(body.appVersion),
    device_id: normalizeDeviceId(body.deviceId),
    last_seen_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("mobile_push_tokens")
    .upsert(payload, {
      onConflict: "user_id,token",
    })
    .select("id, user_id, platform, app_version, device_id, last_seen_at")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to upsert push token" });
  }

  return res.status(200).json({
    ok: true,
    record: data || {
      user_id: actor.userId,
      platform: payload.platform,
      app_version: payload.app_version,
      device_id: payload.device_id,
      last_seen_at: payload.last_seen_at,
    },
  });
}
