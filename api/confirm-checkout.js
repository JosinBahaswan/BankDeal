import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { asText, mapStripeSubscriptionStatus, resolveStripePriceConfig } from "./stripeCatalog.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function jsonBody(req) {
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

function toIsoFromUnix(unixSeconds) {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

function toMoneyFromCents(amountCents, fallback = 0) {
  const cents = Number(amountCents);
  if (!Number.isFinite(cents)) return Number(fallback) || 0;
  return Number((cents / 100).toFixed(2));
}

function createSupabaseAdminClient() {
  const supabaseUrl = asText(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRole = asText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyRequestIdentity(req, expectedUserId, supabaseAdmin) {
  const authHeader = asText(req.headers?.authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer authorization token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new Error("Missing bearer authorization token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error(error?.message || "Invalid Supabase auth token");
  }

  const authUserId = asText(data.user.id);
  if (authUserId !== expectedUserId) {
    throw new Error("Authenticated user does not match checkout userId");
  }

  return authUserId;
}

async function upsertSubscriptionByStripeId(supabase, payload) {
  const stripeSubId = asText(payload.stripe_sub_id);

  if (!stripeSubId) {
    const { error } = await supabase.from("subscriptions").insert(payload);
    if (error) throw error;
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_sub_id", stripeSubId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase
    .from("subscriptions")
    .insert(payload);

  if (insertError) throw insertError;
}

async function insertCreditPurchaseIfMissing(supabase, payload) {
  const stripePaymentId = asText(payload.stripe_payment_id);

  if (stripePaymentId) {
    const { data: existing, error: existingError } = await supabase
      .from("credit_purchases")
      .select("id")
      .eq("stripe_payment_id", stripePaymentId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) return;
  }

  const { error } = await supabase
    .from("credit_purchases")
    .insert(payload);

  if (error) throw error;
}

async function inferPriceConfig(stripe, session) {
  const metadataPriceId = asText(session?.metadata?.priceId);
  if (metadataPriceId) {
    const fromMetadata = resolveStripePriceConfig(metadataPriceId);
    if (fromMetadata) return fromMetadata;
  }

  const sessionId = asText(session?.id);
  if (!sessionId) return null;

  const expanded = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"],
  });

  const firstPriceId = asText(expanded?.line_items?.data?.[0]?.price?.id);
  if (!firstPriceId) return null;

  return resolveStripePriceConfig(firstPriceId);
}

async function persistCheckoutSession({ stripe, supabase, session, userId }) {
  const mode = asText(session?.mode).toLowerCase();
  const priceConfig = await inferPriceConfig(stripe, session);

  if (!priceConfig) {
    throw new Error("Unable to resolve Stripe price configuration for checkout session");
  }

  if (mode === "subscription") {
    const stripeSubId = asText(session?.subscription);
    if (!stripeSubId) {
      throw new Error("checkout.session.completed missing subscription id");
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);
    const payload = {
      user_id: userId,
      plan: asText(priceConfig?.plan, "basic"),
      price_monthly: Number(priceConfig?.priceMonthly || 0),
      stripe_sub_id: stripeSubId,
      status: mapStripeSubscriptionStatus(stripeSubscription?.status || "active"),
      started_at: toIsoFromUnix(stripeSubscription?.start_date) || new Date().toISOString(),
      next_billing: toIsoFromUnix(stripeSubscription?.current_period_end),
      canceled_at: toIsoFromUnix(stripeSubscription?.canceled_at),
    };

    await upsertSubscriptionByStripeId(supabase, payload);
    return {
      mode,
      status: payload.status,
    };
  }

  if (mode === "payment") {
    const credits = Number(priceConfig.credits || session?.metadata?.credits || 0);
    const payload = {
      user_id: userId,
      pack_tier: asText(priceConfig.packTier, "starter"),
      credits_purchased: credits,
      credits_remaining: credits,
      amount_paid: toMoneyFromCents(session?.amount_total, priceConfig.amountPaid),
      stripe_payment_id: asText(session?.payment_intent),
      purchased_at: toIsoFromUnix(session?.created) || new Date().toISOString(),
    };

    await insertCreditPurchaseIfMissing(supabase, payload);
    return {
      mode,
      status: "recorded",
    };
  }

  throw new Error("Unsupported checkout mode");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecret = asText(process.env.STRIPE_SECRET_KEY);
  if (!stripeSecret) {
    return res.status(500).json({ error: "Server is missing STRIPE_SECRET_KEY" });
  }

  const body = jsonBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const sessionId = asText(body.sessionId || body.session_id);
  const userId = asText(body.userId);

  if (!sessionId || !userId) {
    return res.status(400).json({ error: "sessionId and userId are required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let authUserId;
  try {
    authUserId = await verifyRequestIdentity(req, userId, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized checkout request" });
  }

  const stripe = new Stripe(stripeSecret);

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price"],
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Invalid Stripe checkout session" });
  }

  const sessionUserId = asText(session?.metadata?.userId || session?.client_reference_id);
  if (sessionUserId && sessionUserId !== authUserId) {
    return res.status(403).json({ error: "Checkout session does not belong to authenticated user" });
  }

  const checkoutState = asText(session?.status).toLowerCase();
  if (checkoutState && checkoutState !== "complete") {
    return res.status(409).json({ error: `Checkout session is not completed yet (${checkoutState})` });
  }

  try {
    const persisted = await persistCheckoutSession({
      stripe,
      supabase: supabaseAdmin,
      session,
      userId: sessionUserId || authUserId,
    });

    return res.status(200).json({
      ok: true,
      mode: persisted.mode,
      status: persisted.status,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to persist checkout session",
    });
  }
}
