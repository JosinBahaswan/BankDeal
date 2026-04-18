import { createClient } from "@supabase/supabase-js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
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

async function verifyRequestIdentity(req, supabaseAdmin) {
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

  return {
    userId: asText(data.user.id),
    email: asText(data.user.email).toLowerCase(),
  };
}

function toInt(value, fallback) {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return fallback;
  return num;
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ipRateLimit = enforceRateLimit(req, res, {
    keyPrefix: "claude-ip",
    max: Number(process.env.RATE_LIMIT_CLAUDE_IP_MAX || process.env.RATE_LIMIT_CLAUDE_MAX || 60),
    windowMs: Number(process.env.RATE_LIMIT_CLAUDE_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!ipRateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let identity;
  try {
    identity = await verifyRequestIdentity(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const userRateLimit = enforceRateLimit(req, res, {
    keyPrefix: "claude-user",
    max: Number(process.env.RATE_LIMIT_CLAUDE_USER_MAX || process.env.RATE_LIMIT_CLAUDE_MAX || 20),
    windowMs: Number(process.env.RATE_LIMIT_CLAUDE_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    keyResolver: () => identity?.userId || identity?.email,
  });
  if (!userRateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  const requestedTokens = toInt(req.body?.maxTokens, 1400);
  const maxTokens = Math.min(Math.max(requestedTokens, 200), 4096);

  try {
    const anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const payload = await anthropicResponse.json().catch(() => null);

    if (!anthropicResponse.ok) {
      const message = payload?.error?.message || `Anthropic API ${anthropicResponse.status}`;
      return res.status(anthropicResponse.status).json({ error: message });
    }

    const text = Array.isArray(payload?.content)
      ? payload.content.map((item) => item?.text || "").join("")
      : "";

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Claude proxy request failed" });
  }
}
