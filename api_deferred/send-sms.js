import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function asInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBool(value, fallback = false) {
  const normalized = asText(value).toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

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

function createSupabaseAdminClient() {
  const supabaseUrl = asText(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRole = asText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Server is missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyIdentity(req, supabaseAdmin) {
  const authHeader = asText(req.headers?.authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer authorization token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new Error("Missing bearer authorization token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error(error?.message || "Invalid Supabase auth token");
  }

  const userId = asText(data.user.id);
  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, type")
    .eq("id", userId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user role: ${appUserError.message}`);
  }

  const userType = asText(appUser?.type || data.user?.user_metadata?.type).toLowerCase();
  if (!["dealmaker", "admin"].includes(userType)) {
    throw new Error("Only deal makers can dispatch SMS sequences");
  }

  return {
    userId,
    userType,
  };
}

function firstName(value) {
  const fullName = asText(value, "there");
  return fullName.split(/\s+/)[0] || "there";
}

function normalizePhone(rawPhone) {
  const cleaned = String(rawPhone || "").replace(/[^0-9+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+") && cleaned.length >= 11 && cleaned.length <= 16) {
    return cleaned;
  }

  const digits = cleaned.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function renderTemplate(template, lead) {
  const message = asText(template);
  if (!message) return "";

  const replacements = {
    first_name: firstName(lead?.name),
    property_address: asText(lead?.address, "your property"),
    equity_estimate: String(Number(lead?.equity || 0).toLocaleString()),
    city: asText(lead?.address, "").split(",").slice(-2, -1)[0]?.trim() || "your city",
    callback_time: "tomorrow at 10:00 AM",
  };

  return message
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, tokenName) => {
      const key = String(tokenName || "").toLowerCase();
      return replacements[key] || "";
    })
    .trim();
}

async function loadSequenceContext(supabaseAdmin, userId, sequenceId) {
  const { data: sequenceRow, error: sequenceError } = await supabaseAdmin
    .from("sms_sequences")
    .select("id, owner_id, name, status")
    .eq("id", sequenceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (sequenceError) {
    throw new Error(`Unable to load sequence: ${sequenceError.message}`);
  }

  if (!sequenceRow) {
    throw new Error("Sequence not found");
  }

  const { data: stepRows, error: stepsError } = await supabaseAdmin
    .from("sequence_steps")
    .select("id, step_order, day_offset, type, message")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  if (stepsError) {
    throw new Error(`Unable to load sequence steps: ${stepsError.message}`);
  }

  const { data: leadRows, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("id, name, phone, address, equity, status")
    .eq("owner_id", userId)
    .neq("status", "Closed")
    .not("phone", "is", null)
    .order("added_at", { ascending: false })
    .limit(1000);

  if (leadsError) {
    throw new Error(`Unable to load leads for sequence: ${leadsError.message}`);
  }

  return {
    sequence: sequenceRow,
    steps: Array.isArray(stepRows) ? stepRows : [],
    leads: Array.isArray(leadRows) ? leadRows : [],
  };
}

function buildDispatchRows(sequence, steps, leads) {
  const nowMs = Date.now();
  const smsSteps = steps.filter((step) => String(step.type || "").toLowerCase() === "sms");
  const rows = [];

  smsSteps.forEach((step) => {
    const dayOffset = Math.max(0, asInt(step.day_offset, 0));
    const scheduledFor = new Date(nowMs + (dayOffset * 24 * 60 * 60 * 1000)).toISOString();

    leads.forEach((lead) => {
      const body = renderTemplate(step.message, lead);
      if (!body) return;

      rows.push({
        owner_id: sequence.owner_id,
        sequence_id: sequence.id,
        step_id: step.id,
        lead_id: lead.id,
        to_phone: asText(lead.phone),
        lead_name: asText(lead.name, "Lead"),
        body,
        scheduled_for: scheduledFor,
        status: "queued",
        sent_at: null,
        provider_sid: null,
        error_message: null,
      });
    });
  });

  return rows;
}

function readTwilioConfig() {
  const accountSid = asText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = asText(process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = asText(process.env.TWILIO_SMS_FROM || process.env.TWILIO_CALLER_ID);
  const messagingServiceSid = asText(process.env.TWILIO_MESSAGING_SERVICE_SID);

  return {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid,
    ready: Boolean(accountSid && authToken && (fromNumber || messagingServiceSid)),
  };
}

async function sendDueDispatches({ supabaseAdmin, userId, sequenceId }) {
  const nowIso = new Date().toISOString();

  let query = supabaseAdmin
    .from("sms_dispatches")
    .select("id, lead_id, to_phone, body")
    .eq("owner_id", userId)
    .eq("status", "queued")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(500);

  if (sequenceId) {
    query = query.eq("sequence_id", sequenceId);
  }

  const { data: dueRows, error: dueError } = await query;
  if (dueError) {
    throw new Error(`Unable to load due SMS dispatches: ${dueError.message}`);
  }

  const queuedCount = Array.isArray(dueRows) ? dueRows.length : 0;
  if (!queuedCount) {
    return { queuedCount: 0, sentCount: 0, failedCount: 0, providerConfigured: true };
  }

  const twilioConfig = readTwilioConfig();
  if (!twilioConfig.ready) {
    return { queuedCount, sentCount: 0, failedCount: 0, providerConfigured: false };
  }

  const client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
  let sentCount = 0;
  let failedCount = 0;

  for (const row of dueRows) {
    const to = normalizePhone(row.to_phone);

    if (!to) {
      failedCount += 1;
      await supabaseAdmin
        .from("sms_dispatches")
        .update({
          status: "failed",
          error_message: "Lead phone number is not a valid E.164 destination.",
        })
        .eq("id", row.id)
        .eq("owner_id", userId);
      continue;
    }

    try {
      const messagePayload = {
        to,
        body: asText(row.body),
      };

      if (twilioConfig.messagingServiceSid) {
        messagePayload.messagingServiceSid = twilioConfig.messagingServiceSid;
      } else {
        messagePayload.from = twilioConfig.fromNumber;
      }

      const twilioMessage = await client.messages.create(messagePayload);
      const sentAtIso = new Date().toISOString();

      sentCount += 1;

      await supabaseAdmin
        .from("sms_dispatches")
        .update({
          status: "sent",
          provider_sid: asText(twilioMessage.sid),
          sent_at: sentAtIso,
          error_message: null,
        })
        .eq("id", row.id)
        .eq("owner_id", userId);

      if (row.lead_id) {
        await supabaseAdmin
          .from("leads")
          .update({ last_contacted: sentAtIso })
          .eq("id", row.lead_id)
          .eq("owner_id", userId);
      }
    } catch (error) {
      failedCount += 1;
      await supabaseAdmin
        .from("sms_dispatches")
        .update({
          status: "failed",
          error_message: asText(error?.message, "Twilio SMS send failed"),
        })
        .eq("id", row.id)
        .eq("owner_id", userId);
    }
  }

  return {
    queuedCount,
    sentCount,
    failedCount,
    providerConfigured: true,
  };
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "send-sms",
    max: Number(process.env.RATE_LIMIT_SEND_SMS_MAX || 15),
    windowMs: Number(process.env.RATE_LIMIT_SEND_SMS_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
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

  const sequenceId = asText(body.sequenceId);
  const allowPaused = asBool(body.allowPaused, false);
  if (!sequenceId) {
    return res.status(400).json({ error: "sequenceId is required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let identity;
  try {
    identity = await verifyIdentity(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  try {
    const context = await loadSequenceContext(supabaseAdmin, identity.userId, sequenceId);

    if (String(context.sequence.status || "").toLowerCase() === "paused" && !allowPaused) {
      return res.status(409).json({
        queuedCount: 0,
        sentCount: 0,
        failedCount: 0,
        message: "Sequence is paused. Resume it before dispatching SMS.",
      });
    }

    const dispatchRows = buildDispatchRows(context.sequence, context.steps, context.leads);
    if (dispatchRows.length > 0) {
      const { error: enqueueError } = await supabaseAdmin
        .from("sms_dispatches")
        .upsert(dispatchRows, { onConflict: "sequence_id,step_id,lead_id" });

      if (enqueueError) {
        throw new Error(`Unable to queue sequence SMS dispatches: ${enqueueError.message}`);
      }
    }

    const sendSummary = await sendDueDispatches({
      supabaseAdmin,
      userId: identity.userId,
      sequenceId,
    });

    return res.status(200).json({
      queuedCount: sendSummary.queuedCount,
      sentCount: sendSummary.sentCount,
      failedCount: sendSummary.failedCount,
      providerConfigured: sendSummary.providerConfigured,
      message: sendSummary.providerConfigured
        ? "Sequence SMS dispatch processed."
        : "SMS provider not configured. Messages remain queued.",
    });
  } catch (error) {
    return res.status(502).json({
      error: error?.message || "Failed to process SMS sequence dispatch",
    });
  }
}
