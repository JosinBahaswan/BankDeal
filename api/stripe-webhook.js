import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  asText,
  mapStripeSubscriptionStatus,
  resolveStripePriceConfig,
} from "./stripeCatalog";

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

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body), "utf8");

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
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

function subscriptionPayload({ userId, session, subscription, priceConfig }) {
  return {
    user_id: userId,
    plan: asText(priceConfig?.plan, "basic"),
    price_monthly: Number(priceConfig?.priceMonthly || 0),
    stripe_sub_id: asText(session.subscription),
    status: mapStripeSubscriptionStatus(subscription?.status || "active"),
    started_at: toIsoFromUnix(subscription?.start_date) || new Date().toISOString(),
    next_billing: toIsoFromUnix(subscription?.current_period_end),
    canceled_at: toIsoFromUnix(subscription?.canceled_at),
  };
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

async function handleCheckoutCompleted({ stripe, supabase, session }) {
  const metadata = session?.metadata || {};
  const userId = asText(metadata.userId || session?.client_reference_id);

  if (!userId) {
    throw new Error("checkout.session.completed missing userId metadata");
  }

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
    const payload = subscriptionPayload({
      userId,
      session,
      subscription: stripeSubscription,
      priceConfig,
    });

    await upsertSubscriptionByStripeId(supabase, payload);
    return;
  }

  if (mode === "payment") {
    const credits = Number(priceConfig.credits || metadata.credits || 0);
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
  }
}

async function handleSubscriptionUpdate({ supabase, subscription }) {
  const stripeSubId = asText(subscription?.id);
  if (!stripeSubId) return;

  const payload = {
    status: mapStripeSubscriptionStatus(subscription?.status || "past_due"),
    next_billing: toIsoFromUnix(subscription?.current_period_end),
    canceled_at: toIsoFromUnix(subscription?.canceled_at),
  };

  const { error } = await supabase
    .from("subscriptions")
    .update(payload)
    .eq("stripe_sub_id", stripeSubId);

  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecret = asText(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = asText(process.env.STRIPE_WEBHOOK_SECRET);

  if (!stripeSecret || !webhookSecret) {
    return res.status(500).json({ error: "Server is missing STRIPE_SECRET_KEY and/or STRIPE_WEBHOOK_SECRET" });
  }

  const signatureHeader = asText(req.headers?.["stripe-signature"]);
  if (!signatureHeader) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  const stripe = new Stripe(stripeSecret);

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Invalid webhook signature" });
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted({
        stripe,
        supabase,
        session: event.data.object,
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await handleSubscriptionUpdate({
        supabase,
        subscription: event.data.object,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({
      received: false,
      error: error?.message || "Webhook processing failed",
    });
  }
}
