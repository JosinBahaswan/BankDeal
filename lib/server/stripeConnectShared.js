/* global process */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

export function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number(fallback) || 0;
}

export function jsonBody(req) {
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

export function setCors(res, methods = "POST, OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function safePath(pathLike, fallback = "/") {
  const path = asText(pathLike);
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.includes("//")) return fallback;
  return path;
}

export function normalizeCurrency(value, fallback = "usd") {
  const normalized = asText(value, fallback).toLowerCase();
  return normalized || "usd";
}

export function toMinorUnits(amountMajor) {
  const amount = asNumber(amountMajor, 0);
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return Math.round(amount * 100);
}

export function toMajorUnits(amountMinor) {
  const cents = asNumber(amountMinor, 0);
  return Number((cents / 100).toFixed(2));
}

export function roundMoney(value) {
  return Number(asNumber(value, 0).toFixed(2));
}

export function buildTransferGroup(prefix = "escrow") {
  return `${asText(prefix, "escrow")}_${randomUUID()}`;
}

export function appBaseUrl(req) {
  const forwardedProto = asText(req.headers?.["x-forwarded-proto"], "https");
  const forwardedHost = asText(req.headers?.["x-forwarded-host"] || req.headers?.host);
  const forwardedBase = forwardedHost ? `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "") : "";

  const configured = asText(process.env.APP_URL).replace(/\/$/, "");
  if (configured) {
    let configuredHost = "";
    try {
      configuredHost = new URL(configured).hostname.toLowerCase();
    } catch {
      configuredHost = "";
    }

    const forwardedHostName = forwardedHost.split(":")[0].toLowerCase();
    const configuredIsLocal = ["localhost", "127.0.0.1", "::1"].includes(configuredHost);
    const forwardedIsLocal = ["localhost", "127.0.0.1", "::1"].includes(forwardedHostName);

    if (configuredIsLocal && forwardedHost && !forwardedIsLocal) {
      return forwardedBase || configured;
    }

    return configured;
  }

  const vercelHost = asText(process.env.VERCEL_URL);
  if (vercelHost) return `https://${vercelHost}`.replace(/\/$/, "");

  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");

  return "http://localhost:5173";
}

export function createSupabaseAdminClient() {
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

export function createStripeClient() {
  const stripeSecret = asText(process.env.STRIPE_SECRET_KEY);
  if (!stripeSecret) {
    throw new Error("Server is missing STRIPE_SECRET_KEY");
  }

  return new Stripe(stripeSecret);
}

export async function verifyStripeActor(req, supabaseAdmin, options = {}) {
  const allowedTypes = Array.isArray(options.allowedTypes)
    ? options.allowedTypes.map((entry) => asText(entry).toLowerCase()).filter(Boolean)
    : [];

  const authHeader = asText(req.headers?.authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer authorization token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("Missing bearer authorization token");

  const { data: authResult, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authResult?.user) {
    throw new Error(authError?.message || "Invalid Supabase auth token");
  }

  const authUser = authResult.user;
  const authUserId = asText(authUser.id);
  const authEmail = asText(authUser.email).toLowerCase();

  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, name, email, type")
    .eq("id", authUserId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user profile: ${appUserError.message}`);
  }

  const userType = asText(appUser?.type || authUser?.user_metadata?.type).toLowerCase();
  if (!userType) {
    throw new Error("Unable to resolve user role");
  }

  const isAdmin = userType === "admin";
  if (!isAdmin && allowedTypes.length > 0 && !allowedTypes.includes(userType)) {
    throw new Error("Authenticated user role is not allowed for this action");
  }

  return {
    userId: authUserId,
    email: asText(appUser?.email || authEmail).toLowerCase(),
    name: asText(appUser?.name),
    userType,
    isAdmin,
  };
}

export async function getOrCreateConnectAccount(input) {
  const { supabase, stripe, userId, email, country = "US", accountType = "express" } = input;

  const normalizedUserId = asText(userId);
  if (!normalizedUserId) {
    throw new Error("userId is required for Stripe Connect account creation");
  }

  const { data: existing, error: existingError } = await supabase
    .from("connect_accounts")
    .select("id, stripe_account_id")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to resolve existing Connect account: ${existingError.message}`);
  }

  if (existing?.stripe_account_id) {
    return asText(existing.stripe_account_id);
  }

  const created = await stripe.accounts.create({
    type: asText(accountType, "express"),
    country: asText(country, "US").toUpperCase(),
    email: asText(email),
    metadata: {
      user_id: normalizedUserId,
    },
  });

  const connectRecord = {
    user_id: normalizedUserId,
    stripe_account_id: created.id,
    account_type: asText(accountType, "express"),
    charges_enabled: Boolean(created.charges_enabled),
    payouts_enabled: Boolean(created.payouts_enabled),
    details_submitted: Boolean(created.details_submitted),
    onboarding_completed_at: created.details_submitted ? new Date().toISOString() : null,
    metadata: {
      account_created_at: new Date().toISOString(),
    },
  };

  const { error: insertError } = await supabase
    .from("connect_accounts")
    .insert(connectRecord);

  if (!insertError) {
    return created.id;
  }

  // Handle race condition where another request inserted the row first.
  const { data: raceWinner, error: raceError } = await supabase
    .from("connect_accounts")
    .select("stripe_account_id")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (raceError || !raceWinner?.stripe_account_id) {
    throw new Error(`Unable to store Connect account: ${insertError.message}`);
  }

  return asText(raceWinner.stripe_account_id);
}

export async function syncConnectAccount(input) {
  const { supabase, stripe, stripeAccountId } = input;
  const normalizedId = asText(stripeAccountId);
  if (!normalizedId) {
    throw new Error("stripeAccountId is required");
  }

  const account = await stripe.accounts.retrieve(normalizedId);

  const { error } = await supabase
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
    .eq("stripe_account_id", normalizedId);

  if (error) {
    throw new Error(`Unable to sync Connect account state: ${error.message}`);
  }

  return {
    account,
    status: {
      chargesEnabled: Boolean(account?.charges_enabled),
      payoutsEnabled: Boolean(account?.payouts_enabled),
      detailsSubmitted: Boolean(account?.details_submitted),
    },
  };
}
