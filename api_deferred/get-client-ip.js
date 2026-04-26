import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  createSupabaseAdminClient,
  resolveClientIp,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "get-client-ip",
    max: Number(process.env.RATE_LIMIT_CLIENT_IP_MAX || 120),
    windowMs: Number(process.env.RATE_LIMIT_CLIENT_IP_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  try {
    await verifyContractActor(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  const ip = resolveClientIp(req);
  return res.status(200).json({ ip: ip || "" });
}
