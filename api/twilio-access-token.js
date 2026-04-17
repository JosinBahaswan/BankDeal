import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
  const pushCredentialSid = asText(process.env.TWILIO_PUSH_CREDENTIAL_SID);

  if (!accountSid || !apiKey || !apiSecret || !outgoingApplicationSid) {
    throw new Error("Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID");
  }

  return {
    accountSid,
    apiKey,
    apiSecret,
    outgoingApplicationSid,
    pushCredentialSid,
  };
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
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  let twilioConfig;
  try {
    twilioConfig = readTwilioConfig();
  } catch (error) {
    return res.status(503).json({ error: error?.message || "Twilio not configured" });
  }

  try {
    const token = createVoiceToken(twilioConfig, identity);
    return res.status(200).json({ token, identity });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to create Twilio token" });
  }
}
