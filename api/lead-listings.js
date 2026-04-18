import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  createSupabaseUserClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

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

function estimateCreditCost(candidateCount) {
  const count = Math.max(0, Number(candidateCount || 0));
  if (count === 0) return 0;
  return Math.max(1, Math.ceil(count * 1.2));
}

async function consumeCreditsForPull({ actor, creditsRequired }) {
  if (creditsRequired <= 0) {
    return { consumed: 0, remaining: null };
  }

  const userScopedClient = createSupabaseUserClient(actor.token);
  const { data, error } = await userScopedClient
    .rpc("consume_data_credits", { p_credits: creditsRequired });

  if (error) {
    const message = asText(error.message).toLowerCase();
    if (message.includes("insufficient")) {
      const err = new Error(error.message || "Insufficient data credits");
      err.code = "insufficient_credits";
      throw err;
    }

    throw new Error(error.message || "Failed to consume data credits");
  }

  return {
    consumed: Number(data?.[0]?.consumed || creditsRequired),
    remaining: Number(data?.[0]?.remaining),
  };
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin, {
      allowedTypes: ["dealmaker"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const cityFilter = asText(body.city);
  const minEquity = Math.max(0, asNumber(body.minEquity, 0));
  const listType = asText(body.listType, "High Equity");
  const propertyType = asText(body.propertyType, "Single Family");
  const limit = clampLimit(body.limit);

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
  const creditsRequired = estimateCreditCost(candidates.length);

  let creditResult;
  try {
    creditResult = await consumeCreditsForPull({
      actor,
      creditsRequired,
    });
  } catch (error) {
    if (error?.code === "insufficient_credits") {
      return res.status(402).json({
        error: error.message || "Insufficient data credits",
        creditsRequired,
      });
    }

    return res.status(500).json({
      error: error?.message || "Failed to consume data credits",
    });
  }

  await supabaseAdmin
    .from("lead_pull_audit_logs")
    .insert({
      user_id: actor.userId,
      candidate_count: candidates.length,
      credits_consumed: Number(creditResult?.consumed || creditsRequired),
      credits_remaining: Number(creditResult?.remaining || 0),
      filters: {
        city: cityFilter,
        minEquity,
        listType,
        propertyType,
        limit,
      },
    });

  return res.status(200).json({
    count: candidates.length,
    creditsRequired,
    creditsConsumed: Number(creditResult?.consumed || creditsRequired),
    creditsRemaining: Number.isFinite(Number(creditResult?.remaining)) ? Number(creditResult.remaining) : null,
    candidates,
  });
}
