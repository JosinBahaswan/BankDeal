/* global process */

import { existsSync } from "fs";
import { Buffer } from "buffer";
import { asText } from "./contractsShared.js";

const WINDOWS_CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const LINUX_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/opt/google/chrome/chrome",
];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function titleCaseWords(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

function formRows(formValues) {
  const rows = Object.entries(formValues || {})
    .map(([key, value]) => ({ key, value: asText(String(value || "")) }))
    .filter((entry) => entry.value);

  if (rows.length === 0) {
    return `<tr><td colspan="2" class="muted">No form values were saved for this contract.</td></tr>`;
  }

  return rows
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => `<tr><th>${escapeHtml(titleCaseWords(entry.key))}</th><td>${escapeHtml(entry.value)}</td></tr>`)
    .join("");
}

function partyRows(parties, signaturesByRole) {
  if (!Array.isArray(parties) || parties.length === 0) {
    return `<tr><td colspan="4" class="muted">No party records found.</td></tr>`;
  }

  return parties
    .map((party) => {
      const role = asText(party.role, "Signer");
      const signature = signaturesByRole.get(role.toLowerCase()) || null;
      const signedAt = signature?.signed_at ? formatTimestamp(signature.signed_at) : "Pending";
      const signerName = asText(signature?.signer_name || party.name || "Pending");
      const signerEmail = asText(signature?.signer_email || party.email || "");
      const method = asText(signature?.sig_method || "-");

      return [
        "<tr>",
        `<th>${escapeHtml(role)}</th>`,
        `<td>${escapeHtml(signerName)}</td>`,
        `<td>${escapeHtml(signerEmail || "-")}</td>`,
        `<td>${escapeHtml(method)}${signature ? ` · ${escapeHtml(signedAt)}` : ""}</td>`,
        "</tr>",
      ].join("");
    })
    .join("");
}

function signatureCards(signatures, signatureImageUrls) {
  if (!Array.isArray(signatures) || signatures.length === 0) {
    return `<div class="muted">No signature events recorded yet.</div>`;
  }

  return signatures
    .map((signature) => {
      const role = asText(signature.party_role, "Signer");
      const signer = asText(signature.signer_name, "-");
      const signerIp = asText(signature.signer_ip, "-");
      const signedAt = formatTimestamp(signature.signed_at);
      const docHash = asText(signature.doc_hash, "-");
      const signatureAlgorithm = asText(signature.signature_algorithm, "-");
      const certFingerprint = asText(signature.signing_cert_fingerprint, "-");
      const imageUrl = signatureImageUrls.get(asText(signature.id));

      return [
        `<section class="signature-card">`,
        `<h4>${escapeHtml(role)}</h4>`,
        `<div><strong>Signer:</strong> ${escapeHtml(signer)}</div>`,
        `<div><strong>Signed At:</strong> ${escapeHtml(signedAt)}</div>`,
        `<div><strong>Signer IP:</strong> ${escapeHtml(signerIp || "-")}</div>`,
        `<div><strong>Method:</strong> ${escapeHtml(asText(signature.sig_method, "-"))}</div>`,
        `<div class="hash"><strong>Document Hash:</strong> ${escapeHtml(docHash)}</div>`,
        `<div class="hash"><strong>Attestation:</strong> ${escapeHtml(signatureAlgorithm)} · Cert ${escapeHtml(certFingerprint)}</div>`,
        imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="Signature for ${escapeHtml(role)}" class="sig-image" />`
          : "",
        `</section>`,
      ].join("");
    })
    .join("");
}

export function buildContractHtml(bundle) {
  const contract = bundle?.contract || {};
  const parties = Array.isArray(bundle?.parties) ? bundle.parties : [];
  const signatures = Array.isArray(bundle?.signatures) ? bundle.signatures : [];
  const formValues = bundle?.formValues || {};
  const templateName = asText(bundle?.templateName || contract?.template, "Contract");
  const title = asText(contract?.title, `DealBank ${titleCaseWords(templateName)}`);
  const signaturesByRole = new Map(signatures.map((row) => [asText(row.party_role || "").toLowerCase(), row]));
  const signatureImageUrls = bundle?.signatureImageUrls instanceof Map
    ? bundle.signatureImageUrls
    : new Map();

  const status = titleCaseWords(contract?.status || "draft");
  const createdAt = formatTimestamp(contract?.created_at);
  const executedAt = formatTimestamp(contract?.executed_at);
  const renderedAt = formatTimestamp(bundle?.renderedAt || new Date().toISOString());
  const docHash = asText(bundle?.docHash || signatures?.[0]?.doc_hash || "pending");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<meta charset=\"utf-8\" />",
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    "body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.5; }",
    "h1, h2, h3, h4 { margin: 0; }",
    "h1 { font-size: 20px; margin-bottom: 4px; }",
    "h2 { font-size: 14px; margin-bottom: 8px; color: #0f172a; }",
    "h3 { font-size: 13px; margin-bottom: 8px; color: #0f172a; }",
    ".muted { color: #6b7280; }",
    ".meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0 16px; }",
    ".meta-row { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }",
    ".block { margin-bottom: 18px; }",
    "table { width: 100%; border-collapse: collapse; }",
    "th, td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; text-align: left; }",
    "th { width: 28%; background: #f8fafc; font-weight: 600; }",
    ".signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }",
    ".signature-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; page-break-inside: avoid; }",
    ".signature-card h4 { margin-bottom: 6px; font-size: 12px; }",
    ".hash { word-break: break-word; }",
    ".sig-image { display: block; max-width: 240px; max-height: 72px; margin-top: 8px; border: 1px solid #d1d5db; border-radius: 4px; }",
    ".footer { margin-top: 18px; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; }",
    "</style>",
    "</head>",
    "<body>",
    `<h1>${escapeHtml(title)}</h1>`,
    `<div class="muted">DealBank ${escapeHtml(titleCaseWords(templateName))} · Server Generated PDF</div>`,
    "<section class=\"meta-grid\">",
    `<div class="meta-row"><strong>Status:</strong> ${escapeHtml(status)}</div>`,
    `<div class="meta-row"><strong>Contract ID:</strong> ${escapeHtml(asText(contract?.id))}</div>`,
    `<div class="meta-row"><strong>Created At:</strong> ${escapeHtml(createdAt)}</div>`,
    `<div class="meta-row"><strong>Executed At:</strong> ${escapeHtml(executedAt)}</div>`,
    `<div class="meta-row"><strong>Rendered At:</strong> ${escapeHtml(renderedAt)}</div>`,
    `<div class="meta-row hash"><strong>Document Hash:</strong> ${escapeHtml(docHash)}</div>`,
    "</section>",
    "<section class=\"block\">",
    "<h2>Form Values</h2>",
    `<table>${formRows(formValues)}</table>`,
    "</section>",
    "<section class=\"block\">",
    "<h2>Parties</h2>",
    `<table><tr><th>Role</th><th>Signer</th><th>Email</th><th>Status</th></tr>${partyRows(parties, signaturesByRole)}</table>`,
    "</section>",
    "<section class=\"block\">",
    "<h2>Signature Audit Trail</h2>",
    `<div class="signature-grid">${signatureCards(signatures, signatureImageUrls)}</div>`,
    "</section>",
    "<section class=\"footer\">",
    "This contract PDF was generated on the server by DealBank to preserve chain-of-custody and auditability.",
    "</section>",
    "</body>",
    "</html>",
  ].join("");
}

async function resolveExecutablePath(chromium) {
  const envPath = asText(process.env.PUPPETEER_EXECUTABLE_PATH);
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const platform = process.platform;
  const candidates = platform === "win32" ? WINDOWS_CHROME_CANDIDATES : LINUX_CHROME_CANDIDATES;
  const discovered = candidates.find((candidate) => existsSync(candidate));
  if (discovered) {
    return discovered;
  }

  const chromiumPath = await chromium.executablePath();
  if (chromiumPath && existsSync(chromiumPath)) {
    return chromiumPath;
  }

  return "";
}

export async function renderContractPdfBuffer(html) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const executablePath = await resolveExecutablePath(chromium);
  if (!executablePath) {
    throw new Error(
      "Unable to resolve Chromium executable path for server-side PDF generation. " +
      "Set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary or install Chrome/Chromium on the server. " +
      "Alternatively ensure @sparticuz/chromium is available in the runtime environment."
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(String(html || ""), {
      waitUntil: "networkidle0",
      timeout: 25_000,
    });

    const pdfBytes = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "14mm",
        left: "12mm",
      },
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
