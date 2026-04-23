import twilio from "twilio";
import { createSupabaseAdminClient, verifyContractActor, asText, jsonBody } from "../lib/server/contractsShared.js";

export default async function handler(req, res) {
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
    } catch (e) {
      // proceed without actor if token missing/invalid
      actor = null;
    }
  } catch (e) {
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

    // Initiate the call with simple TwiML connecting to target number
    const call = await client.calls.create({
      twiml: `<Response><Say>Connecting you to the homeowner for ${address || "the property"}. Please wait.</Say><Dial>${toNumber}</Dial></Response>`,
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
