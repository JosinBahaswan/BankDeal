import { createHash } from "crypto";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import { asText, createSupabaseAdminClient } from "../lib/server/contractsShared.js";
import {
  loadContractBundle,
  persistGeneratedPdf,
  renderBundlePdfBuffer,
  resolveStorageSignedUrl,
} from "../lib/server/contractsDocumentService.js";

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function portalHtml({ titleCompanyEmail, contract, pdfUrl, parties }) {
  const title = asText(contract?.title, "DealBank Contract");
  const status = asText(contract?.status, "-").replace(/_/g, " ");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<meta charset=\"utf-8\" />",
    `<title>${htmlEscape(title)} · Title Portal</title>`,
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "<style>",
    "body { font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; margin: 0; color: #111827; }",
    ".wrap { max-width: 900px; margin: 24px auto; padding: 0 16px; }",
    ".card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 12px; }",
    "h1 { margin: 0 0 4px; font-size: 22px; }",
    "h2 { margin: 0 0 10px; font-size: 16px; }",
    ".muted { color: #6b7280; font-size: 13px; }",
    ".pill { display: inline-block; font-size: 12px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 4px 10px; margin-top: 8px; }",
    "table { width: 100%; border-collapse: collapse; }",
    "th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; text-align: left; }",
    "th { background: #f9fafb; font-weight: 600; }",
    ".btn { display: inline-block; margin-top: 10px; text-decoration: none; background: #111827; color: #fff; border-radius: 7px; padding: 10px 14px; font-weight: 600; }",
    "</style>",
    "</head>",
    "<body>",
    "<div class=\"wrap\">",
    "<div class=\"card\">",
    "<h1>DealBank Title Portal</h1>",
    `<div class="muted">Authorized email: ${htmlEscape(titleCompanyEmail || "-")}</div>`,
    `<div class="pill">Contract Status: ${htmlEscape(status)}</div>`,
    "</div>",
    "<div class=\"card\">",
    `<h2>${htmlEscape(title)}</h2>`,
    `<div class="muted">Contract ID: ${htmlEscape(asText(contract?.id))}</div>`,
    `<div class="muted">Created: ${htmlEscape(formatDate(contract?.created_at))}</div>`,
    `<div class="muted">Executed: ${htmlEscape(formatDate(contract?.executed_at))}</div>`,
    pdfUrl ? `<a class="btn" href="${htmlEscape(pdfUrl)}" target="_blank" rel="noreferrer">Download Executed PDF</a>` : "<div class=\"muted\" style=\"margin-top:8px\">PDF is not available yet.</div>",
    "</div>",
    "<div class=\"card\">",
    "<h2>Execution Tracker</h2>",
    "<table>",
    "<tr><th>Role</th><th>Signer</th><th>Email</th></tr>",
    ...(Array.isArray(parties) && parties.length > 0
      ? parties.map((party) => `<tr><td>${htmlEscape(asText(party.role))}</td><td>${htmlEscape(asText(party.name, "Pending"))}</td><td>${htmlEscape(asText(party.email, "-"))}</td></tr>`)
      : ["<tr><td colspan=\"3\" class=\"muted\">No party records found.</td></tr>"]),
    "</table>",
    "</div>",
    "</div>",
    "</body>",
    "</html>",
  ].join("");
}

function portalErrorHtml(message) {
  return [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\" /><title>Title Portal</title></head>",
    "<body style=\"font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px\">",
    "<div style=\"max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px\">",
    "<h2 style=\"margin:0 0 8px\">Title Portal Access Error</h2>",
    `<div style="color:#374151">${htmlEscape(message)}</div>`,
    "</div></body></html>",
  ].join("");
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, OPTIONS",
    headers: "Content-Type",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "title-portal",
    max: Number(process.env.RATE_LIMIT_TITLE_PORTAL_MAX || 120),
    windowMs: Number(process.env.RATE_LIMIT_TITLE_PORTAL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).send(portalErrorHtml("Too many requests. Please retry later."));
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).send(portalErrorHtml("Method not allowed"));
  }

  const rawToken = asText(req.query?.token);
  if (!rawToken) {
    return res.status(400).send(portalErrorHtml("Missing portal token"));
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).send(portalErrorHtml(error?.message || "Unable to initialize title portal service"));
  }

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("contract_title_portal_tokens")
    .select("id, contract_id, title_company_email, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    return res.status(500).send(portalErrorHtml(`Failed to validate portal token: ${tokenError.message}`));
  }

  if (!tokenRow?.id) {
    return res.status(401).send(portalErrorHtml("Portal token is invalid"));
  }

  const expiresAt = new Date(tokenRow.expires_at || 0).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return res.status(410).send(portalErrorHtml("Portal token has expired"));
  }

  let bundle;
  try {
    bundle = await loadContractBundle(supabaseAdmin, asText(tokenRow.contract_id));
  } catch (error) {
    return res.status(500).send(portalErrorHtml(error?.message || "Failed to load contract"));
  }

  let pdfUrl = "";
  const existingPdfPath = asText(bundle.contract.pdf_url);

  if (existingPdfPath) {
    pdfUrl = await resolveStorageSignedUrl(supabaseAdmin, existingPdfPath, 60 * 60 * 2);
  }

  if (!pdfUrl) {
    try {
      const pdfBuffer = await renderBundlePdfBuffer(bundle);
      const persisted = await persistGeneratedPdf(supabaseAdmin, asText(bundle.contract.id), pdfBuffer);
      pdfUrl = asText(persisted.signedUrl);
    } catch (error) {
      return res.status(500).send(portalErrorHtml(error?.message || "Failed to generate contract PDF"));
    }
  }

  await supabaseAdmin
    .from("contract_title_portal_tokens")
    .update({
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", tokenRow.id);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(portalHtml({
    titleCompanyEmail: asText(tokenRow.title_company_email),
    contract: bundle.contract,
    pdfUrl,
    parties: bundle.parties,
  }));
}
