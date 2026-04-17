import { supabase } from "../../lib/supabaseClient";

const CHECKOUT_ENDPOINT = String(import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT || "/api/create-checkout").trim();
const CONFIRM_ENDPOINT = String(import.meta.env.VITE_STRIPE_CONFIRM_ENDPOINT || "/api/confirm-checkout").trim();

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

function envPriceId(envKey) {
  return asText(import.meta.env[envKey]);
}

export function getContractorSubscriptionPriceId(plan) {
  const normalizedPlan = asText(plan).toLowerCase();
  if (normalizedPlan === "pro") {
    return envPriceId("VITE_STRIPE_PRICE_CONTRACTOR_PRO_MONTHLY");
  }

  return envPriceId("VITE_STRIPE_PRICE_CONTRACTOR_BASIC_MONTHLY");
}

export function getCreditPackPriceId(packName) {
  const normalized = asText(packName).toLowerCase();

  if (normalized === "starter") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_STARTER");
  }

  if (normalized === "growth") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_GROWTH");
  }

  if (normalized === "pro") {
    return envPriceId("VITE_STRIPE_PRICE_CREDITS_PRO");
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

  if (payload?.url && typeof window !== "undefined") {
    window.location.assign(payload.url);
    return;
  }

  throw new Error("Checkout session did not return Stripe checkout URL");
}

export async function confirmCheckoutSession({ sessionId, userId }) {
  const normalizedSessionId = asText(sessionId);
  const normalizedUserId = asText(userId);

  if (!normalizedSessionId || !normalizedUserId) {
    throw new Error("Missing checkout confirmation payload values");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again before checkout confirmation.");
  }

  const response = await fetch(CONFIRM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sessionId: normalizedSessionId,
      userId: normalizedUserId,
    }),
  });

  const payloadText = await response.text();
  const payload = parseJsonSafe(payloadText) || {};

  if (!response.ok) {
    throw new Error(payload?.error || `Checkout confirmation failed (${response.status})`);
  }

  return payload;
}
