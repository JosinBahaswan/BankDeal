import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../../lib/supabaseClient";

const CHECKOUT_ENDPOINT = String(import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT || "/api/create-checkout").trim();
const PUBLISHABLE_KEY = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

let stripePromise;

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toPath(pathLike) {
  const path = asText(pathLike);
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function parseJsonSafe(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stripeClientPromise() {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY);
  }
  return stripePromise;
}

function envPriceId(envKey, fallback) {
  const mapped = asText(import.meta.env[envKey]);
  return mapped || fallback;
}

export function getContractorSubscriptionPriceId(plan) {
  const normalizedPlan = asText(plan).toLowerCase();
  if (normalizedPlan === "pro") {
    return envPriceId("VITE_STRIPE_PRICE_CONTRACTOR_PRO_MONTHLY", "price_contractor_pro_monthly");
  }

  return envPriceId("VITE_STRIPE_PRICE_CONTRACTOR_BASIC_MONTHLY", "price_contractor_basic_monthly");
}

export function getCreditPackPriceId(packName) {
  const normalized = asText(packName).toLowerCase();

  if (normalized === "starter") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_STARTER", "price_credits_starter");
  }

  if (normalized === "growth") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_GROWTH", "price_credits_growth");
  }

  if (normalized === "pro") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_PRO", "price_credits_pro");
  }

  return "";
}

export async function beginCheckout({ priceId, userId, email, mode, source = "web", successPath = "/" }) {
  const normalizedPriceId = asText(priceId);
  const normalizedUserId = asText(userId);
  const normalizedEmail = asText(email).toLowerCase();
  const normalizedMode = asText(mode).toLowerCase();

  if (!normalizedPriceId || !normalizedUserId || !normalizedEmail || !normalizedMode) {
    throw new Error("Missing checkout payload values");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again before checkout.");
  }

  const response = await fetch(CHECKOUT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      priceId: normalizedPriceId,
      userId: normalizedUserId,
      email: normalizedEmail,
      mode: normalizedMode,
      context: {
        source,
        successPath: toPath(successPath),
      },
    }),
  });

  const payloadText = await response.text();
  const payload = parseJsonSafe(payloadText) || {};

  if (!response.ok) {
    throw new Error(payload?.error || `Checkout request failed (${response.status})`);
  }

  const stripe = await stripeClientPromise();
  if (stripe && payload?.id) {
    const { error } = await stripe.redirectToCheckout({ sessionId: payload.id });
    if (error) throw new Error(error.message || "Stripe redirect failed");
    return;
  }

  if (payload?.url && typeof window !== "undefined") {
    window.location.assign(payload.url);
    return;
  }

  throw new Error("Checkout session did not return redirect information");
}
