import sgMail from "@sendgrid/mail";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import { compactSendgridError, nextRetryDelayMs, sendWithRetry } from "../lib/server/sendgridRetry.js";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredMessageFields(payload) {
  if (!isObject(payload)) return false;
  if (!asText(payload.to)) return false;
  if (!asText(payload.from)) return false;
  if (!asText(payload.subject)) return false;
  return true;
}

function authorizeRetryRequest(req, supabaseAdmin) {
  const expectedSecret = asText(process.env.CONTRACT_DELIVERY_CRON_SECRET);
  const receivedSecret = asText(req.headers?.["x-contract-delivery-secret"] || req.headers?.["x-cron-secret"]);

  if (expectedSecret && receivedSecret && receivedSecret === expectedSecret) {
    return Promise.resolve({ userId: "cron", userType: "system", isAdmin: true });
  }

  return verifyContractActor(req, supabaseAdmin, {
    allowedTypes: ["admin"],
  });
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization, X-Contract-Delivery-Secret, X-Cron-Secret",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "contract-delivery-retry",
    max: Number(process.env.RATE_LIMIT_CONTRACT_DELIVERY_RETRY_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_CONTRACT_DELIVERY_RETRY_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sendgridApiKey = asText(process.env.SENDGRID_API_KEY);
  if (!sendgridApiKey) {
    return res.status(500).json({ error: "Server is missing SENDGRID_API_KEY" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  try {
    await authorizeRetryRequest(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  sgMail.setApiKey(sendgridApiKey);

  const batchLimit = Math.max(1, Number(process.env.CONTRACT_DELIVERY_RETRY_BATCH || 30));
  const maxTotalAttempts = Math.max(1, Number(process.env.CONTRACT_EMAIL_MAX_TOTAL_ATTEMPTS || 8));
  const maxAttemptsPerRun = Math.max(1, Number(process.env.CONTRACT_EMAIL_RETRY_ATTEMPTS_PER_RUN || 1));
  const baseDelayMs = Math.max(300, Number(process.env.CONTRACT_EMAIL_RETRY_BASE_DELAY_MS || 900));
  const maxDelayMs = Math.max(1_000, Number(process.env.CONTRACT_EMAIL_RETRY_MAX_DELAY_MS || 30_000));

  const nowIso = new Date().toISOString();
  const { data: pendingRows, error: pendingError } = await supabaseAdmin
    .from("contract_delivery_attempts")
    .select("id, contract_id, recipient_email, recipient_name, recipient_role, attempt_count, payload")
    .in("status", ["pending", "failed"])
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(batchLimit);

  if (pendingError) {
    return res.status(500).json({ error: `Failed to load pending delivery rows: ${pendingError.message}` });
  }

  const rows = pendingRows || [];
  const results = [];

  for (const row of rows) {
    const payload = row.payload;
    if (!hasRequiredMessageFields(payload)) {
      const attemptCount = Math.max(0, Number(row.attempt_count || 0)) + 1;
      const exhausted = attemptCount >= maxTotalAttempts;
      const nextRetryAt = new Date(Date.now() + nextRetryDelayMs(attemptCount, baseDelayMs, maxDelayMs)).toISOString();

      await supabaseAdmin
        .from("contract_delivery_attempts")
        .update({
          status: exhausted ? "failed" : "pending",
          attempt_count: attemptCount,
          last_attempt_at: new Date().toISOString(),
          next_retry_at: nextRetryAt,
          last_error: "Invalid stored payload for SendGrid retry",
        })
        .eq("id", row.id);

      results.push({
        id: row.id,
        contractId: row.contract_id,
        recipient: row.recipient_email,
        delivered: false,
        error: "Invalid stored payload for SendGrid retry",
      });
      continue;
    }

    const delivery = await sendWithRetry(
      () => sgMail.send(payload),
      {
        maxAttempts: maxAttemptsPerRun,
        baseDelayMs,
        maxDelayMs,
      },
    );

    const attemptsUsed = Math.max(1, Number(delivery.attempt || 1));
    const totalAttempts = Math.max(0, Number(row.attempt_count || 0)) + attemptsUsed;

    if (delivery.ok) {
      await supabaseAdmin
        .from("contract_delivery_attempts")
        .update({
          status: "delivered",
          attempt_count: totalAttempts,
          last_attempt_at: new Date().toISOString(),
          next_retry_at: new Date().toISOString(),
          last_error: null,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      results.push({
        id: row.id,
        contractId: row.contract_id,
        recipient: row.recipient_email,
        delivered: true,
      });
      continue;
    }

    const compactError = compactSendgridError(delivery.error);
    const exhausted = totalAttempts >= maxTotalAttempts;
    const nextRetryAt = new Date(Date.now() + nextRetryDelayMs(totalAttempts, baseDelayMs, maxDelayMs)).toISOString();

    await supabaseAdmin
      .from("contract_delivery_attempts")
      .update({
        status: exhausted ? "failed" : "pending",
        attempt_count: totalAttempts,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        last_error: compactError.message,
      })
      .eq("id", row.id);

    results.push({
      id: row.id,
      contractId: row.contract_id,
      recipient: row.recipient_email,
      delivered: false,
      error: compactError.message,
      exhausted,
      nextRetryAt,
    });
  }

  const deliveredCount = results.filter((item) => item.delivered).length;
  const failedCount = results.length - deliveredCount;

  return res.status(200).json({
    scanned: rows.length,
    deliveredCount,
    failedCount,
    results,
  });
}
