/* global process */

import { createClient } from "@supabase/supabase-js";

const APP_USER_TYPES = new Set(["dealmaker", "contractor", "realtor", "admin"]);

export function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

export function asEmail(value, fallback = "") {
  const normalized = asText(value).toLowerCase();
  if (!normalized) return fallback;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : fallback;
}

export function normalizePem(value) {
  const raw = asText(value);
  if (!raw) return "";
  return raw.replace(/\\n/g, "\n");
}

export function jsonBody(req) {
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

export function parseBearerToken(req) {
  const authHeader = asText(req?.headers?.authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

export function createSupabaseAdminClient() {
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

export function createSupabaseUserClient(accessToken) {
  const supabaseUrl = asText(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const anonKey = asText(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !anonKey) {
    throw new Error("Server is missing SUPABASE_URL and/or SUPABASE_ANON_KEY");
  }

  const token = asText(accessToken);
  if (!token) {
    throw new Error("Missing access token for user-scoped Supabase client");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function normalizeUserType(value) {
  const normalized = asText(value).toLowerCase();
  return APP_USER_TYPES.has(normalized) ? normalized : "";
}

export async function verifyContractActor(req, supabaseAdmin, options = {}) {
  const allowedTypes = Array.isArray(options.allowedTypes)
    ? options.allowedTypes.map((entry) => asText(entry).toLowerCase()).filter(Boolean)
    : [];

  const token = parseBearerToken(req);
  if (!token) {
    throw new Error("Missing bearer authorization token");
  }

  const { data: authResult, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authResult?.user) {
    throw new Error(authError?.message || "Invalid Supabase auth token");
  }

  const authUser = authResult.user;
  const userId = asText(authUser.id);

  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, type, name, email")
    .eq("id", userId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user profile: ${appUserError.message}`);
  }

  const userType = normalizeUserType(appUser?.type || authUser?.user_metadata?.type);
  if (!userType) {
    throw new Error("Unable to resolve application user role");
  }

  const isAdmin = userType === "admin";
  if (!isAdmin && allowedTypes.length > 0 && !allowedTypes.includes(userType)) {
    throw new Error("Authenticated user role is not allowed for this action");
  }

  return {
    token,
    userId,
    userType,
    isAdmin,
    email: asEmail(appUser?.email || authUser?.email),
    name: asText(appUser?.name || authUser?.user_metadata?.name),
  };
}

function firstForwardedIp(value) {
  const raw = asText(value);
  if (!raw) return "";
  return raw.split(",")[0].trim();
}

function stripIpPort(ip) {
  const raw = asText(ip);
  if (!raw) return "";

  // Keep IPv6 literals intact.
  if (raw.includes(":")) {
    if (raw.startsWith("::ffff:")) return raw.slice(7);
    const hasSingleColon = raw.indexOf(":") === raw.lastIndexOf(":");
    if (hasSingleColon) {
      const [host] = raw.split(":");
      return host;
    }
    return raw;
  }

  return raw;
}

export function resolveClientIp(req) {
  const headerCandidates = [
    req?.headers?.["x-forwarded-for"],
    req?.headers?.["x-vercel-forwarded-for"],
    req?.headers?.["x-real-ip"],
    req?.headers?.["cf-connecting-ip"],
  ];

  for (const candidate of headerCandidates) {
    const ip = stripIpPort(firstForwardedIp(candidate));
    if (ip) return ip;
  }

  return stripIpPort(asText(req?.socket?.remoteAddress || req?.connection?.remoteAddress));
}

export function safePath(pathLike, fallback = "/") {
  const path = asText(pathLike);
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.includes("//")) return fallback;
  return path;
}

export function appBaseUrl(req) {
  const forwardedProto = asText(req.headers?.["x-forwarded-proto"], "https");
  const forwardedHost = asText(req.headers?.["x-forwarded-host"] || req.headers?.host);
  const forwardedBase = forwardedHost ? `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "") : "";

  const configured = asText(process.env.APP_URL).replace(/\/$/, "");
  if (configured) {
    let configuredHost = "";
    try {
      configuredHost = new URL(configured).hostname.toLowerCase();
    } catch {
      configuredHost = "";
    }

    const forwardedHostName = forwardedHost.split(":")[0].toLowerCase();
    const configuredIsLocal = ["localhost", "127.0.0.1", "::1"].includes(configuredHost);
    const forwardedIsLocal = ["localhost", "127.0.0.1", "::1"].includes(forwardedHostName);

    if (configuredIsLocal && forwardedHost && !forwardedIsLocal) {
      return forwardedBase || configured;
    }

    return configured;
  }

  const vercelHost = asText(process.env.VERCEL_URL);
  if (vercelHost) return `https://${vercelHost}`.replace(/\/$/, "");

  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");

  return "http://localhost:5173";
}
