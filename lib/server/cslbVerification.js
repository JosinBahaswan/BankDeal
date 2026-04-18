/* global process */

import { asText } from "./contractsShared.js";

const DEFAULT_PUBLIC_LOOKUP = "https://www2.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx";

function normalizeLicenseNumber(input) {
  const normalized = asText(String(input || "").toUpperCase().replace(/[^A-Z0-9-]/g, ""));
  return normalized;
}

function isValidLicenseFormat(licenseNumber) {
  return /^[A-Z0-9-]{4,20}$/.test(String(licenseNumber || ""));
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirstMatch(text, regexList) {
  for (const regex of regexList) {
    const match = text.match(regex);
    if (match?.[1]) {
      return asText(match[1]);
    }
  }

  return "";
}

function parseDateFromText(value) {
  const raw = asText(value);
  if (!raw) return "";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function parsePublicLookupHtml(html, licenseNumber) {
  const text = stripHtml(html);

  if (/no\s+license\s+record|license\s+not\s+found|does\s+not\s+exist|not\s+on\s+file/i.test(text)) {
    return {
      ok: true,
      valid: false,
      status: "Not Found",
      legalName: "",
      expiresOn: "",
      licenseNumber,
      source: "cslb_public_lookup",
      message: "License was not found in CSLB records.",
      payload: {
        parsedFrom: "public_lookup",
        textSnippet: text.slice(0, 600),
      },
    };
  }

  const status = pickFirstMatch(text, [
    /License\s+Status\s*[:-]?\s*([A-Za-z\s]{3,50})/i,
    /Status\s*[:-]\s*([A-Za-z\s]{3,50})/i,
  ]);

  const legalName = pickFirstMatch(text, [
    /Business\s+Name\s*[:-]?\s*([A-Za-z0-9&.,'()/\s-]{2,120})/i,
    /Legal\s+Name\s*[:-]?\s*([A-Za-z0-9&.,'()/\s-]{2,120})/i,
  ]);

  const expirationRaw = pickFirstMatch(text, [
    /Expiration\s+Date\s*[:-]?\s*([A-Za-z0-9,/\s-]{6,40})/i,
  ]);

  const expiresOn = parseDateFromText(expirationRaw);

  const normalizedStatus = asText(status, "Unknown");
  const valid = /active/i.test(normalizedStatus)
    && !/revoked|suspended|expired|inactive|cancelled|canceled/i.test(normalizedStatus);

  return {
    ok: true,
    valid,
    status: normalizedStatus,
    legalName,
    expiresOn,
    licenseNumber,
    source: "cslb_public_lookup",
    message: valid ? "License verified against CSLB public lookup." : "License was found but is not currently Active.",
    payload: {
      parsedFrom: "public_lookup",
      textSnippet: text.slice(0, 800),
    },
  };
}

function parseProviderResponse(payload, fallbackLicenseNumber) {
  const status = asText(payload?.status || payload?.licenseStatus || payload?.state);
  const validFromPayload = typeof payload?.valid === "boolean" ? payload.valid : null;
  const validFromStatus = /active/i.test(status)
    && !/revoked|suspended|expired|inactive|cancelled|canceled/i.test(status);
  const valid = validFromPayload !== null ? validFromPayload : validFromStatus;

  return {
    ok: true,
    valid,
    status: status || (valid ? "Active" : "Unknown"),
    legalName: asText(payload?.legalName || payload?.businessName || payload?.name),
    expiresOn: asText(payload?.expiresOn || payload?.expirationDate || ""),
    licenseNumber: normalizeLicenseNumber(payload?.licenseNumber || fallbackLicenseNumber),
    source: "provider",
    message: asText(payload?.message, valid ? "License verified by provider." : "Provider returned non-active license status."),
    payload,
  };
}

async function verifyViaProvider(licenseNumber) {
  const endpoint = asText(process.env.CSLB_PROVIDER_ENDPOINT);
  if (!endpoint) {
    throw new Error("CSLB_PROVIDER_ENDPOINT is not configured");
  }

  const apiKey = asText(process.env.CSLB_PROVIDER_API_KEY);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ licenseNumber }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = asText(payload?.error || payload?.message || `Provider request failed (${response.status})`);
    throw new Error(errorMessage);
  }

  return parseProviderResponse(payload, licenseNumber);
}

async function verifyViaPublicLookup(licenseNumber) {
  const baseUrl = asText(process.env.CSLB_PUBLIC_LOOKUP_URL, DEFAULT_PUBLIC_LOOKUP);
  const url = new URL(baseUrl);
  url.searchParams.set("LicNum", licenseNumber);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "DealBank-CSLB-Verification/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`CSLB public lookup request failed (${response.status})`);
  }

  const html = await response.text();
  return parsePublicLookupHtml(html, licenseNumber);
}

export async function verifyCslbLicenseNumber(inputLicenseNumber) {
  const licenseNumber = normalizeLicenseNumber(inputLicenseNumber);
  if (!isValidLicenseFormat(licenseNumber)) {
    return {
      ok: false,
      valid: false,
      status: "Invalid Format",
      legalName: "",
      expiresOn: "",
      licenseNumber,
      source: "input_validation",
      message: "License number format is invalid.",
      payload: {},
    };
  }

  const mode = asText(process.env.CSLB_VERIFICATION_MODE, "auto").toLowerCase();
  const tryProviderFirst = mode === "provider" || (mode === "auto" && asText(process.env.CSLB_PROVIDER_ENDPOINT));

  if (tryProviderFirst) {
    try {
      return await verifyViaProvider(licenseNumber);
    } catch (error) {
      if (mode === "provider") {
        return {
          ok: false,
          valid: false,
          status: "Provider Unavailable",
          legalName: "",
          expiresOn: "",
          licenseNumber,
          source: "provider",
          message: error?.message || "CSLB provider is unavailable.",
          payload: {},
        };
      }
    }
  }

  try {
    return await verifyViaPublicLookup(licenseNumber);
  } catch (error) {
    return {
      ok: false,
      valid: false,
      status: "Lookup Unavailable",
      legalName: "",
      expiresOn: "",
      licenseNumber,
      source: "cslb_public_lookup",
      message: error?.message || "Unable to verify CSLB license right now.",
      payload: {},
    };
  }
}

export function normalizeCslbLicense(inputLicenseNumber) {
  return normalizeLicenseNumber(inputLicenseNumber);
}

export function isCslbLicenseFormat(inputLicenseNumber) {
  return isValidLicenseFormat(normalizeLicenseNumber(inputLicenseNumber));
}
