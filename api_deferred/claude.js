import { createClient } from "@supabase/supabase-js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEMO_STREETS = ["Maple St", "Oak Ave", "Pine Dr", "Cedar Ln", "Willow Ct"];

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

function isTruthyEnv(value) {
  const normalized = asText(value).toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashText(value) {
  const input = String(value || "");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function inferAddress(prompt) {
  const quoted = String(prompt || "").match(/for\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1].trim();

  const propertyLine = String(prompt || "").match(/property:\s*([^|\n]+)/i);
  if (propertyLine?.[1]) return propertyLine[1].trim();

  return "123 Demo St, USA";
}

function buildPropertyLookupDemo(prompt) {
  const seed = hashText(prompt);
  const address = inferAddress(prompt);

  const bedrooms = clamp(2 + (seed % 4), 2, 5);
  const bathrooms = clamp(1 + ((seed >> 3) % 3), 1, 4);
  const squareFootage = clamp(1200 + (seed % 1400), 900, 3800);
  const yearBuilt = clamp(1975 + (seed % 43), 1950, 2023);
  const lotSize = clamp(Math.round(squareFootage * 3.2), 3000, 12000);
  const lastSalePrice = clamp(220000 + (seed % 220000), 140000, 900000);
  const avmPrice = Math.round(lastSalePrice * 1.28);

  const comps = Array.from({ length: 3 }).map((_, idx) => {
    const compSeed = hashText(`${prompt}-${idx}`);
    const compSqft = clamp(squareFootage + ((compSeed % 240) - 120), 900, 4000);
    return {
      address: `${100 + idx * 7} ${DEMO_STREETS[idx % DEMO_STREETS.length]}`,
      price: Math.round(avmPrice * (0.95 + (idx * 0.025))),
      squareFootage: compSqft,
      bedrooms,
      bathrooms,
      daysOld: 18 + idx * 19,
      distance: Number((0.3 + idx * 0.35).toFixed(1)),
    };
  });

  return {
    property: {
      address,
      bedrooms,
      bathrooms,
      squareFootage,
      yearBuilt,
      propertyType: "Single Family",
      lotSize,
      lastSalePrice,
      lastSaleDate: "2021-06-15",
    },
    avm: {
      price: avmPrice,
      priceRangeLow: Math.round(avmPrice * 0.94),
      priceRangeHigh: Math.round(avmPrice * 1.07),
    },
    comps,
    marketNotes: "Demo mode response: nearby sold inventory remains tight, while renovated homes still command a premium over as-is condition.",
  };
}

function buildRenoDemo(prompt) {
  const sqftMatch = String(prompt || "").match(/(\d{3,5})\s*sqft/i);
  const squareFootage = clamp(Number.parseInt(sqftMatch?.[1] || "1500", 10), 900, 4500);
  const multiplier = squareFootage / 1500;
  const scale = (base) => Math.round(base * multiplier);

  return {
    roof: scale(9000),
    foundation: scale(5000),
    hvac: scale(6000),
    plumbing: scale(4500),
    electrical: scale(5000),
    kitchen: scale(22000),
    bathrooms: scale(14000),
    flooring: scale(9000),
    paint: scale(6500),
    windows: scale(5000),
    landscaping: scale(3000),
    misc: scale(8000),
    notes: "Demo mode estimate: numbers are illustrative and should be replaced with contractor bids for live underwriting.",
  };
}

function buildAnalysisDemo(prompt) {
  const address = inferAddress(prompt);
  return [
    "1. DEAL VERDICT",
    `This is a workable demo flip candidate for ${address} if inspection confirms no major structural surprises.`,
    "",
    "2. OFFER PRICE",
    "Stay disciplined at or below your modeled offer, then negotiate credits if roof, HVAC, or foundation scope grows during due diligence.",
    "",
    "3. ARV CHECK",
    "Use 3-5 truly renovated comps within 1-2 miles and sold inside 90 days; avoid over-weighting pending listings.",
    "",
    "4. RENO FLAGS",
    "Kitchen and bath line items are usually where demo budgets drift; pad 10-15% contingency for permits and change orders.",
    "",
    "5. TOP 3 RISKS",
    "1) Underestimated rehab scope",
    "2) ARV compression from slower buyer demand",
    "3) Longer hold period that raises financing carry",
    "",
    "6. BOTTOM LINE",
    "Demo mode summary: proceed only with inspection and contractor validation, and keep exit margin protected before signing.",
  ].join("\n");
}

function buildPitchDemo(prompt) {
  const address = inferAddress(prompt);
  return [
    `Hello, and thank you for considering an offer on ${address}. We are a local cash-buying team that focuses on simple, respectful transactions and works on the timeline that is best for you.`,
    "",
    "Based on nearby renovated sales, your home has strong upside after full updates. Our offer reflects what renovated homes can sell for, then backs out renovation, financing, and resale costs required to complete the project responsibly.",
    "",
    "This is not a lowball strategy; it is a math-based as-is valuation. We underwrite repairs, holding costs, resale fees, and a risk-adjusted margin so we can close with certainty and avoid retrading later.",
    "",
    "If you decide to move forward, we can close quickly, purchase as-is, and keep the process straightforward with clear communication at every step.\n\n[Investor Name]\nCash Offers LLC\n[Phone]\n[Email]",
  ].join("\n");
}

function buildDemoClaudeResponse(prompt) {
  const lowerPrompt = String(prompt || "").toLowerCase();

  if (lowerPrompt.includes("return only raw json") && lowerPrompt.includes('"property"')) {
    return JSON.stringify(buildPropertyLookupDemo(prompt));
  }

  if (lowerPrompt.includes("fix-and-flip cost estimator") && lowerPrompt.includes('"roof"')) {
    return JSON.stringify(buildRenoDemo(prompt));
  }

  if (lowerPrompt.includes("senior fix-and-flip analyst")) {
    return buildAnalysisDemo(prompt);
  }

  if (lowerPrompt.includes("cash offer letter")) {
    return buildPitchDemo(prompt);
  }

  return "Demo mode active: AI response generated locally. Add ANTHROPIC_API_KEY for live Claude output.";
}

function sanitizeClaudeText(text) {
  if (!text || typeof text !== "string") return text;
  // Remove common emoji ranges
  try {
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}]/gu, "");
  } catch {
    // fall back if regex with u flag unsupported
    text = text.replace(/[\u2600-\u26FF\u2700-\u27BF]/g, "");
  }

  // Convert simple pipe-based table rows into bullet lines
  if (text.includes("|")) {
    const lines = text.split(/\r?\n/);
    const transformed = lines.map((ln) => {
      if (ln.includes("|")) {
        const cols = ln
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        if (cols.length === 0) return "";
        return `- ${cols.join(" · ")}`;
      }
      return ln;
    });
    text = transformed.join("\n");
  }

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
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

  const apiKey = asText(process.env.ANTHROPIC_API_KEY);
  const forceDemoMode = isTruthyEnv(process.env.CLAUDE_DEMO_MODE);

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  const requestedTokens = toInt(req.body?.maxTokens, 1400);
  const maxTokens = Math.min(Math.max(requestedTokens, 200), 4096);

  if (forceDemoMode) {
    const raw = buildDemoClaudeResponse(prompt);
    const text = sanitizeClaudeText(raw);
    return res.status(200).json({
      text,
      demo: true,
      provider: "mock-claude",
      reason: "CLAUDE_DEMO_MODE enabled",
    });
  }

  if (!apiKey) {
    return res.status(500).json({ 
      error: "ANTHROPIC_API_KEY is missing in server environment. Please add it to your Vercel/Environment variables.",
      demo: false 
    });
  }

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

    const textRaw = Array.isArray(payload?.content)
      ? payload.content.map((item) => item?.text || "").join("")
      : "";
    const text = sanitizeClaudeText(textRaw);
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Claude proxy request failed" });
  }
}
