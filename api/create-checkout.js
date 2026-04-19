import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { asEmail, asText, isSupportedCheckoutMode, resolveStripePriceConfig } from "../lib/server/stripeCatalog.js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

const APP_USER_TYPES = new Set(["dealmaker", "contractor", "realtor", "admin"]);

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

function firstForwardedValue(value) {
  const raw = asText(value);
  if (!raw) return "";
  return raw.split(",")[0].trim();
}

function normalizedForwardedProto(value) {
  const proto = firstForwardedValue(value).toLowerCase();
  if (proto === "http" || proto === "https") return proto;
  return "https";
}

function normalizedForwardedHost(value) {
  const host = firstForwardedValue(value);
  if (!host) return "";
  return host.replace(/^https?:\/\//i, "").trim();
}

function isValidHttpUrl(value) {
  const raw = asText(value);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function appBaseUrl(req) {
  const forwardedProto = normalizedForwardedProto(req.headers?.["x-forwarded-proto"]);
  const forwardedHost = normalizedForwardedHost(req.headers?.["x-forwarded-host"] || req.headers?.host);
  const forwardedBase = forwardedHost ? `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "") : "";

  const configured = asText(process.env.APP_URL).replace(/\/$/, "");
  if (configured && isValidHttpUrl(configured)) {
    let configuredHost = "";
    try {
      configuredHost = new URL(configured).hostname.toLowerCase();
    } catch {
      configuredHost = "";
    }

    const forwardedHostName = forwardedHost.split(":")[0].toLowerCase();
    const configuredIsLocal = ["localhost", "127.0.0.1", "::1"].includes(configuredHost);
    const forwardedIsLocal = ["localhost", "127.0.0.1", "::1"].includes(forwardedHostName);

    // Prevent production redirects to localhost when APP_URL is left in local-dev mode.
    if (configuredIsLocal && forwardedHost && !forwardedIsLocal) {
      return forwardedBase || configured;
    }

    return configured;
  }

  const vercelHost = asText(process.env.VERCEL_URL);
  if (vercelHost && isValidHttpUrl(`https://${vercelHost}`)) {
    return `https://${vercelHost}`.replace(/\/$/, "");
  }

  if (forwardedBase && isValidHttpUrl(forwardedBase)) {
    return forwardedBase;
  }

  return "http://localhost:5173";
}

function safePath(pathLike) {
  const path = asText(pathLike);
  if (!path) return "/";
  if (!path.startsWith("/")) return "/";
  if (path.includes("//")) return "/";
  return path;
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

function normalizeUserType(value) {
  const normalized = asText(value).toLowerCase();
  return APP_USER_TYPES.has(normalized) ? normalized : "";
}

async function verifyCheckoutIdentity(req, expectedUserId, expectedEmail, supabaseAdmin) {
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
  const authEmail = asText(data.user.email).toLowerCase();
  if (authUserId !== expectedUserId) {
    throw new Error("Authenticated user does not match checkout userId");
  }

  if (expectedEmail && authEmail && authEmail !== expectedEmail.toLowerCase()) {
    throw new Error("Authenticated user email does not match checkout email");
  }

  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, type")
    .eq("id", authUserId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user profile: ${appUserError.message}`);
  }

  const userType = normalizeUserType(appUser?.type || data.user?.user_metadata?.type);
  if (!userType) {
    throw new Error("Unable to resolve application user role for checkout");
  }

  return {
    userId: authUserId,
    email: authEmail,
    userType,
  };
}

function enforceCheckoutRules({ userType, mode, priceConfig, source }) {
  const normalizedSource = asText(source, "web").toLowerCase();
  const plan = asText(priceConfig?.plan).toLowerCase();
  const packTier = asText(priceConfig?.packTier).toLowerCase();

  if (mode === "subscription") {
    if (userType === "contractor" && !["basic", "pro"].includes(plan)) {
      throw new Error("Contractor checkout can only use contractor subscription plans");
    }

    if (userType === "dealmaker" && plan !== "dealmaker") {
      throw new Error("Deal maker checkout can only use dealmaker subscription plan");
    }

    if (userType === "realtor" && plan !== "realtor") {
      throw new Error("Realtor checkout can only use realtor subscription plan");
    }

    if (!["contractor", "dealmaker", "realtor"].includes(userType)) {
      throw new Error("This user type is not allowed to start subscription checkout");
    }
  }

  if (mode === "payment") {
    if (userType !== "dealmaker") {
      throw new Error("Only deal makers are allowed to purchase credit packs");
    }

    if (!["starter", "growth", "pro"].includes(packTier)) {
      throw new Error("Invalid credit pack tier for payment checkout");
    }
  }

  if (normalizedSource === "contractor_onboarding" && !(userType === "contractor" && mode === "subscription")) {
    throw new Error("Invalid checkout context for contractor onboarding");
  }

  if (normalizedSource === "realtor_onboarding" && !(userType === "realtor" && mode === "subscription")) {
    throw new Error("Invalid checkout context for realtor onboarding");
  }

  if (normalizedSource === "leads_tool" && !(userType === "dealmaker" && mode === "payment")) {
    throw new Error("Invalid checkout context for leads tool");
  }
}

function checkoutMetadata(payload) {
  const metadata = {
    userId: asText(payload.userId),
    priceId: asText(payload.priceId),
    mode: asText(payload.mode),
    plan: asText(payload.plan),
    packTier: asText(payload.packTier),
    credits: asText(payload.credits),
    amountPaid: asText(payload.amountPaid),
    source: asText(payload.source, "web"),
  };

  return metadata;
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "create-checkout",
    max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX || 40),
    windowMs: Number(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

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

  const userId = asText(body.userId);
  const email = asEmail(body.email);
  const mode = asText(body.mode).toLowerCase();
  const requestedPriceId = asText(body.priceId);
  const checkoutSource = asText(body.context?.source || body.source, "web");

  if (!userId || !email || !requestedPriceId) {
    return res.status(400).json({ error: "userId, email, and priceId are required" });
  }

  if (!isSupportedCheckoutMode(mode)) {
    return res.status(400).json({ error: "mode must be subscription or payment" });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  let checkoutIdentity;
  try {
    checkoutIdentity = await verifyCheckoutIdentity(req, userId, email, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized checkout request" });
  }

  const priceConfig = resolveStripePriceConfig(requestedPriceId);
  if (!priceConfig) {
    return res.status(400).json({ error: "Unsupported priceId" });
  }

  if (priceConfig.mode !== mode) {
    return res.status(400).json({ error: `priceId ${requestedPriceId} cannot be used with mode ${mode}` });
  }

  try {
    enforceCheckoutRules({
      userType: checkoutIdentity.userType,
      mode,
      priceConfig,
      source: checkoutSource,
    });
  } catch (error) {
    return res.status(403).json({ error: error?.message || "Checkout request is not allowed" });
  }

  const stripe = new Stripe(stripeSecret);
  const rootUrl = appBaseUrl(req);
  const checkoutKind = priceConfig.mode === "subscription" ? "subscription" : "credits";
  const successPath = safePath(body.context?.successPath);
  const successUrl = `${rootUrl}${successPath}`;

  if (!isValidHttpUrl(successUrl)) {
    return res.status(400).json({
      error: "Checkout callback URL is invalid. Verify APP_URL/x-forwarded headers.",
    });
  }

  const metadata = checkoutMetadata({
    userId,
    priceId: priceConfig.priceId,
    mode,
    plan: priceConfig.plan,
    packTier: priceConfig.packTier,
    credits: String(priceConfig.credits || ""),
    amountPaid: String(priceConfig.amountPaid || ""),
    source: checkoutSource,
  });

  const sessionPayload = {
    payment_method_types: ["card"],
    mode,
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: `${successUrl}?checkout=success&kind=${checkoutKind}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${successUrl}?checkout=cancel&kind=${checkoutKind}`,
    metadata,
    allow_promotion_codes: true,
  };

  if (mode === "subscription") {
    sessionPayload.subscription_data = { metadata };
  }

  if (mode === "payment") {
    sessionPayload.payment_intent_data = { metadata };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionPayload);
    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    const status = Number(error?.statusCode) || 502;
    return res.status(status).json({
      error: error?.message || "Failed to create Stripe checkout session",
    });
  }
}
