/* global process */

import { asText, asEmail } from "./contractsShared.js";

export function verifySendgridSetup() {
  const apiKey = asText(process.env.SENDGRID_API_KEY || "");
  if (!apiKey) throw new Error("Server is missing SENDGRID_API_KEY");

  const fromEmail = asEmail(process.env.SENDGRID_FROM_EMAIL || "", "");
  if (!fromEmail) throw new Error("Server is missing SENDGRID_FROM_EMAIL or it is invalid");

  const fromDomain = (fromEmail.split("@")[1] || "").toLowerCase();

  const verifiedCsv = asText(process.env.SENDGRID_VERIFIED_DOMAINS || "");

  // In production require the fromEmail domain be explicitly listed in SENDGRID_VERIFIED_DOMAINS
  if (process.env.NODE_ENV === "production") {
    if (!verifiedCsv) {
      throw new Error("SENDGRID_VERIFIED_DOMAINS is not configured in production environment");
    }

    const allowed = verifiedCsv.split(",").map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(fromDomain)) {
      throw new Error(`SENDGRID_FROM_EMAIL domain '${fromDomain}' is not listed in SENDGRID_VERIFIED_DOMAINS`);
    }
  }

  return {
    apiKey,
    fromEmail,
    fromDomain,
    verifiedDomains: verifiedCsv ? verifiedCsv.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };
}
