import { supabase } from "../../lib/supabaseClient";

const CONNECT_ACCOUNT_ENDPOINT = String(import.meta.env.VITE_STRIPE_CONNECT_ACCOUNT_ENDPOINT || "/api/stripe-connect-account-link").trim();
const ESCROW_CREATE_ENDPOINT = String(import.meta.env.VITE_STRIPE_ESCROW_CREATE_ENDPOINT || "/api/stripe-escrow-create").trim();
const ESCROW_RELEASE_ENDPOINT = String(import.meta.env.VITE_STRIPE_ESCROW_RELEASE_ENDPOINT || "/api/stripe-escrow-release").trim();

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonSafe(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function bearerTokenHeader() {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function fetchAuthorizedJson(url, options = {}) {
  const authHeader = await bearerTokenHeader();

  const response = await fetch(url, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payloadText = await response.text();
  const payload = parseJsonSafe(payloadText) || {};

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload;
}

export async function beginConnectOnboarding(input = {}) {
  const returnPath = asText(input.returnPath) || "/?connect=return";
  const refreshPath = asText(input.refreshPath) || "/?connect=refresh";
  const country = asText(input.country) || "US";
  const accountType = asText(input.accountType) || "express";

  return fetchAuthorizedJson(CONNECT_ACCOUNT_ENDPOINT, {
    method: "POST",
    body: {
      returnPath,
      refreshPath,
      country,
      accountType,
    },
  });
}

export async function createEarnestMoneyEscrow(input) {
  const payload = {
    contractId: asText(input?.contractId) || undefined,
    beneficiaryUserId: asText(input?.beneficiaryUserId),
    amount: Number(input?.amount || 0),
    currency: asText(input?.currency) || "usd",
    platformFeeRate: Number(input?.platformFeeRate || 1.5),
    title: asText(input?.title) || "DealBank Earnest Money Escrow",
    memo: asText(input?.memo) || undefined,
    idempotencyKey: asText(input?.idempotencyKey) || undefined,
    metadata: input?.metadata && typeof input.metadata === "object" ? input.metadata : {},
  };

  if (!payload.beneficiaryUserId) {
    throw new Error("beneficiaryUserId is required");
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error("amount must be greater than zero");
  }

  return fetchAuthorizedJson(ESCROW_CREATE_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export async function releaseEscrowAtClose(input) {
  const escrowId = asText(input?.escrowId);
  if (!escrowId) {
    throw new Error("escrowId is required");
  }

  return fetchAuthorizedJson(ESCROW_RELEASE_ENDPOINT, {
    method: "POST",
    body: {
      escrowId,
      releaseNotes: asText(input?.releaseNotes) || undefined,
      closeReference: asText(input?.closeReference) || undefined,
      idempotencyKey: asText(input?.idempotencyKey) || undefined,
    },
  });
}
