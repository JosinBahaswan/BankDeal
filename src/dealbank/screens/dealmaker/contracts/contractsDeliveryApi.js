import { supabase } from "../../../../lib/supabaseClient";

const SIGNATURE_ATTESTATION_ENDPOINT = String(import.meta.env.VITE_CONTRACT_SIGNATURE_ATTESTATION_ENDPOINT || "/api/contracts-signature-attestation").trim();
const CONTRACT_PDF_ENDPOINT = String(import.meta.env.VITE_CONTRACTS_PDF_ENDPOINT || "/api/contracts-generate-pdf").trim();
const EXECUTED_CONTRACT_WEBHOOK_URL = String(import.meta.env.VITE_EXECUTED_CONTRACT_WEBHOOK_URL || "/api/notify-contract").trim();

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

async function bearerAuthHeader() {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function authorizedJsonFetch(url, options = {}) {
  const authHeader = await bearerAuthHeader();
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

async function authorizedBlobFetch(url) {
  const authHeader = await bearerAuthHeader();
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeader,
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }

    const payload = parseJsonSafe(details);
    throw new Error(payload?.error || details || `Request failed (${response.status})`);
  }

  return response.blob();
}

export function getContractsPdfEndpoint() {
  return CONTRACT_PDF_ENDPOINT;
}

export async function createSignatureAttestation(input) {
  return authorizedJsonFetch(SIGNATURE_ATTESTATION_ENDPOINT, {
    method: "POST",
    body: input,
  });
}

export async function generateAndPersistContractPdf(contractId) {
  const normalizedContractId = asText(contractId);
  if (!normalizedContractId) {
    throw new Error("contractId is required");
  }

  return authorizedJsonFetch(CONTRACT_PDF_ENDPOINT, {
    method: "POST",
    body: {
      contractId: normalizedContractId,
      persist: true,
      download: false,
    },
  });
}

export async function downloadContractPdfBlob(contractId) {
  const normalizedContractId = asText(contractId);
  if (!normalizedContractId) {
    throw new Error("contractId is required");
  }

  const url = `${CONTRACT_PDF_ENDPOINT}?contractId=${encodeURIComponent(normalizedContractId)}`;
  return authorizedBlobFetch(url);
}

export async function triggerExecutedContractDelivery(payload) {
  if (!EXECUTED_CONTRACT_WEBHOOK_URL) {
    return { delivered: false, reason: "delivery_webhook_not_configured" };
  }

  return authorizedJsonFetch(EXECUTED_CONTRACT_WEBHOOK_URL, {
    method: "POST",
    body: payload,
  });
}
