import { supabase } from "../../../../lib/supabaseClient";

const PARTNER_TRACKING_ENDPOINT = String(import.meta.env.VITE_PARTNER_TRACKING_ENDPOINT || "/api/partner-referral-event").trim();
const REFERRAL_ID_STORAGE_KEY = "dealbank_partner_referral_id";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function hasWindow() {
  return typeof window !== "undefined";
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export function getPartnerReferralId(user) {
  const userId = asText(user?.id);
  if (userId) {
    return `dbk-${userId.slice(0, 8)}`;
  }

  if (!hasWindow()) return `dbk-guest-${randomSuffix()}`;

  const existing = asText(window.localStorage.getItem(REFERRAL_ID_STORAGE_KEY));
  if (existing) return existing;

  const next = `dbk-guest-${Date.now().toString(36)}-${randomSuffix()}`;
  window.localStorage.setItem(REFERRAL_ID_STORAGE_KEY, next);
  return next;
}

function appendTrackingParams(url, params) {
  const input = asText(url);
  if (!input) return "";

  try {
    const parsed = new URL(input);

    if (params.referralId) parsed.searchParams.set("db_ref", params.referralId);
    if (params.partnerId) parsed.searchParams.set("db_partner", params.partnerId);
    if (params.partnerType) parsed.searchParams.set("db_partner_type", params.partnerType);

    parsed.searchParams.set("utm_source", "dealbank");
    parsed.searchParams.set("utm_medium", "affiliate");
    if (params.partnerId) {
      parsed.searchParams.set("utm_campaign", params.partnerId);
    }

    return parsed.toString();
  } catch {
    return input;
  }
}

export function buildTrackedPartnerUrl(url, options = {}) {
  return appendTrackingParams(url, {
    referralId: asText(options.referralId),
    partnerId: asText(options.partnerId),
    partnerType: asText(options.partnerType),
  });
}

export function buildPartnerTrackingPixelUrl(options = {}) {
  if (!PARTNER_TRACKING_ENDPOINT) return "";

  const base = PARTNER_TRACKING_ENDPOINT;
  const query = new URLSearchParams();

  query.set("action", "impression");
  query.set("partnerId", asText(options.partnerId));
  query.set("partnerType", asText(options.partnerType, "software"));
  query.set("referralId", asText(options.referralId));
  query.set("placement", asText(options.placement));
  query.set("sourceTab", asText(options.sourceTab));
  query.set("campaign", asText(options.campaign));
  query.set("targetUrl", asText(options.targetUrl));

  return `${base}?${query.toString()}`;
}

async function optionalAccessToken() {
  const { data } = await supabase.auth.getSession();
  return asText(data?.session?.access_token);
}

export async function trackPartnerEvent(options = {}) {
  if (!PARTNER_TRACKING_ENDPOINT) return;

  const payload = {
    action: asText(options.action, "click"),
    partnerId: asText(options.partnerId),
    partnerType: asText(options.partnerType, "software"),
    referralId: asText(options.referralId),
    placement: asText(options.placement),
    sourceTab: asText(options.sourceTab),
    campaign: asText(options.campaign),
    targetUrl: asText(options.targetUrl),
    utmSource: "dealbank",
    utmMedium: "affiliate",
    utmCampaign: asText(options.partnerId),
  };

  if (!payload.partnerId) return;

  const accessToken = await optionalAccessToken();

  await fetch(PARTNER_TRACKING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // no-op
  });
}
