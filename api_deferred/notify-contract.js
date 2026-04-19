import { createHash, randomBytes } from "crypto";
import sgMail from "@sendgrid/mail";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  appBaseUrl,
  asEmail,
  asText,
  createSupabaseAdminClient,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import { resolveStorageSignedUrl } from "../lib/server/contractsDocumentService.js";
import { compactSendgridError, nextRetryDelayMs, sendWithRetry } from "../lib/server/sendgridRetry.js";

function jsonBody(req) {
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

function uniqueRecipientsFromSignatures(signatureRows) {
  const seen = new Set();
  const out = [];

  (Array.isArray(signatureRows) ? signatureRows : []).forEach((row) => {
    const email = asEmail(row?.signer_email);
    if (!email || seen.has(email)) return;

    seen.add(email);
    out.push({
      email,
      name: asText(row?.signer_name, asText(row?.party_role, "Signer")),
      role: asText(row?.party_role, "Signer").toLowerCase(),
    });
  });

  return out;
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
  portalUrl,
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
        <a href="${pdfUrl}" style="display: inline-block; text-decoration: none; background: #111827; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-right: 8px;">
          Download Executed PDF
        </a>
        <a href="${portalUrl}" style="display: inline-block; text-decoration: none; background: #0f766e; color: #ffffff; padding: 10px 14px; border-radius: 6px;">
          Open Title Portal
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">Portal access expires automatically for security.</p>
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
  portalUrl,
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
    `Title Portal: ${portalUrl}`,
  ].join("\n");
}

function titlePortalTokenExpiryIso() {
  const ttlHours = Math.max(1, Number(process.env.TITLE_PORTAL_TOKEN_TTL_HOURS || 168));
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
}

async function createTitlePortalToken({ supabaseAdmin, contractId, titleCompanyEmail, actorUserId }) {
  const tokenValue = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(tokenValue).digest("hex");

  const { error } = await supabaseAdmin
    .from("contract_title_portal_tokens")
    .insert({
      contract_id: contractId,
      title_company_email: titleCompanyEmail,
      token_hash: tokenHash,
      expires_at: titlePortalTokenExpiryIso(),
      created_by: actorUserId,
    });

  if (error) {
    throw new Error(`Failed to create title portal token: ${error.message}`);
  }

  return tokenValue;
}

async function fetchDeliveryContext(supabaseAdmin, contractId) {
  const { data: contractRow, error: contractError } = await supabaseAdmin
    .from("contracts")
    .select("id, creator_id, title, fee_amount, fee_pct, pdf_url")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    throw new Error(`Unable to load contract: ${contractError.message}`);
  }

  if (!contractRow?.id) {
    throw new Error("Contract was not found");
  }

  const [signatureResult, formResult] = await Promise.all([
    supabaseAdmin
      .from("contract_signatures")
      .select("id, party_role, signer_name, signer_email, doc_hash")
      .eq("contract_id", contractId)
      .order("signed_at", { ascending: false }),
    supabaseAdmin
      .from("contract_form_values")
      .select("field_key, field_value")
      .eq("contract_id", contractId),
  ]);

  if (signatureResult.error) {
    throw new Error(`Unable to load signatures: ${signatureResult.error.message}`);
  }

  if (formResult.error) {
    throw new Error(`Unable to load contract form values: ${formResult.error.message}`);
  }

  const formMap = (formResult.data || []).reduce((acc, row) => {
    acc[asText(row.field_key)] = asText(row.field_value);
    return acc;
  }, {});

  return {
    contract: contractRow,
    signatures: signatureResult.data || [],
    formMap,
  };
}

async function findAttemptRow(supabaseAdmin, contractId, recipientEmail, recipientRole) {
  const { data, error } = await supabaseAdmin
    .from("contract_delivery_attempts")
    .select("id, attempt_count")
    .eq("contract_id", contractId)
    .eq("recipient_email", recipientEmail)
    .eq("recipient_role", recipientRole)
    .eq("channel", "email")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve delivery attempt row: ${error.message}`);
  }

  return data || null;
}

async function recordDeliveryAttempt(supabaseAdmin, input) {
  const existing = await findAttemptRow(
    supabaseAdmin,
    input.contractId,
    input.recipientEmail,
    input.recipientRole,
  );

  const nextAttemptCount = Math.max(0, Number(existing?.attempt_count || 0)) + Math.max(1, Number(input.attemptsUsed || 1));

  const rowPayload = {
    contract_id: input.contractId,
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName,
    recipient_role: input.recipientRole,
    channel: "email",
    status: input.status,
    attempt_count: nextAttemptCount,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: input.nextRetryAt || new Date().toISOString(),
    last_error: input.lastError || null,
    payload: input.payload,
    delivered_at: input.status === "delivered" ? new Date().toISOString() : null,
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("contract_delivery_attempts")
      .update(rowPayload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Unable to update delivery attempt row: ${error.message}`);
    }

    return;
  }

  const { error } = await supabaseAdmin
    .from("contract_delivery_attempts")
    .insert(rowPayload);

  if (error) {
    throw new Error(`Unable to insert delivery attempt row: ${error.message}`);
  }
}

async function sendMessageWithAudit({
  supabaseAdmin,
  contractId,
  recipient,
  message,
  retryConfig,
}) {
  const delivery = await sendWithRetry(
    () => sgMail.send(message),
    {
      maxAttempts: retryConfig.maxAttempts,
      baseDelayMs: retryConfig.baseDelayMs,
      maxDelayMs: retryConfig.maxDelayMs,
    },
  );

  if (delivery.ok) {
    await recordDeliveryAttempt(supabaseAdmin, {
      contractId,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      status: "delivered",
      attemptsUsed: delivery.attempt,
      nextRetryAt: new Date().toISOString(),
      payload: message,
      lastError: null,
    });

    return {
      delivered: true,
      recipient: recipient.email,
      role: recipient.role,
      attempts: delivery.attempt,
    };
  }

  const compactError = compactSendgridError(delivery.error);
  const nextDelay = nextRetryDelayMs(
    delivery.attempt + 1,
    retryConfig.baseDelayMs,
    retryConfig.maxDelayMs,
  );
  const nextRetryAt = new Date(Date.now() + nextDelay).toISOString();

  await recordDeliveryAttempt(supabaseAdmin, {
    contractId,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    recipientRole: recipient.role,
    status: "pending",
    attemptsUsed: delivery.attempt,
    nextRetryAt,
    payload: message,
    lastError: compactError.message,
  });

  return {
    delivered: false,
    recipient: recipient.email,
    role: recipient.role,
    attempts: delivery.attempt,
    error: compactError.message,
    statusCode: compactError.status,
    nextRetryAt,
  };
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

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const apiKey = asText(process.env.SENDGRID_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing SENDGRID_API_KEY" });
  }

  const fromEmail = asEmail(process.env.SENDGRID_FROM_EMAIL, "no-reply@dealbank.local");
  const contractId = asText(body.contractId);
  if (!contractId) {
    return res.status(400).json({ error: "contractId is required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  let context;
  try {
    context = await fetchDeliveryContext(supabaseAdmin, contractId);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to load contract delivery context" });
  }

  if (!actor.isAdmin && asText(context.contract.creator_id) !== actor.userId) {
    return res.status(403).json({ error: "Only the contract creator can trigger executed contract delivery" });
  }

  const signedRecipients = uniqueRecipientsFromSignatures(context.signatures);
  const titleCompanyEmail = asEmail(context.formMap.titleCompanyEmail || body.titleCompanyEmail);
  const titleCompanyName = asText(context.formMap.titleCompany || body.titleCompany, "Title Company");

  if (signedRecipients.length === 0 && !titleCompanyEmail) {
    return res.status(200).json({ delivered: false, reason: "no_recipients", recipientCount: 0 });
  }

  const contractName = asText(context.contract.title, asText(body.contractName, "DealBank Contract"));
  const docHash = asText(context.signatures[0]?.doc_hash || body.docHash);
  const propertyAddress = asText(context.formMap.propertyAddress || body.propertyAddress);
  const closeDate = asText(context.formMap.closeDate || body.closeDate);
  const assignmentFee = toNumber(context.formMap.assignmentFee || body.assignmentFee || context.contract.fee_amount, 0);
  const platformFeePct = toNumber(context.contract.fee_pct || body.platformFeePct, 1.5);
  const platformFeePctLabel = toPercentLabel(platformFeePct, 1.5);
  const platformFee = toNumber(body.platformFeeAmount, assignmentFee * (platformFeePct / 100));

  let pdfUrl = "";
  const storedPdfPath = asText(context.contract.pdf_url);
  if (storedPdfPath) {
    pdfUrl = await resolveStorageSignedUrl(supabaseAdmin, storedPdfPath, 60 * 60 * 24 * 7);
  }
  if (!pdfUrl) {
    pdfUrl = asText(body.pdfUrl);
  }

  if (!pdfUrl) {
    return res.status(400).json({ error: "Contract PDF is required before sending delivery emails" });
  }

  sgMail.setApiKey(apiKey);

  const rootUrl = appBaseUrl(req);
  let portalUrl = "";

  if (titleCompanyEmail) {
    try {
      const rawToken = await createTitlePortalToken({
        supabaseAdmin,
        contractId,
        titleCompanyEmail,
        actorUserId: actor.userId,
      });
      portalUrl = `${rootUrl}/api/title-portal?token=${rawToken}`;
    } catch (error) {
      return res.status(500).json({ error: error?.message || "Failed to generate title portal access" });
    }
  }

  const deliveryMessages = [
    ...signedRecipients.map((recipient) => ({
      recipient,
      message: {
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
      },
    })),
  ];

  if (titleCompanyEmail) {
    deliveryMessages.push({
      recipient: {
        email: titleCompanyEmail,
        name: titleCompanyName,
        role: "title_company",
      },
      message: {
        to: titleCompanyEmail,
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
          portalUrl,
        }),
        html: titleCompanyEmailHtml({
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
          portalUrl,
        }),
      },
    });
  }

  const retryConfig = {
    maxAttempts: Math.max(1, Number(process.env.CONTRACT_EMAIL_RETRY_MAX_ATTEMPTS || 3)),
    baseDelayMs: Math.max(300, Number(process.env.CONTRACT_EMAIL_RETRY_BASE_DELAY_MS || 900)),
    maxDelayMs: Math.max(1_000, Number(process.env.CONTRACT_EMAIL_RETRY_MAX_DELAY_MS || 30_000)),
  };

  const deliveryResults = await Promise.all(
    deliveryMessages.map(({ recipient, message }) => sendMessageWithAudit({
      supabaseAdmin,
      contractId,
      recipient,
      message,
      retryConfig,
    })),
  );

  const deliveredCount = deliveryResults.filter((item) => item.delivered).length;
  const pendingCount = deliveryResults.length - deliveredCount;

  return res.status(pendingCount > 0 ? 202 : 200).json({
    delivered: pendingCount === 0,
    recipientCount: deliveryResults.length,
    deliveredCount,
    pendingCount,
    titleCompanyDelivered: deliveryResults.some((item) => item.role === "title_company" && item.delivered),
    results: deliveryResults,
  });
}
