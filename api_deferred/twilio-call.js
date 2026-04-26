import twilio from "twilio";
import { createSupabaseAdminClient, verifyContractActor, asText, jsonBody } from "../lib/server/contractsShared.js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

export default async function handler(req, res) {
  const cors = enforceCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type, Authorization" });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "twilio-call",
    max: Number(process.env.RATE_LIMIT_TWILIO_CALL_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_TWILIO_CALL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_CALLER_ID;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({
      error: "Twilio configuration missing (SID, Token, or From Number). Please check Vercel environment variables.",
    });
  }

  let supabaseAdmin = null;
  let actor = null;
    try {
      supabaseAdmin = createSupabaseAdminClient();
      try {
        actor = await verifyContractActor(req, supabaseAdmin);
      } catch {
        // proceed without actor if token missing/invalid
        actor = null;
      }
    } catch {
      // Supabase admin client not configured — continue without DB logging
      supabaseAdmin = null;
    }

  try {
    const body = req.method === "POST" ? (req.body || jsonBody(req) || {}) : {};
    const toNumber = asText(body.phone || body.to || "");
    const address = asText(body.address || "");
    const ownerName = asText(body.ownerName || body.owner || "");

    if (!toNumber) {
      return res.status(400).json({ error: "Destination phone number is required" });
    }

    const client = twilio(accountSid, authToken);

    // Build a public TwiML URL instead of sending inline TwiML. This allows
    // Twilio to fetch TwiML from a publicly reachable HTTPS endpoint and keeps
    // call wiring centralized in the TwiML handler (`/api/twilio-access-token?mode=twiml`).
    const twimlPath = process.env.TWILIO_TWIML_VOICE_URL || "/api/twilio-access-token?mode=twiml";

    const configuredBase = String(process.env.APP_URL || "").replace(/\/$/, "");
    const vercelHost = String(process.env.VERCEL_URL || "").trim();
    const inferredProto = req.headers?.["x-forwarded-proto"] || "https";
    const inferredHost = req.headers?.["x-forwarded-host"] || req.headers?.host;

    const baseUrl = configuredBase || (vercelHost ? `https://${vercelHost}` : (inferredHost ? `${inferredProto}://${inferredHost}` : "http://localhost:5173"));

    let voiceUrl = twimlPath;
    if (!/^https?:\/\//i.test(voiceUrl)) {
      const prefix = twimlPath.startsWith("/") ? "" : "/";
      voiceUrl = `${baseUrl}${prefix}${twimlPath}`;
    }

    const voiceUrlObj = new URL(voiceUrl);
    voiceUrlObj.searchParams.set("To", toNumber);
    if (ownerName) voiceUrlObj.searchParams.set("LeadName", ownerName);
    if (address) voiceUrlObj.searchParams.set("LeadAddress", address);
    if (actor && actor.userId) voiceUrlObj.searchParams.set("caller_id", actor.userId);

    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
    if (isProd) {
      if (voiceUrlObj.protocol !== "https:") {
        return res.status(400).json({ error: "TwiML voice URL must be public HTTPS in production. Configure APP_URL and TWILIO_TWIML_VOICE_URL accordingly." });
      }
      const host = String(voiceUrlObj.hostname || "").toLowerCase();
      if (["localhost", "127.0.0.1"].includes(host)) {
        return res.status(400).json({ error: "TwiML voice URL cannot be localhost in production." });
      }
    }

    const call = await client.calls.create({
      url: voiceUrlObj.toString(),
      to: toNumber,
      from: fromNumber,
    });

    // Persist call log if Supabase admin client is available and actor resolved
    try {
      if (supabaseAdmin && actor && actor.userId) {
        await supabaseAdmin.from("call_logs").insert([
          {
            caller_id: actor.userId,
            lead_name: ownerName || address || "Homeowner",
            phone: toNumber,
            address: address,
            outcome: call.status || null,
            notes: `Twilio SID: ${call.sid}`,
            duration_sec: call.duration ? Number(call.duration) : null,
            called_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (dbErr) {
      console.warn("Failed to persist call log", dbErr?.message || dbErr);
    }

    console.log(`Twilio call initiated: ${call.sid} for address: ${address}`);

    return res.status(200).json({
      ok: true,
      sid: call.sid,
      status: call.status,
      message: `Call initiated to ${toNumber}`,
    });
  } catch (err) {
    console.error("twilio-call production error", err);
    return res.status(502).json({
      error: err.message || "Twilio call failed",
      code: err.code,
    });
  }
}
