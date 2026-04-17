import sgMail from "@sendgrid/mail";

function asText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
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

function emailHtml({ recipientName, contractName, contractId, docHash, pdfUrl }) {
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
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

  if (!contractId || !pdfUrl) {
    return res.status(400).json({ error: "contractId and pdfUrl are required" });
  }

  const recipients = uniqueRecipients(req.body?.parties);
  if (recipients.length === 0) {
    return res.status(200).json({ delivered: false, reason: "no_signed_recipients", recipientCount: 0 });
  }

  sgMail.setApiKey(apiKey);

  try {
    await Promise.all(
      recipients.map((recipient) => sgMail.send({
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
        html: emailHtml({
          recipientName: recipient.name,
          contractName,
          contractId,
          docHash,
          pdfUrl,
        }),
      })),
    );

    return res.status(200).json({ delivered: true, recipientCount: recipients.length });
  } catch (error) {
    return res.status(502).json({
      delivered: false,
      reason: "sendgrid_request_failed",
      error: error?.message || "SendGrid request failed",
    });
  }
}
