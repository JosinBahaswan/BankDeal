import {
  appBaseUrl,
  asText,
  createStripeClient,
  createSupabaseAdminClient,
  getOrCreateConnectAccount,
  jsonBody,
  safePath,
  setCors,
  syncConnectAccount,
  verifyStripeActor,
} from "../lib/server/stripeConnectShared.js";
import { enforceRateLimit } from "../lib/server/httpSecurity.js";

function accountLinkType(account) {
  if (account?.details_submitted) {
    return "account_update";
  }
  return "account_onboarding";
}

export default async function handler(req, res) {
  const cors = setCors(req, res, "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    if (!cors.originAllowed) return res.status(403).json({ error: "CORS origin is not allowed" });
    return res.status(204).end();
  }

  if (!cors.originAllowed) {
    return res.status(403).json({ error: "CORS origin is not allowed" });
  }

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "stripe-connect-account-link",
    max: Number(process.env.RATE_LIMIT_STRIPE_CONNECT_MAX || 30),
    windowMs: Number(process.env.RATE_LIMIT_STRIPE_CONNECT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.method === "POST" ? (jsonBody(req) || {}) : {};

  let stripe;
  let supabaseAdmin;
  try {
    stripe = createStripeClient();
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Stripe Connect" });
  }

  let actor;
  try {
    actor = await verifyStripeActor(req, supabaseAdmin, {
      allowedTypes: ["dealmaker", "contractor", "realtor"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const country = asText(body.country, "US").toUpperCase();
  const accountType = asText(body.accountType, "express").toLowerCase();
  const returnPath = safePath(body.returnPath, "/?connect=return");
  const refreshPath = safePath(body.refreshPath, "/?connect=refresh");
  const rootUrl = appBaseUrl(req);

  try {
    const stripeAccountId = await getOrCreateConnectAccount({
      supabase: supabaseAdmin,
      stripe,
      userId: actor.userId,
      email: actor.email,
      country,
      accountType,
    });

    const synced = await syncConnectAccount({
      supabase: supabaseAdmin,
      stripe,
      stripeAccountId,
    });

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${rootUrl}${refreshPath}`,
      return_url: `${rootUrl}${returnPath}`,
      type: accountLinkType(synced.account),
    });

    return res.status(200).json({
      accountId: stripeAccountId,
      onboardingUrl: link.url,
      expiresAt: link.expires_at,
      chargesEnabled: synced.status.chargesEnabled,
      payoutsEnabled: synced.status.payoutsEnabled,
      detailsSubmitted: synced.status.detailsSubmitted,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to create Stripe Connect account onboarding link",
    });
  }
}
