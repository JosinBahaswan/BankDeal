import { Buffer } from "buffer";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  parseBearerToken,
  resolveClientIp,
} from "../lib/server/contractsShared.js";

const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

function normalizeAction(value) {
  const normalized = asText(value, "click").toLowerCase();
  return normalized === "impression" ? "impression" : "click";
}

function normalizePartnerType(value) {
  const normalized = asText(value, "software").toLowerCase();
  if (["software", "insurance", "mortgage", "ad"].includes(normalized)) {
    return normalized;
  }

  return "software";
}

function parsePayload(req) {
  if (req.method === "GET") {
    return {
      action: req.query?.action,
      partnerId: req.query?.partnerId,
      partnerType: req.query?.partnerType,
      referralId: req.query?.referralId,
      placement: req.query?.placement,
      sourceTab: req.query?.sourceTab,
      campaign: req.query?.campaign,
      targetUrl: req.query?.targetUrl,
      utmSource: req.query?.utmSource,
      utmMedium: req.query?.utmMedium,
      utmCampaign: req.query?.utmCampaign,
    };
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return null;
}

async function resolveOptionalUserId(supabaseAdmin, req) {
  const token = parseBearerToken(req);
  if (!token) return "";

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return "";

  return asText(data.user.id);
}

function sendPixelResponse(res) {
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).send(PIXEL_GIF);
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "partner-referral-event",
    max: Number(process.env.RATE_LIMIT_PARTNER_REFERRAL_MAX || 120),
    windowMs: Number(process.env.RATE_LIMIT_PARTNER_REFERRAL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    if (req.method === "GET") {
      return sendPixelResponse(res);
    }

    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = parsePayload(req);
  if (!payload) {
    if (req.method === "GET") {
      return sendPixelResponse(res);
    }

    return res.status(400).json({ error: "Invalid payload" });
  }

  const partnerId = asText(payload.partnerId);
  if (!partnerId) {
    if (req.method === "GET") {
      return sendPixelResponse(res);
    }

    return res.status(400).json({ error: "partnerId is required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    if (req.method === "GET") {
      return sendPixelResponse(res);
    }

    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  const optionalUserId = await resolveOptionalUserId(supabaseAdmin, req);

  await supabaseAdmin
    .from("partner_referral_events")
    .insert({
      user_id: optionalUserId || null,
      partner_id: partnerId,
      partner_type: normalizePartnerType(payload.partnerType),
      action: normalizeAction(payload.action),
      referral_id: asText(payload.referralId) || null,
      placement: asText(payload.placement) || null,
      source_tab: asText(payload.sourceTab) || null,
      campaign: asText(payload.campaign) || null,
      target_url: asText(payload.targetUrl) || null,
      utm_params: {
        source: asText(payload.utmSource),
        medium: asText(payload.utmMedium),
        campaign: asText(payload.utmCampaign),
      },
      request_ip: resolveClientIp(req) || null,
      user_agent: asText(req.headers?.["user-agent"]) || null,
      referer: asText(req.headers?.referer) || null,
    });

  if (req.method === "GET") {
    return sendPixelResponse(res);
  }

  return res.status(200).json({ ok: true });
}
