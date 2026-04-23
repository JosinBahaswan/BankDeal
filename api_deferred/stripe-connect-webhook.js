import {
  asText,
  createStripeClient,
  createSupabaseAdminClient,
  normalizeCurrency,
  setCors,
} from "../lib/server/stripeConnectShared.js";
import { enforceRateLimit } from "../lib/server/httpSecurity.js";

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body), "utf8");
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function markEscrowFunded(supabaseAdmin, paymentIntent) {
  const paymentIntentId = asText(paymentIntent?.id);
  if (!paymentIntentId) return;

  const paymentMethodType = Array.isArray(paymentIntent?.payment_method_types)
    ? asText(paymentIntent.payment_method_types[0])
    : "";

  const { error } = await supabaseAdmin
    .from("escrow_transactions")
    .update({
      status: "funded",
      stripe_charge_id: asText(paymentIntent?.latest_charge),
      payment_method_type: paymentMethodType || null,
      paid_at: new Date().toISOString(),
      failed_at: null,
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .in("status", ["pending", "failed"]);

  if (error) {
    throw new Error(`Unable to mark escrow funded: ${error.message}`);
  }
}

async function markEscrowFailed(supabaseAdmin, paymentIntent) {
  const paymentIntentId = asText(paymentIntent?.id);
  if (!paymentIntentId) return;

  const { error } = await supabaseAdmin
    .from("escrow_transactions")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .in("status", ["pending", "funded"]);

  if (error) {
    throw new Error(`Unable to mark escrow failed: ${error.message}`);
  }
}

async function markEscrowRefunded(supabaseAdmin, charge) {
  const chargeId = asText(charge?.id);
  const paymentIntentId = asText(charge?.payment_intent);

  let query = supabaseAdmin
    .from("escrow_transactions")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      currency: normalizeCurrency(charge?.currency, "usd"),
    });

  if (chargeId) {
    query = query.eq("stripe_charge_id", chargeId);
  } else if (paymentIntentId) {
    query = query.eq("stripe_payment_intent_id", paymentIntentId);
  } else {
    return;
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Unable to mark escrow refunded: ${error.message}`);
  }
}

async function syncConnectAccountStatus(supabaseAdmin, account) {
  const stripeAccountId = asText(account?.id);
  if (!stripeAccountId) return;

  const { error } = await supabaseAdmin
    .from("connect_accounts")
    .update({
      charges_enabled: Boolean(account?.charges_enabled),
      payouts_enabled: Boolean(account?.payouts_enabled),
      details_submitted: Boolean(account?.details_submitted),
      onboarding_completed_at: account?.details_submitted ? new Date().toISOString() : null,
      metadata: {
        requirements_disabled_reason: asText(account?.requirements?.disabled_reason),
        currently_due_count: Array.isArray(account?.requirements?.currently_due) ? account.requirements.currently_due.length : 0,
      },
    })
    .eq("stripe_account_id", stripeAccountId);

  if (error) {
    throw new Error(`Unable to sync Connect account status: ${error.message}`);
  }
}

export default async function handler(req, res) {
  const cors = setCors(req, res, "POST");

  if (!cors.originAllowed) {
    return res.status(403).json({ error: "CORS origin is not allowed" });
  }

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "stripe-connect-webhook",
    max: Number(process.env.RATE_LIMIT_STRIPE_WEBHOOK_MAX || 600),
    windowMs: Number(process.env.RATE_LIMIT_STRIPE_WEBHOOK_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = asText(process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    return res.status(500).json({ error: "Server is missing STRIPE_CONNECT_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET)" });
  }

  let stripe;
  let supabaseAdmin;
  try {
    stripe = createStripeClient();
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Stripe Connect webhook dependencies" });
  }

  const signatureHeader = asText(req.headers?.["stripe-signature"]);
  if (!signatureHeader) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Invalid webhook signature" });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await markEscrowFunded(supabaseAdmin, event.data.object);
    }

    if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
      await markEscrowFailed(supabaseAdmin, event.data.object);
    }

    if (event.type === "charge.refunded") {
      await markEscrowRefunded(supabaseAdmin, event.data.object);
    }

    if (event.type === "account.updated") {
      await syncConnectAccountStatus(supabaseAdmin, event.data.object);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({
      received: false,
      error: error?.message || "Stripe Connect webhook processing failed",
    });
  }
}
