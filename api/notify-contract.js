import sgMail from "@sendgrid/mail";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

function asText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  if (!normalized) return fallback;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value) {
  return `$${toNumber(value, 0).toFixed(2)}`;
}

function toPercentLabel(value, fallback = 1.5) {
  const pct = toNumber(value, fallback);
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function uniqueRecipients(parties) {
  const seen = new Set();
  const out = [];

  (Array.isArray(parties) ? parties : []).forEach((party) => {
    if (String(party?.status || "").toLowerCase() !== "signed") return;

    const email = asText(party?.email).toLowerCase();
    if (!isValidEmail(email) || seen.has(email)) return;

    seen.add(email);
    out.push({
      email,
      name: asText(party?.signerName, asText(party?.role, "Signer")),
      role: asText(party?.role, "Signer"),
    });
  });

  return out;
}

function titleCompanyRecipient(payload) {
  const email = asText(payload?.titleCompanyEmail).toLowerCase();
  if (!isValidEmail(email)) return null;

  return {
    email,
    name: asText(payload?.titleCompany, "Title Company"),
  };
}

function signedPartyEmailHtml({ recipientName, contractName, contractId, docHash, pdfUrl }) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6; max-width: 620px; margin: 0 auto;">
      <h2 style="margin-bottom: 6px;">Contract Fully Executed</h2>
      <p style="margin-top: 0; color: #4b5563;">Hello ${recipientName}, your DealBank contract has been fully executed.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; background: #f9fafb; margin: 14px 0;">
        <div><strong>Contract:</strong> ${contractName}</div>
        <div><strong>Contract ID:</strong> ${contractId}</div>
        <div style="word-break: break-all;"><strong>Document Hash:</strong> ${docHash || "n/a"}</div>
      </div>
      <p>
        <a href="${pdfUrl}" style="display: inline-block; text-decoration: none; background: #111827; color: #ffffff; padding: 10px 14px; border-radius: 6px;">
          Download Executed PDF
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">You are receiving this email because you signed this contract on DealBank.</p>
    </div>
  `;
}

function titleCompanyEmailHtml({
  titleCompanyName,
  contractName,
  contractId,
  propertyAddress,
  closeDate,
  assignmentFee,
  platformFee,
  platformFeePctLabel,
  docHash,
  pdfUrl,
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto;">
      <h2 style="margin-bottom: 6px;">Title Disbursement Instructions</h2>
      <p style="margin-top: 0; color: #4b5563;">Hello ${titleCompanyName}, this DealBank contract is fully executed and ready for closing instructions.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; background: #f9fafb; margin: 14px 0;">
        <div><strong>Contract:</strong> ${contractName}</div>
        <div><strong>Contract ID:</strong> ${contractId}</div>
        <div><strong>Property:</strong> ${propertyAddress || "n/a"}</div>
        <div><strong>Close Date:</strong> ${closeDate || "n/a"}</div>
        <div><strong>Assignment Fee:</strong> ${assignmentFee ? toMoney(assignmentFee) : "n/a"}</div>
      </div>
      <div style="border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; background: #eff6ff; margin: 14px 0;">
        <div style="font-weight: 700; margin-bottom: 4px;">Disbursement Authorization</div>
        <div>Please disburse <strong>${toMoney(platformFee)}</strong> (${platformFeePctLabel}) to DealBank LLC at closing per signed Section A3 authorization.</div>
      </div>
      <p style="word-break: break-all;"><strong>Document Hash:</strong> ${docHash || "n/a"}</p>
      <p>
        <a href="${pdfUrl}" style="display: inline-block; text-decoration: none; background: #111827; color: #ffffff; padding: 10px 14px; border-radius: 6px;">
          Download Executed PDF
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">If wire or remittance details are needed, reply to this email and the DealBank operations team will provide instructions.</p>
    </div>
  `;
}

function titleCompanyEmailText({
  contractName,
  contractId,
  propertyAddress,
  closeDate,
  assignmentFee,
  platformFee,
  platformFeePctLabel,
  docHash,
  pdfUrl,
}) {
  return [
    "DealBank Title Disbursement Instructions",
    `Contract: ${contractName}`,
    `Contract ID: ${contractId}`,
    `Property: ${propertyAddress || "n/a"}`,
    `Close Date: ${closeDate || "n/a"}`,
    `Assignment Fee: ${assignmentFee ? toMoney(assignmentFee) : "n/a"}`,
    `Disburse to DealBank LLC: ${toMoney(platformFee)} (${platformFeePctLabel})`,
    `Document Hash: ${docHash || "n/a"}`,
    `Executed PDF: ${pdfUrl}`,
  ].join("\n");
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "notify-contract",
    max: Number(process.env.RATE_LIMIT_NOTIFY_CONTRACT_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_NOTIFY_CONTRACT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = asText(process.env.SENDGRID_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing SENDGRID_API_KEY" });
  }

  const fromEmail = asText(process.env.SENDGRID_FROM_EMAIL, "no-reply@dealbank.local");
  const contractId = asText(req.body?.contractId);
  const contractName = asText(req.body?.contractName, "DealBank Contract");
  const docHash = asText(req.body?.docHash);
  const pdfUrl = asText(req.body?.pdfUrl);
  const propertyAddress = asText(req.body?.propertyAddress);
  const closeDate = asText(req.body?.closeDate);
  const assignmentFee = toNumber(req.body?.assignmentFee, 0);
  const platformFeePctLabel = toPercentLabel(req.body?.platformFeePct, 1.5);
  const platformFeePct = toNumber(req.body?.platformFeePct, 1.5);
  const explicitPlatformFee = toNumber(req.body?.platformFeeAmount, 0);
  const platformFee = explicitPlatformFee > 0
    ? explicitPlatformFee
    : assignmentFee > 0
      ? assignmentFee * (platformFeePct / 100)
      : 0;

  if (!contractId || !pdfUrl) {
    return res.status(400).json({ error: "contractId and pdfUrl are required" });
  }

  const signedRecipients = uniqueRecipients(req.body?.parties);
  const titleRecipient = titleCompanyRecipient(req.body);
  if (signedRecipients.length === 0 && !titleRecipient) {
    return res.status(200).json({ delivered: false, reason: "no_recipients", recipientCount: 0 });
  }

  sgMail.setApiKey(apiKey);

  try {
    const sendTasks = [];

    if (signedRecipients.length > 0) {
      sendTasks.push(Promise.all(
        signedRecipients.map((recipient) => sgMail.send({
          to: recipient.email,
          from: fromEmail,
          subject: `Contract Executed: ${contractName}`,
          text: [
            "Contract Fully Executed",
            `Contract: ${contractName}`,
            `Contract ID: ${contractId}`,
            `Document Hash: ${docHash || "n/a"}`,
            `Download PDF: ${pdfUrl}`,
          ].join("\n"),
          html: signedPartyEmailHtml({
            recipientName: recipient.name,
            contractName,
            contractId,
            docHash,
            pdfUrl,
          }),
        })),
      ));
    }

    if (titleRecipient) {
      sendTasks.push(sgMail.send({
        to: titleRecipient.email,
        from: fromEmail,
        subject: `Disbursement Instructions: ${contractName}`,
        text: titleCompanyEmailText({
          contractName,
          contractId,
          propertyAddress,
          closeDate,
          assignmentFee,
          platformFee,
          platformFeePctLabel,
          docHash,
          pdfUrl,
        }),
        html: titleCompanyEmailHtml({
          titleCompanyName: titleRecipient.name,
          contractName,
          contractId,
          propertyAddress,
          closeDate,
          assignmentFee,
          platformFee,
          platformFeePctLabel,
          docHash,
          pdfUrl,
        }),
      }));
    }

    await Promise.all(sendTasks);

    return res.status(200).json({
      delivered: true,
      recipientCount: signedRecipients.length + (titleRecipient ? 1 : 0),
      signedRecipientCount: signedRecipients.length,
      titleCompanyDelivered: Boolean(titleRecipient),
    });
  } catch (error) {
    return res.status(502).json({
      delivered: false,
      reason: "sendgrid_request_failed",
      error: error?.message || "SendGrid request failed",
    });
  }
}
