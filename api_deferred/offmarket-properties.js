/**
 * offmarket-properties.js
 *
 * Production-ready proxy for off-market property search.
 *
 * Priority chain:
 *   1. BatchData  (BATCHDATA_API_KEY)              — preferred, richest data
 *   2. Legacy BatchLeads (BATCH_API_KEY / BATCHLEADS_API_KEY) — secondary
 *   3. Realty Base US via RapidAPI                 — fallback when BatchData absent
 *      Uses RAPIDAPI_KEY_REALTY_US or RAPIDAPI_KEY
 *
 * When using Realty Base US fallback:
 *   - Calls GET /properties/search-buy  → get listing list
 *   - Calls GET /properties/detail      → extract agent phones from advertisers[]
 *   - Sets agentPhoneUnavailable: true  on properties with no phone found
 */

import { enforceRateLimit } from "../lib/server/httpSecurity.js";

const REALTY_US_HOST = "realty-us.p.rapidapi.com";
const REALTY_US_SEARCH_PATH = "/properties/search-buy";
const REALTY_US_DETAIL_PATH = "/properties/detail";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function asText(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function firstString(candidates, fallback = "") {
  for (const c of candidates) {
    const t = asText(c);
    if (t) return t;
  }
  return fallback;
}

function firstNumber(candidates, fallback = 0) {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return fallback;
}

async function fetchWithTimeout(url, opts, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Simple in-memory cache for Realty US detail responses to reduce RapidAPI calls
const REALTY_US_DETAIL_CACHE_TTL_MS = Number(process.env.REALTY_US_DETAIL_CACHE_TTL_MS || 60 * 60 * 1000);
const REALTY_US_DETAIL_CACHE = new Map();

function getRealtyDetailCache(pid) {
  const entry = REALTY_US_DETAIL_CACHE.get(pid);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    REALTY_US_DETAIL_CACHE.delete(pid);
    return null;
  }
  return entry.value;
}

function setRealtyDetailCache(pid, value) {
  try {
    REALTY_US_DETAIL_CACHE.set(pid, { value, expires: Date.now() + REALTY_US_DETAIL_CACHE_TTL_MS });
  } catch{
    // ignore cache failures
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Realty Base US — search listings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map the PropertiesTab filter label to a Realty Base US propertyType value.
 */
function mapFilterToRealtyUsPropertyType(listType) {
  const t = String(listType || "").toLowerCase();
  if (t.includes("multi")) return "multi_family";
  if (t.includes("condo")) return "condo";
  if (t.includes("land")) return "land";
  return "single_family_home"; // default
}

/**
 * Build a location string accepted by /properties/search-buy.
 * Falls back to a broad US-wide city if no specific location given.
 */
function buildLocationParam(body) {
  const city = asText(body.city || body.location || body.search || "");
  if (!city) return "city:New York, NY";

  // If already formatted as "city:..." pass as-is
  if (/^(city|zip|address|state):/i.test(city)) return city;

  // Assume it's a plain city name
  return `city:${city}`;
}

async function realtyUsSearchBuy({ apiKey, body }) {
  const url = new URL(`https://${REALTY_US_HOST}${REALTY_US_SEARCH_PATH}`);
  url.searchParams.set("location", buildLocationParam(body));
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("resultsPerPage", "20");

  const propertyType = mapFilterToRealtyUsPropertyType(body.listType || body.filter || "");
  if (propertyType) url.searchParams.set("propertyType", propertyType);

  const resp = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": REALTY_US_HOST,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Realty Base US search failed (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  // Results live at data.results
  const results = Array.isArray(json?.data?.results)
    ? json.data.results
    : Array.isArray(json?.results)
    ? json.results
    : [];

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Realty Base US — property detail (for agent phone)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the first available agent phone number from a /properties/detail response.
 * The response has:
 *   data.advertisers[].phones[].number
 *   data.advertisers[].phones[].type   ("mobile" | "landline" | ...)
 */
function extractAgentPhoneFromDetail(detail) {
  const advertisers = Array.isArray(detail?.data?.advertisers)
    ? detail.data.advertisers
    : [];

  for (const advertiser of advertisers) {
    const phones = Array.isArray(advertiser?.phones) ? advertiser.phones : [];
    // Prefer mobile, then any
    const mobile = phones.find((p) => asText(p?.type).toLowerCase() === "mobile");
    const first = phones[0];
    const phoneEntry = mobile || first;
    const number = asText(phoneEntry?.number);
    if (number) {
      return {
        phone: number,
        agentName: asText(advertiser?.name),
        agentEmail: asText(advertiser?.email),
        phoneType: asText(phoneEntry?.type, "phone"),
      };
    }
  }

  return null; // no phone found
}

/**
 * Extract agent info directly from a search-buy result entry.
 * Some results may already carry basic advertiser data.
 */
function extractAgentPhoneFromSearchResult(result) {
  const advertisers = Array.isArray(result?.advertisers)
    ? result.advertisers
    : [];
  for (const adv of advertisers) {
    const phones = Array.isArray(adv?.phones) ? adv.phones : [];
    const mobile = phones.find((p) => asText(p?.type).toLowerCase() === "mobile");
    const first = phones[0];
    const phoneEntry = mobile || first;
    const number = asText(phoneEntry?.number);
    if (number) {
      return {
        phone: number,
        agentName: asText(adv?.name),
        agentEmail: asText(adv?.email),
        phoneType: asText(phoneEntry?.type, "phone"),
      };
    }
  }
  return null;
}

async function realtyUsPropertyDetail({ apiKey, propertyId, listingId }) {
  const pid = asText(propertyId);
  if (!pid) return null;

  const cached = getRealtyDetailCache(pid);
  if (cached) return cached;

  const url = new URL(`https://${REALTY_US_HOST}${REALTY_US_DETAIL_PATH}`);
  url.searchParams.set("propertyId", pid);
  if (listingId) url.searchParams.set("listingId", listingId);

  const resp = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": REALTY_US_HOST,
      "Content-Type": "application/json",
    },
  }, 10000);

  if (!resp.ok) return null;
  const json = await resp.json().catch(() => null);
  if (json) setRealtyDetailCache(pid, json);
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalise a Realty Base US search result entry
// ─────────────────────────────────────────────────────────────────────────────

function normalizeRealtyUsResult(result, agentInfo) {
  // Address
  const loc = result?.location || {};
  const addr = loc?.address || {};
  const addressLine = firstString([
    addr.line,
    addr.street,
    result?.address?.line,
    result?.address,
    "Unknown Address",
  ]);
  const city = firstString([addr.city, loc.city, ""]);
  const stateCode = firstString([addr.state_code, addr.state, loc.state_code, ""]);
  const zip = firstString([addr.postal_code, addr.zip, ""]);
  const fullAddress = city
    ? `${addressLine}, ${city}, ${stateCode} ${zip}`.replace(/,\s*,/g, ",").trim()
    : addressLine;

  // Price / equity
  const listPrice = firstNumber([
    result?.list_price,
    result?.price,
    result?.list_price_min,
  ], 0);
  const lastSoldPrice = firstNumber([result?.last_sold_price], 0);
  const estimatedEquity = lastSoldPrice > 0 && listPrice > lastSoldPrice
    ? listPrice - lastSoldPrice
    : listPrice;

  // Property basics
  const desc = result?.description || {};
  const beds = firstNumber([desc.beds, desc.beds_min, result?.beds], 0);
  const baths = firstNumber([desc.baths, desc.baths_min, result?.baths], 0);
  const sqft = firstNumber([desc.sqft, desc.sqft_min, result?.sqft], 0);
  const propertyType = firstString([
    desc.type,
    result?.property_type,
    "Single Family",
  ]);

  // Status badge
  const status = asText(result?.status, "For Sale");
  const listType = status === "for_sale"
    ? "For Sale"
    : status === "sold"
    ? "Recently Sold"
    : status || "Listed";

  // Photos
  const photos = Array.isArray(result?.photos) ? result.photos : [];
  const photoUrl = asText(photos[0]?.href || photos[0]?.url, "");

  return {
    id: asText(result?.property_id || result?.listing_id, Math.random().toString(36).slice(2, 9)),
    propertyId: asText(result?.property_id, ""),
    listingId: asText(result?.listing_id, ""),
    address: fullAddress,
    listPrice,
    estimatedEquity,
    beds,
    baths,
    sqft,
    propertyType,
    listType,
    photoUrl,
    lastSoldPrice,
    lastSoldDate: asText(result?.last_sold_date, ""),
    // Owner / agent from BatchData shape compat
    ownerName: agentInfo?.agentName || "",
    ownerPhone: agentInfo?.phone || "",
    ownerEmail: agentInfo?.agentEmail || "",
    // Realty Base agent extras
    agentName: agentInfo?.agentName || "",
    agentPhone: agentInfo?.phone || "",
    agentEmail: agentInfo?.agentEmail || "",
    agentPhoneType: agentInfo?.phoneType || "",
    // Flag for frontend modal
    agentPhoneUnavailable: !agentInfo?.phone,
    // Provider tag
    provider: "realty-us",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Realty Base US properties with agent phone enrichment
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRealtyUsProperties({ apiKey, body }) {
  const results = await realtyUsSearchBuy({ apiKey, body });
  if (!results.length) {
    return { properties: [], provider: "realty-us", message: "No listings found for this location/filter." };
  }

  // Cap at 12 to limit API calls
  const slice = results.slice(0, 12);

  // First try extracting agent phone directly from search results
  // (some listings already include advertiser data)
  const needDetail = [];
  const agentInfoMap = {};

  for (const r of slice) {
    const pid = asText(r?.property_id);
    const inlineAgent = extractAgentPhoneFromSearchResult(r);
    if (inlineAgent) {
      agentInfoMap[pid] = inlineAgent;
    } else if (pid) {
      needDetail.push(r);
    }
  }

  // Fetch detail for those missing phone — bounded concurrency 3
  const CONCURRENCY = 3;
  for (let i = 0; i < needDetail.length; i += CONCURRENCY) {
    const batch = needDetail.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (r) => {
        const pid = asText(r?.property_id);
        const lid = asText(r?.listing_id);
        if (!pid) return;
        try {
          const detail = await realtyUsPropertyDetail({ apiKey, propertyId: pid, listingId: lid });
          const agentInfo = extractAgentPhoneFromDetail(detail);
          agentInfoMap[pid] = agentInfo || null; // null means "tried, not found"
        } catch {
          agentInfoMap[pid] = null;
        }
      })
    );
  }

  const properties = slice.map((r) => {
    const pid = asText(r?.property_id);
    const agentInfo = agentInfoMap[pid] ?? null;
    return normalizeRealtyUsResult(r, agentInfo);
  });

  return { properties, provider: "realty-us" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const batchDataKey = process.env.BATCHDATA_API_KEY || "";
  const legacyKey = process.env.BATCH_API_KEY || process.env.BATCHLEADS_API_KEY || "";
  const realtyUsKey =
    process.env.RAPIDAPI_KEY_REALTY_US ||
    process.env.RAPIDAPI_KEY_REALTY_BASE ||
    process.env.RAPIDAPI_KEY ||
    "";

  const body =
    req.method === "POST"
      ? req.body || {}
      : req.query || {};

  const rateLimit = await enforceRateLimit(req, res, {
    keyPrefix: "offmarket-properties",
    max: Number(process.env.RATE_LIMIT_OFFMARKET_MAX || 40),
    windowMs: Number(process.env.RATE_LIMIT_OFFMARKET_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  // Simple filter mapping for BatchData
  const listType = String(body.listType || body.filter || body.list || "").trim();
  const filters = {};
  if (/vacant/i.test(listType)) filters.vacant = true;
  if (/foreclos/i.test(listType)) filters.foreclosure = true;
  if (/tax/i.test(listType)) filters.taxDelinquent = true;
  if (/absentee/i.test(listType)) filters.absenteeOwner = true;
  if (/pre-?foreclos/i.test(listType)) filters.preForeclosure = true;
  if (/high equity/i.test(listType)) filters.highEquity = true;
  if (/probate/i.test(listType)) filters.probate = true;

  const includeOwnerContacts =
    body.includeOwnerContacts === true ||
    String(process.env.BATCHDATA_AUTO_SKIPTRACE || "").toLowerCase() === "true";

  // ── 1. Try BatchData ─────────────────────────────────────────────────────

  if (batchDataKey) {
    try {
      const url = "https://api.batchdata.com/api/v1/property/search";
      const requestPayload = {
        requests: [
          {
            query: String(body.search || body.query || "").trim(),
            propertyType: String(body.propertyType || "").trim() || undefined,
            marketValueRange: body.marketValueRange || undefined,
            filters: Object.keys(filters).length ? filters : undefined,
          },
        ].filter(Boolean),
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${batchDataKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }

      if (!resp.ok) {
        throw new Error(data?.message || `BatchData responded ${resp.status}`);
      }

      const results = Array.isArray(data?.results) ? data.results : data?.data || [];

      const normalized = results.map((p) => ({
        id: p.property_id || p.id || Math.random().toString(36).slice(2, 9),
        propertyId: asText(p.property_id || p.id),
        address:
          (p.address &&
            (p.address.formatted_address || p.address.street_address)) ||
          p.address ||
          p.formatted_address ||
          "Unknown Address",
        ownerName: (p.owner && (p.owner.name || p.owner_name)) || "",
        ownerPhone: (p.owner && p.owner.phone) || (p.phones && p.phones[0]?.number) || "",
        ownerEmail: (p.owner && p.owner.email) || (p.emails && p.emails[0]?.address) || "",
        agentPhone: "",
        agentName: "",
        agentEmail: "",
        agentPhoneUnavailable: false,
        estimatedEquity: p.equity_estimate || p.estimated_value || p.estimated_equity || 0,
        propertyType: p.property_type || p.characteristics?.property_type || "Single Family",
        listType: p.list_type || listType || "Off-market",
        provider: "batchdata",
      }));

      // Optional skip-trace for missing contact info
      if (includeOwnerContacts && normalized.length > 0) {
        const toTrace = normalized.filter((r) => (!r.ownerPhone || !r.ownerEmail) && r.ownerName);
        const concurrency = Number(process.env.BATCHDATA_SKIPTRACE_CONCURRENCY || 3);
        for (let i = 0; i < toTrace.length; i += concurrency) {
          const batch = toTrace.slice(i, i + concurrency);
          await Promise.all(
            batch.map(async (entry) => {
              try {
                const names = String(entry.ownerName || "").split(/\s+/).filter(Boolean);
                const first = names[0] || "";
                const last = names.length > 1 ? names.slice(1).join(" ") : "";
                const traceBody = {
                  requests: [{ address: { raw: entry.address }, owner: { first_name: first, last_name: last } }],
                };
                const traceResp = await fetch("https://api.batchdata.com/api/v3/property/skip-trace", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${batchDataKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify(traceBody),
                });
                const traceData = await traceResp.json();
                const match = (traceData?.results || [])[0] || null;
                if (match) {
                  entry.ownerPhone = entry.ownerPhone || (match.phones && match.phones[0]?.number) || entry.ownerPhone;
                  entry.ownerEmail = entry.ownerEmail || (match.emails && match.emails[0]?.address) || entry.ownerEmail;
                }
              } catch (e) {
                console.warn("skip-trace failed for", entry.id, e?.message || e);
              }
            })
          );
        }
      }

      return res.status(200).json({ properties: normalized, provider: "batchdata" });
    } catch (batchErr) {
      console.warn("[offmarket-properties] BatchData failed, trying fallbacks:", batchErr?.message);
      // Fall through to legacy / Realty Base US
    }
  }

  // ── 2. Try Legacy BatchLeads ──────────────────────────────────────────────

  if (legacyKey) {
    try {
      const url = new URL("https://api.batchleads.io/v2/properties");
      if (listType) url.searchParams.set("list_type", listType);
      if (body.search) url.searchParams.set("q", String(body.search));

      const respLegacy = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${legacyKey}`, Accept: "application/json" },
      });

      const legacyData = await respLegacy.json();
      if (!respLegacy.ok) {
        throw new Error(legacyData?.message || `Legacy Batch responded ${respLegacy.status}`);
      }

      const normalizedLegacy = (legacyData.data || []).map((p) => ({
        id: p.id || Math.random().toString(36).substr(2, 9),
        propertyId: asText(p.id),
        address: p.formatted_address || p.address || "Unknown Address",
        ownerName: p.owner_name || (p.owners && p.owners[0]?.name) || "",
        ownerPhone: p.owner_phone || (p.owners && p.owners[0]?.phone) || "",
        ownerEmail: p.owner_email || (p.owners && p.owners[0]?.email) || "",
        agentPhone: "",
        agentName: "",
        agentEmail: "",
        agentPhoneUnavailable: false,
        estimatedEquity: p.estimated_equity || p.equity || 0,
        propertyType: p.property_type || "Single Family",
        listType: p.list_type || listType || "Off-market",
        provider: "batchleads",
      }));

      return res.status(200).json({ properties: normalizedLegacy, provider: "batchleads" });
    } catch (legacyErr) {
      console.warn("[offmarket-properties] Legacy BatchLeads failed:", legacyErr?.message);
      // Fall through to Realty Base US
    }
  }

  // ── 3. Fallback: Realty Base US via RapidAPI ──────────────────────────────

  if (realtyUsKey) {
    try {
      const result = await fetchRealtyUsProperties({ apiKey: realtyUsKey, body });
      return res.status(200).json({
        properties: result.properties,
        provider: result.provider,
        message: result.message || "",
      });
    } catch (realtyErr) {
      console.error("[offmarket-properties] Realty Base US fallback failed:", realtyErr?.message);
      return res.status(502).json({
        error: "All property data providers are currently unavailable.",
        detail: realtyErr?.message,
        properties: [],
      });
    }
  }

  // ── 4. No provider configured ─────────────────────────────────────────────

  return res.status(200).json({
    properties: [],
    provider: "none",
    message:
      "No property data provider configured. Set BATCHDATA_API_KEY or RAPIDAPI_KEY_REALTY_US in your environment.",
  });
}
