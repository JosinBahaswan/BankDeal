import { createClient } from "@supabase/supabase-js";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Phone unavailable";
  return raw;
}

function firstAddressLine(address) {
  const text = asText(address, "Property");
  return text.split(",")[0] || "Property";
}

function clampLimit(rawLimit) {
  const limit = Math.floor(asNumber(rawLimit, 120));
  return Math.max(1, Math.min(200, limit));
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
  if (!token) {
    throw new Error("Missing bearer authorization token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error(error?.message || "Invalid Supabase auth token");
  }

  const userId = asText(data.user.id);
  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from("users")
    .select("id, type")
    .eq("id", userId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`Unable to resolve user profile: ${appUserError.message}`);
  }

  const userType = asText(appUser?.type || data.user?.user_metadata?.type).toLowerCase();
  if (!["dealmaker", "admin"].includes(userType)) {
    throw new Error("Only deal makers can pull production lead lists");
  }

  return {
    userId,
    userType,
  };
}

function mapListingToLeadCandidate(row, sellerById, filters) {
  const seller = sellerById.get(String(row?.seller_id || "")) || {};
  const sellerName = asText(seller?.name);
  const ownerName = sellerName || `Owner - ${firstAddressLine(row?.address)}`;

  const tags = [
    asText(filters.propertyType),
    asText(filters.listType),
    asText(row?.deal_type),
    asText(row?.condition),
    "Marketplace",
  ].filter(Boolean);

  return {
    listingId: row.id,
    name: ownerName,
    phone: normalizePhone(seller?.phone),
    address: asText(row?.address, "Address not provided"),
    equity: Number(row?.equity || 0),
    avm: Number(row?.arv || 0),
    status: "New",
    listType: asText(filters.listType, "High Equity"),
    tags,
    source: "marketplace_listing",
  };
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "lead-listings",
    max: Number(process.env.RATE_LIMIT_LEAD_LISTINGS_MAX || 60),
    windowMs: Number(process.env.RATE_LIMIT_LEAD_LISTINGS_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
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
    await verifyIdentity(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const cityFilter = asText(req.query?.city);
  const minEquity = Math.max(0, asNumber(req.query?.minEquity, 0));
  const listType = asText(req.query?.listType, "High Equity");
  const propertyType = asText(req.query?.propertyType, "Single Family");
  const limit = clampLimit(req.query?.limit);

  let listingQuery = supabaseAdmin
    .from("marketplace_listings")
    .select("id, seller_id, address, city, state, zip, arv, equity, deal_type, condition, status")
    .eq("status", "active")
    .gte("equity", minEquity)
    .order("equity", { ascending: false })
    .limit(limit);

  if (cityFilter) {
    listingQuery = listingQuery.ilike("city", `%${cityFilter}%`);
  }

  const { data: listingRows, error: listingError } = await listingQuery;
  if (listingError) {
    return res.status(502).json({
      error: `Failed to load marketplace lead candidates: ${listingError.message}`,
    });
  }

  const sellerIds = Array.from(new Set((listingRows || []).map((row) => String(row.seller_id || "")).filter(Boolean)));
  let sellerById = new Map();

  if (sellerIds.length > 0) {
    const { data: sellerRows, error: sellerError } = await supabaseAdmin
      .from("users")
      .select("id, name, phone")
      .in("id", sellerIds);

    if (sellerError) {
      return res.status(502).json({
        error: `Failed to load seller contacts: ${sellerError.message}`,
      });
    }

    sellerById = new Map((sellerRows || []).map((row) => [String(row.id), row]));
  }

  const filters = {
    listType,
    propertyType,
  };

  const candidates = (listingRows || []).map((row) => mapListingToLeadCandidate(row, sellerById, filters));

  return res.status(200).json({
    count: candidates.length,
    candidates,
  });
}
