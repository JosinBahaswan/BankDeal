import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function asBool(value, fallback = false) {
  const normalized = asText(value).toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function asInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function appBaseUrl(req) {
  const configured = asText(process.env.APP_URL).replace(/\/$/, "");
  if (configured) return configured;

  const vercelHost = asText(process.env.VERCEL_URL);
  if (vercelHost) return `https://${vercelHost}`;

  const proto = asText(req.headers?.["x-forwarded-proto"], "https");
  const host = asText(req.headers?.["x-forwarded-host"] || req.headers?.host);
  if (host) return `${proto}://${host}`;

  return "http://localhost:5173";
}

function resolveAbsoluteUrl(req, pathOrUrl, fallbackPath = "/") {
  const value = asText(pathOrUrl);
  if (/^https?:\/\//i.test(value)) return value;

  const base = appBaseUrl(req);
  const normalizedPath = value
    ? (value.startsWith("/") ? value : `/${value}`)
    : fallbackPath;

  return `${base}${normalizedPath}`;
}

function addQueryParam(url, key, value) {
  const normalized = asText(value);
  if (!normalized) return;
  url.searchParams.set(key, normalized);
}

function toQueryValue(raw) {
  if (Array.isArray(raw)) return asText(raw[0]);
  return asText(raw);
}

function parseParamsFromText(rawBody) {
  const parsed = {};
  const params = new URLSearchParams(rawBody || "");
  params.forEach((value, key) => {
    parsed[key] = value;
  });
  return parsed;
}

async function readTwilioPayload(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return parseParamsFromText(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return parseParamsFromText(raw);
}

function readTwiMLConfig(overrides = {}) {
  return {
    callerId: asText(overrides.callerId || process.env.TWILIO_CALLER_ID),
    callbackEndpoint: asText(process.env.TWILIO_CALL_WEBHOOK_ENDPOINT, "/api/twilio-access-token?mode=call-webhook"),
    recordingEnabled: asBool(process.env.TWILIO_RECORD_FROM_ANSWER, true),
  };
}

function buildTwilioCallbackUrl(req, config, event, payload) {
  const callbackBase = resolveAbsoluteUrl(req, config.callbackEndpoint, "/api/twilio-access-token?mode=call-webhook");
  const callbackUrl = new URL(callbackBase);

  callbackUrl.searchParams.set("mode", "call-webhook");
  callbackUrl.searchParams.set("event", event);
  addQueryParam(callbackUrl, "caller_id", payload.callerId);
  addQueryParam(callbackUrl, "lead_name", payload.leadName);
  addQueryParam(callbackUrl, "lead_address", payload.leadAddress);
  addQueryParam(callbackUrl, "lead_phone", payload.to);

  return callbackUrl.toString();
}

function buildVoiceTwiML(req, config, payload) {
  const to = asText(payload.To || payload.to || payload.phone);
  const callerId = asText(payload.CallerId || payload.caller_id || payload.callerId);
  const leadName = asText(payload.LeadName || payload.lead_name);
  const leadAddress = asText(payload.LeadAddress || payload.lead_address);

  const response = new twilio.twiml.VoiceResponse();

  if (!to) {
    response.say("No destination number was provided.");
    response.hangup();
    return response.toString();
  }

  const callbackPayload = {
    to,
    callerId,
    leadName,
    leadAddress,
  };

  const dialOptions = {
    answerOnBridge: true,
  };

  if (config.recordingEnabled) {
    dialOptions.record = "record-from-answer";
    dialOptions.recordingStatusCallback = buildTwilioCallbackUrl(req, config, "recording", callbackPayload);
    dialOptions.recordingStatusCallbackMethod = "POST";
    dialOptions.recordingStatusCallbackEvent = "in-progress completed absent";
  }

  if (config.callerId) {
    dialOptions.callerId = config.callerId;
  }

  const dial = response.dial(dialOptions);
  dial.number(
    {
      statusCallback: buildTwilioCallbackUrl(req, config, "call", callbackPayload),
      statusCallbackMethod: "POST",
      statusCallbackEvent: "initiated ringing answered completed",
    },
    to,
  );

  return response.toString();
}

async function maybeServeTwiML(req, res, options = {}) {
  const mode = toQueryValue(req.query?.mode).toLowerCase();
  const shouldServeFromMode = mode === "twiml";
  const hasAuthHeader = Boolean(asText(req.headers?.authorization));
  const shouldServeFromPost = req.method === "POST" && !hasAuthHeader;

  if (!shouldServeFromMode && !shouldServeFromPost) {
    return false;
  }

  const payload = await readTwilioPayload(req);
  const twimlConfig = options.twimlConfig || readTwiMLConfig();
  const twimlXml = buildVoiceTwiML(req, twimlConfig, payload || {});

  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.status(200).send(twimlXml);
  return true;
}

function inferWebhookOutcome(callStatus, durationSec) {
  const normalized = asText(callStatus).toLowerCase();
  if (["busy", "failed", "no-answer", "canceled"].includes(normalized)) return "No Answer";
  if (normalized === "completed" && Number(durationSec || 0) <= 0) return "No Answer";
  return null;
}

function buildAbsoluteWebhookRequestUrl(req) {
  const base = appBaseUrl(req);
  const requestUrl = new URL(req.url || "/api/twilio-access-token?mode=call-webhook", base);
  return requestUrl.toString();
}

async function validateTwilioWebhookRequest(req, payload) {
  const shouldValidate = asBool(process.env.TWILIO_VALIDATE_WEBHOOK_SIGNATURE, false);
  if (!shouldValidate) return true;

  const authToken = asText(process.env.TWILIO_AUTH_TOKEN);
  const signature = asText(req.headers?.["x-twilio-signature"]);

  if (!authToken || !signature) return false;

  try {
    const requestUrl = buildAbsoluteWebhookRequestUrl(req);
    return twilio.validateRequest(authToken, signature, requestUrl, payload);
  } catch {
    return false;
  }
}

async function requestWebhookTranscription(recordingSid) {
  const accountSid = asText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = asText(process.env.TWILIO_AUTH_TOKEN);

  if (!recordingSid || !accountSid || !authToken) return null;

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Transcriptions.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ RecordingSid: recordingSid }).toString(),
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const reason = asText(payload?.message || text, `HTTP ${response.status}`);
    throw new Error(`Twilio transcription request failed: ${reason}`);
  }

  return {
    sid: asText(payload?.sid),
    status: asText(payload?.status),
    text: asText(payload?.transcription_text),
  };
}

async function handleTwilioCallWebhook(req, res) {
  const payload = await readTwilioPayload(req);
  const valid = await validateTwilioWebhookRequest(req, payload);
  if (!valid) {
    return res.status(403).json({ error: "Invalid Twilio webhook signature" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase client" });
  }

  const callSid = asText(payload.CallSid);
  let callerId = asText(req.query?.caller_id || payload.CallerId || payload.caller_id);
  const callStatus = asText(payload.CallStatus).toLowerCase();
  const callDurationSec = asInt(payload.CallDuration, null);
  const eventType = asText(req.query?.event || "call").toLowerCase();

  if (!callSid) {
    return res.status(400).json({ error: "Missing CallSid in Twilio webhook payload" });
  }

  if (!callerId) {
    const { data: existingRow } = await supabaseAdmin
      .from("call_logs")
      .select("caller_id")
      .eq("twilio_call_sid", callSid)
      .maybeSingle();

    callerId = asText(existingRow?.caller_id);
  }

  if (!callerId) {
    return res.status(400).json({ error: "Missing caller_id in callback query parameters and no existing call log row matched CallSid" });
  }

  const leadName = asText(req.query?.lead_name || payload.LeadName);
  const leadAddress = asText(req.query?.lead_address || payload.LeadAddress);
  const leadPhone = asText(req.query?.lead_phone || payload.To || payload.Called || payload.ToFormatted);

  const recordingSid = asText(payload.RecordingSid);
  const recordingUrl = asText(payload.RecordingUrl);
  const recordingStatus = asText(payload.RecordingStatus).toLowerCase();
  const recordingDurationSec = asInt(payload.RecordingDuration, null);
  const transcriptionSid = asText(payload.TranscriptionSid);
  const transcriptionStatus = asText(payload.TranscriptionStatus).toLowerCase();
  const transcriptionText = asText(payload.TranscriptionText);

  const calledAtIso = (() => {
    const timestamp = asText(payload.Timestamp || payload.CallTimestamp);
    if (!timestamp) return new Date().toISOString();
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  })();

  const upsertPayload = {
    caller_id: callerId,
    lead_name: leadName || null,
    phone: leadPhone || null,
    address: leadAddress || null,
    outcome: inferWebhookOutcome(callStatus, callDurationSec),
    duration_sec: callDurationSec,
    called_at: calledAtIso,
    twilio_call_sid: callSid,
    twilio_parent_call_sid: asText(payload.ParentCallSid) || null,
    twilio_status: callStatus || null,
    from_number: asText(payload.From) || null,
    to_number: asText(payload.To) || null,
    recording_sid: recordingSid || null,
    recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
    recording_status: recordingStatus || null,
    recording_duration_sec: recordingDurationSec,
    transcription_sid: transcriptionSid || null,
    transcription_status: transcriptionStatus || null,
    transcription_text: transcriptionText || null,
    raw_payload: payload,
  };

  const { data: callLogRow, error: upsertError } = await supabaseAdmin
    .from("call_logs")
    .upsert(upsertPayload, {
      onConflict: "twilio_call_sid",
    })
    .select("id")
    .single();

  if (upsertError) {
    return res.status(500).json({
      received: false,
      error: `Unable to upsert Twilio call log: ${upsertError.message}`,
    });
  }

  let transcriptionRequested = false;
  let transcriptionError = "";

  const shouldRequestTranscription = asBool(process.env.TWILIO_ENABLE_TRANSCRIPTION, true)
    && eventType === "recording"
    && recordingSid
    && recordingStatus === "completed";

  if (shouldRequestTranscription) {
    try {
      const transcription = await requestWebhookTranscription(recordingSid);
      transcriptionRequested = Boolean(transcription?.sid);

      if (transcriptionRequested) {
        await supabaseAdmin
          .from("call_logs")
          .update({
            transcription_sid: transcription.sid,
            transcription_status: asText(transcription.status, "queued"),
            transcription_text: transcription.text || null,
          })
          .eq("id", callLogRow.id);
      }
    } catch (error) {
      transcriptionError = error?.message || "Transcription request failed";
    }
  }

  return res.status(200).json({
    received: true,
    callSid,
    event: eventType,
    transcriptionRequested,
    ...(transcriptionError ? { transcriptionError } : {}),
  });
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
  if (!token) throw new Error("Missing bearer authorization token");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error(error?.message || "Invalid Supabase auth token");
  }

  const authUserId = asText(data.user.id);
  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, type")
    .eq("id", authUserId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user role: ${appUserError.message}`);
  }

  const userType = asText(appUser?.type).toLowerCase();
  if (userType !== "dealmaker") {
    throw new Error("Only deal makers can request Twilio voice access tokens");
  }

  return {
    userId: authUserId,
  };
}

function readTwilioConfig() {
  const accountSid = asText(process.env.TWILIO_ACCOUNT_SID);
  const apiKey = asText(process.env.TWILIO_API_KEY);
  const apiSecret = asText(process.env.TWILIO_API_SECRET);
  const outgoingApplicationSid = asText(process.env.TWILIO_TWIML_APP_SID);
  const callerId = asText(process.env.TWILIO_CALLER_ID);
  const pushCredentialSid = asText(process.env.TWILIO_PUSH_CREDENTIAL_SID);
  const authToken = asText(process.env.TWILIO_AUTH_TOKEN);
  const syncTwimlApp = asBool(process.env.TWILIO_SYNC_TWIML_APP, true);
  const autoCreateTwimlApp = asBool(process.env.TWILIO_AUTO_CREATE_TWIML_APP, true);
  const autoResolveCallerId = asBool(process.env.TWILIO_AUTO_RESOLVE_CALLER_ID, true);
  const twimlAppFriendlyName = asText(process.env.TWILIO_TWIML_APP_FRIENDLY_NAME, "DealBank Voice Dialer");

  if (!accountSid || !apiKey || !apiSecret) {
    throw new Error("Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET");
  }

  const needsAppResolution = !outgoingApplicationSid;
  const needsAppSync = syncTwimlApp;
  const needsCallerResolution = !callerId && autoResolveCallerId;
  const needsAuthToken = needsAppResolution || needsAppSync || needsCallerResolution;

  if (needsAuthToken && !authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is required for automatic TwiML app sync/creation and caller ID resolution");
  }

  return {
    accountSid,
    apiKey,
    apiSecret,
    outgoingApplicationSid,
    callerId,
    pushCredentialSid,
    authToken,
    syncTwimlApp,
    autoCreateTwimlApp,
    autoResolveCallerId,
    twimlAppFriendlyName,
  };
}

let twilioRuntimeCache = {
  key: "",
  expiresAt: 0,
  config: null,
};

function twilioRuntimeCacheKey(req, config) {
  const voiceUrl = resolveAbsoluteUrl(
    req,
    asText(process.env.TWILIO_TWIML_VOICE_URL, "/api/twilio-access-token?mode=twiml"),
    "/api/twilio-access-token?mode=twiml",
  );

  return [
    config.accountSid,
    config.outgoingApplicationSid,
    config.callerId,
    config.syncTwimlApp,
    config.autoCreateTwimlApp,
    config.autoResolveCallerId,
    config.twimlAppFriendlyName,
    voiceUrl,
  ].join("|");
}

async function resolveOutgoingTwimlAppSid(req, config, restClient) {
  let outgoingApplicationSid = asText(config.outgoingApplicationSid);
  const voiceUrl = resolveAbsoluteUrl(
    req,
    asText(process.env.TWILIO_TWIML_VOICE_URL, "/api/twilio-access-token?mode=twiml"),
    "/api/twilio-access-token?mode=twiml",
  );

  const applicationsApi = restClient
    .api
    .v2010
    .accounts(config.accountSid)
    .applications;

  if (!outgoingApplicationSid) {
    if (!config.autoCreateTwimlApp) {
      throw new Error("Missing TWILIO_TWIML_APP_SID and auto-create is disabled");
    }

    const existingApps = await applicationsApi.list({
      friendlyName: config.twimlAppFriendlyName,
      limit: 20,
    });

    const matchingApp = existingApps.find((app) => asText(app?.voiceUrl) === voiceUrl) || existingApps[0];

    if (matchingApp?.sid) {
      outgoingApplicationSid = asText(matchingApp.sid);
    } else {
      const createdApp = await applicationsApi.create({
        friendlyName: config.twimlAppFriendlyName,
        voiceUrl,
        voiceMethod: "POST",
      });
      outgoingApplicationSid = asText(createdApp?.sid);
    }
  }

  if (!outgoingApplicationSid) {
    throw new Error("Unable to resolve Twilio outgoing application SID");
  }

  if (config.syncTwimlApp) {
    await applicationsApi(outgoingApplicationSid).update({
      voiceUrl,
      voiceMethod: "POST",
    });
  }

  return outgoingApplicationSid;
}

async function resolveCallerId(config, restClient) {
  let callerId = asText(config.callerId);

  if (!callerId && config.autoResolveCallerId) {
    const incomingNumbers = await restClient.incomingPhoneNumbers.list({ limit: 20 });
    const firstAvailable = incomingNumbers.find((entry) => asText(entry?.phoneNumber));
    callerId = asText(firstAvailable?.phoneNumber);
  }

  if (!callerId) {
    throw new Error("Missing TWILIO_CALLER_ID and no incoming phone number could be resolved automatically");
  }

  return callerId;
}

async function resolveTwilioRuntimeConfig(req, config) {
  const needsAppResolution = !asText(config.outgoingApplicationSid);
  const needsAppSync = Boolean(config.syncTwimlApp);
  const needsCallerResolution = !asText(config.callerId) && Boolean(config.autoResolveCallerId);
  const requiresRestClient = needsAppResolution || needsAppSync || needsCallerResolution;

  if (!requiresRestClient) {
    return {
      ...config,
      outgoingApplicationSid: asText(config.outgoingApplicationSid),
      callerId: asText(config.callerId),
    };
  }

  const cacheKey = twilioRuntimeCacheKey(req, config);
  if (
    twilioRuntimeCache.config
    && twilioRuntimeCache.key === cacheKey
    && Date.now() < twilioRuntimeCache.expiresAt
  ) {
    return twilioRuntimeCache.config;
  }

  if (!config.authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is required to resolve runtime Twilio voice configuration");
  }

  const restClient = twilio(config.accountSid, config.authToken);
  const outgoingApplicationSid = await resolveOutgoingTwimlAppSid(req, config, restClient);
  const callerId = await resolveCallerId(config, restClient);

  const resolvedConfig = {
    ...config,
    outgoingApplicationSid,
    callerId,
  };

  twilioRuntimeCache = {
    key: cacheKey,
    expiresAt: Date.now() + 5 * 60_000,
    config: resolvedConfig,
  };

  return resolvedConfig;
}

function createVoiceToken(config, identity) {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const accessToken = new AccessToken(config.accountSid, config.apiKey, config.apiSecret, {
    identity,
    ttl: 3600,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: config.outgoingApplicationSid,
    incomingAllow: false,
  });

  if (config.pushCredentialSid) {
    voiceGrant.pushCredentialSid = config.pushCredentialSid;
  }

  accessToken.addGrant(voiceGrant);
  return accessToken.toJwt();
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mode = toQueryValue(req.query?.mode).toLowerCase();
  if (mode === "call-webhook") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const webhookRateLimit = enforceRateLimit(req, res, {
      keyPrefix: "twilio-call-webhook",
      max: Number(process.env.RATE_LIMIT_TWILIO_WEBHOOK_MAX || 600),
      windowMs: Number(process.env.RATE_LIMIT_TWILIO_WEBHOOK_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    });
    if (!webhookRateLimit.allowed) {
      return res.status(429).json({ error: "Too many requests. Please retry later." });
    }

    return handleTwilioCallWebhook(req, res);
  }

  const hasAuthHeader = Boolean(asText(req.headers?.authorization));
  const twimlRequest = mode === "twiml" || (req.method === "POST" && !hasAuthHeader);

  let twimlServeConfig = null;

  if (twimlRequest) {
    try {
      const baseTwilioConfig = readTwilioConfig();
      const runtimeConfig = await resolveTwilioRuntimeConfig(req, baseTwilioConfig);
      twimlServeConfig = readTwiMLConfig({ callerId: runtimeConfig.callerId });
    } catch (error) {
      return res.status(503).json({ error: error?.message || "Twilio not configured" });
    }
  }

  if (!twimlRequest) {
    const rateLimit = enforceRateLimit(req, res, {
      keyPrefix: "twilio-access-token",
      max: Number(process.env.RATE_LIMIT_TWILIO_ACCESS_MAX || 30),
      windowMs: Number(process.env.RATE_LIMIT_TWILIO_ACCESS_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    });
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: "Too many requests. Please retry later." });
    }
  }

  const twimlHandled = await maybeServeTwiML(req, res, twimlServeConfig ? { twimlConfig: twimlServeConfig } : {});
  if (twimlHandled) return;

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let identity;
  try {
    const verified = await verifyIdentity(req, supabaseAdmin);
    identity = `dealmaker_${verified.userId}`;
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized token request" });
  }

  let twilioRuntimeConfig;
  try {
    const twilioConfig = readTwilioConfig();
    twilioRuntimeConfig = await resolveTwilioRuntimeConfig(req, twilioConfig);
  } catch (error) {
    return res.status(503).json({ error: error?.message || "Twilio not configured" });
  }

  try {
    const token = createVoiceToken(twilioRuntimeConfig, identity);
    return res.status(200).json({ token, identity });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to create Twilio token" });
  }
}
