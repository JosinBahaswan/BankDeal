import sgMail from "@sendgrid/mail";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import { createSupabaseAdminClient, verifyContractActor } from "../lib/server/contractsShared.js";
import { verifySendgridSetup } from "../lib/server/sendgridShared.js";

export default async function handler(req, res) {
  const cors = enforceCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type, Authorization, X-Dealbank-Service-Key, X-Service-Key" });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, { keyPrefix: "send-email", max: Number(process.env.RATE_LIMIT_SEND_EMAIL_MAX || 30), windowMs: Number(process.env.RATE_LIMIT_SEND_EMAIL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000) });
  if (!rateLimit.allowed) return res.status(429).json({ error: "Too many requests. Please retry later." });

  // Require auth in production or when explicitly configured
  const requireAuth = process.env.NODE_ENV === "production" || String(process.env.REQUIRE_SEND_EMAIL_AUTH || "").toLowerCase() === "true";
  if (requireAuth) {
    // Allow a server-to-server header secret as the first option
    const headerSecret = String(req.headers["x-dealbank-service-key"] || req.headers["x-service-key"] || "").trim();
    if (headerSecret && process.env.SERVICE_SECRET && headerSecret === process.env.SERVICE_SECRET) {
      // authorized
    } else {
      // fallback to Supabase bearer token auth
      let supabaseAdmin;
      try {
        supabaseAdmin = createSupabaseAdminClient();
        await verifyContractActor(req, supabaseAdmin);
      } catch (err) {
        return res.status(401).json({ error: err?.message || "Unauthorized" });
      }
    }
  }

  let apiKey, fromEmail;
  try {
    const cfg = verifySendgridSetup();
    apiKey = cfg.apiKey;
    fromEmail = cfg.fromEmail;
  } catch (err) {
    return res.status(500).json({ error: err?.message || "SendGrid configuration error" });
  }

  sgMail.setApiKey(apiKey);

  try {
    const body = req.method === "POST" ? (req.body || {}) : {};
    const { to, subject, body: emailBody, address, offer } = body;

    if (!to) {
      return res.status(400).json({ error: "Recipient email (to) is required" });
    }

    const msg = {
      to,
      from: fromEmail,
      subject: subject || `Purchase Offer for ${address || "your property"}`,
      text: emailBody || `Hello,\n\nI am interested in your property at ${address}. My cash offer is ${offer}.\n\nBest regards.`,
    };

    const [response] = await sgMail.send(msg);

    console.log(`Email sent via SendGrid: ${response.statusCode} to ${to}`);

    return res.status(200).json({ ok: true, id: response.headers["x-message-id"], status: response.statusCode });
  } catch (err) {
    console.error("send-email production error", err);
    return res.status(err?.code || 502).json({ error: err?.message || "SendGrid email failed", details: err.response?.body || {} });
  }
}
