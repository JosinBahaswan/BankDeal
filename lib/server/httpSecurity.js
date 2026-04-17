/* global process */

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function normalizeOrigin(value) {
  const raw = asText(value);
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function parseCommaSeparatedOrigins(value) {
  const raw = asText(value);
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);
}

function envOrigin(envName) {
  const raw = asText(process.env[envName]);
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return normalizeOrigin(raw);
  }

  return normalizeOrigin(`https://${raw}`);
}

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export function allowedCorsOrigins() {
  const origins = new Set();

  const appUrl = normalizeOrigin(process.env.APP_URL);
  const siteUrl = normalizeOrigin(process.env.VITE_SITE_URL);
  const vercelOrigin = envOrigin("VERCEL_URL");

  if (appUrl) origins.add(appUrl);
  if (siteUrl) origins.add(siteUrl);
  if (vercelOrigin) origins.add(vercelOrigin);

  parseCommaSeparatedOrigins(process.env.CORS_ALLOWED_ORIGINS).forEach((origin) => {
    origins.add(origin);
  });

  const nodeEnv = asText(process.env.NODE_ENV, "development").toLowerCase();
  if (nodeEnv !== "production") {
    DEV_ORIGINS.forEach((origin) => origins.add(origin));
  }

  return origins;
}

export function setCorsHeaders(req, res, options = {}) {
  const methods = asText(options.methods, "POST, OPTIONS");
  const headers = asText(options.headers, "Content-Type, Authorization");
  const maxAge = Number(options.maxAge || 86400);

  const requestOrigin = normalizeOrigin(req?.headers?.origin);
  const allowlist = allowedCorsOrigins();
  const originAllowed = !requestOrigin || allowlist.has(requestOrigin);

  if (requestOrigin && originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);

  if (Number.isFinite(maxAge) && maxAge > 0) {
    res.setHeader("Access-Control-Max-Age", String(Math.floor(maxAge)));
  }

  return {
    requestOrigin,
    originAllowed,
  };
}

export function enforceCors(req, res, options = {}) {
  const corsState = setCorsHeaders(req, res, options);

  if (req.method === "OPTIONS") {
    if (!corsState.originAllowed) {
      res.status(403).json({ error: "CORS origin is not allowed" });
      return { handled: true, allowed: false };
    }

    res.status(204).end();
    return { handled: true, allowed: true };
  }

  if (!corsState.originAllowed) {
    res.status(403).json({ error: "CORS origin is not allowed" });
    return { handled: true, allowed: false };
  }

  return { handled: false, allowed: true };
}

function firstForwardedIp(value) {
  const raw = asText(value);
  if (!raw) return "";
  return raw.split(",")[0].trim();
}

function resolveClientIp(req) {
  const headerCandidates = [
    req?.headers?.["x-forwarded-for"],
    req?.headers?.["x-vercel-forwarded-for"],
    req?.headers?.["x-real-ip"],
    req?.headers?.["cf-connecting-ip"],
  ];

  for (const candidate of headerCandidates) {
    const ip = firstForwardedIp(candidate);
    if (ip) return ip;
  }

  return asText(req?.socket?.remoteAddress || req?.connection?.remoteAddress);
}

const RATE_LIMIT_STORE = new Map();
let rateLimitCleanupAt = 0;

function cleanupRateLimitStore(now) {
  const shouldCleanup = RATE_LIMIT_STORE.size > 1500 || now - rateLimitCleanupAt >= 60_000;
  if (!shouldCleanup) return;

  for (const [key, bucket] of RATE_LIMIT_STORE.entries()) {
    if (!bucket || now >= bucket.resetAt) {
      RATE_LIMIT_STORE.delete(key);
    }
  }

  rateLimitCleanupAt = now;
}

export function enforceRateLimit(req, res, options = {}) {
  const windowMs = Math.max(1_000, Number(options.windowMs || process.env.RATE_LIMIT_WINDOW_MS || 60_000));
  const max = Math.max(1, Number(options.max || process.env.RATE_LIMIT_MAX || 60));
  const keyPrefix = asText(options.keyPrefix, "global");

  const resolvedKey = typeof options.keyResolver === "function"
    ? asText(options.keyResolver(req))
    : "";
  const fallbackIp = resolveClientIp(req) || "unknown";
  const key = `${keyPrefix}:${resolvedKey || fallbackIp}`;

  const now = Date.now();
  cleanupRateLimitStore(now);

  let bucket = RATE_LIMIT_STORE.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  bucket.count += 1;
  RATE_LIMIT_STORE.set(key, bucket);

  const remaining = Math.max(0, max - bucket.count);

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSec));
    return {
      allowed: false,
      retryAfterSec,
    };
  }

  return {
    allowed: true,
    retryAfterSec: 0,
  };
}
