import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

const PROVIDER = "realty-base-us";
const DEFAULT_HOST = "realty-base-us.p.rapidapi.com";
const DEFAULT_DETAIL_PATHS = ["/property/v2/detail", "/property/detail", "/detail"];

const KNOWN_COMP_PATHS = [
  "comps",
  "comparables",
  "comparableSales",
  "recentSales",
  "soldComparables",
  "soldHomes",
  "similarHomes",
  "nearbySold",
  "property.comps",
  "property.comparables",
  "data.comps",
  "data.comparables",
  "result.comps",
  "result.comparables",
  "payload.comps",
  "payload.comparables",
];

function asNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parsePathList(value, fallback) {
  const raw = asText(value);
  if (!raw) return fallback;

  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("/") ? item : `/${item}`));

  return parsed.length > 0 ? parsed : fallback;
}

function getByPath(source, path) {
  const input = asText(path);
  if (!input) return undefined;

  const segments = input.split(".");
  let current = source;

  for (const segment of segments) {
    if (!current || typeof current !== "object") return undefined;
    current = current[segment];
  }

  return current;
}

function firstString(candidates, fallback = "") {
  for (const candidate of candidates) {
    const text = asText(candidate);
    if (text) return text;
  }

  return fallback;
}

function firstNumber(candidates, fallback = null) {
  for (const candidate of candidates) {
    const number = asNumber(candidate, null);
    if (number !== null) return number;
  }

  return fallback;
}

function parseDate(value) {
  const text = asText(value);
  if (!text) return "";

  const asEpoch = asNumber(value, null);
  if (asEpoch !== null && asEpoch > 1_000_000_000) {
    const date = new Date(asEpoch > 99_999_999_999 ? asEpoch : asEpoch * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDaysOld(value) {
  const asDirect = asNumber(value, null);
  if (asDirect !== null) {
    return clamp(Math.round(asDirect), 0, 3650);
  }

  const iso = parseDate(value);
  if (!iso) return null;

  const thenMs = new Date(iso).getTime();
  const diffMs = Date.now() - thenMs;
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;

  return clamp(Math.round(diffMs / 86_400_000), 0, 3650);
}

function formatAddress(raw) {
  if (!raw || typeof raw !== "object") return "";

  const text = firstString([
    raw.address,
    raw.full_address,
    raw.formattedAddress,
    raw.formatted_address,
    raw.location,
    raw.street,
    raw.line,
    raw.line1,
    raw.unparsedAddress,
  ]);
  if (text) return text;

  const city = firstString([raw.city]);
  const state = firstString([raw.state, raw.state_code]);
  const zip = firstString([raw.zip, raw.zip_code, raw.postal_code]);

  return [city, state, zip].filter(Boolean).join(", ");
}

function normalizeComparable(raw, index) {
  const item = asObject(raw);
  if (!item) return null;

  const address = formatAddress(item);
  const price = firstNumber([
    item.price,
    item.sold_price,
    item.sale_price,
    item.close_price,
    item.last_sold_price,
    item.list_price,
    item.value,
  ], 0);

  if (!address || price <= 0) return null;

  const squareFootage = firstNumber([
    item.squareFootage,
    item.square_footage,
    item.sqft,
    item.livingArea,
    item.living_area,
    item.building_size,
  ], 0);

  const bedrooms = firstNumber([item.bedrooms, item.beds, item.bed], 0);
  const bathrooms = firstNumber([item.bathrooms, item.baths, item.bath], 0);

  const daysOld = toDaysOld(
    firstString([
      item.daysOld,
      item.days_old,
      item.daysAgo,
      item.days_ago,
      item.soldDate,
      item.sold_date,
      item.close_date,
    ]),
  );

  const distance = firstNumber([
    item.distance,
    item.distanceMiles,
    item.distance_miles,
    item.miles,
  ], null);

  return {
    address,
    price: Math.round(price),
    squareFootage: Math.max(0, Math.round(squareFootage || 0)),
    bedrooms: Math.max(0, Math.round(bedrooms || 0)),
    bathrooms: Math.max(0, Math.round(bathrooms || 0)),
    daysOld: daysOld ?? 30 + index * 14,
    distance: distance === null ? undefined : Number(distance.toFixed(2)),
  };
}

function discoverComparableArrays(node, found, seen, depth = 0) {
  if (!node || typeof node !== "object" || depth > 5) return;
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry))) {
      const sample = node[0];
      const keys = Object.keys(sample).join(" ").toLowerCase();
      const looksLikeComps =
        /(price|sale|sold|close)/.test(keys) &&
        /(address|street|city|zip|bed|bath|sq|distance)/.test(keys);

      if (looksLikeComps) found.push(node);
    }

    node.forEach((entry) => discoverComparableArrays(entry, found, seen, depth + 1));
    return;
  }

  Object.values(node).forEach((entry) => discoverComparableArrays(entry, found, seen, depth + 1));
}

function pickComparableArray(payload) {
  for (const path of KNOWN_COMP_PATHS) {
    const value = getByPath(payload, path);
    if (Array.isArray(value) && value.length > 0) return value;
  }

  const found = [];
  discoverComparableArrays(payload, found, new Set());
  return found[0] || [];
}

function normalizePropertyPayload(payload, lookupAddress) {
  const propertyNode = asObject(
    getByPath(payload, "property") || getByPath(payload, "data.property") || getByPath(payload, "result.property"),
  ) || payload;

  const property = {
    address: firstString([
      formatAddress(propertyNode),
      firstString([
        formatAddress(getByPath(payload, "property")),
        formatAddress(getByPath(payload, "result")),
      ]),
      lookupAddress,
    ]),
    bedrooms: Math.max(0, Math.round(firstNumber([
      propertyNode?.bedrooms,
      propertyNode?.beds,
      getByPath(payload, "bedrooms"),
      getByPath(payload, "beds"),
    ], 0))),
    bathrooms: Math.max(0, Math.round(firstNumber([
      propertyNode?.bathrooms,
      propertyNode?.baths,
      getByPath(payload, "bathrooms"),
      getByPath(payload, "baths"),
    ], 0))),
    squareFootage: Math.max(0, Math.round(firstNumber([
      propertyNode?.squareFootage,
      propertyNode?.square_footage,
      propertyNode?.sqft,
      propertyNode?.livingArea,
      propertyNode?.living_area,
      getByPath(payload, "squareFootage"),
      getByPath(payload, "sqft"),
    ], 0))),
    yearBuilt: Math.max(0, Math.round(firstNumber([
      propertyNode?.yearBuilt,
      propertyNode?.year_built,
      getByPath(payload, "yearBuilt"),
      getByPath(payload, "year_built"),
    ], 0))),
    propertyType: firstString([
      propertyNode?.propertyType,
      propertyNode?.property_type,
      propertyNode?.type,
      getByPath(payload, "propertyType"),
      getByPath(payload, "property_type"),
      "Single Family",
    ]),
    lotSize: Math.max(0, Math.round(firstNumber([
      propertyNode?.lotSize,
      propertyNode?.lot_size,
      getByPath(payload, "lotSize"),
      getByPath(payload, "lot_size"),
    ], 0))),
    lastSalePrice: Math.max(0, Math.round(firstNumber([
      propertyNode?.lastSalePrice,
      propertyNode?.last_sale_price,
      propertyNode?.soldPrice,
      propertyNode?.sold_price,
      getByPath(payload, "lastSalePrice"),
      getByPath(payload, "sold_price"),
    ], 0))),
    lastSaleDate: parseDate(firstString([
      propertyNode?.lastSaleDate,
      propertyNode?.last_sale_date,
      propertyNode?.soldDate,
      propertyNode?.sold_date,
      getByPath(payload, "lastSaleDate"),
      getByPath(payload, "sold_date"),
    ])),
  };

  const avmPrice = Math.round(firstNumber([
    getByPath(payload, "avm.price"),
    getByPath(payload, "avm.value"),
    getByPath(payload, "valuation.avm"),
    getByPath(payload, "valuation.estimate"),
    getByPath(payload, "estimate"),
    getByPath(payload, "estimated_value"),
    getByPath(payload, "estimatedValue"),
  ], 0));

  const avm = {
    price: Math.max(0, avmPrice),
    priceRangeLow: Math.max(0, Math.round(firstNumber([
      getByPath(payload, "avm.priceRangeLow"),
      getByPath(payload, "avm.low"),
      getByPath(payload, "valuation.low"),
      avmPrice > 0 ? avmPrice * 0.94 : 0,
    ], 0))),
    priceRangeHigh: Math.max(0, Math.round(firstNumber([
      getByPath(payload, "avm.priceRangeHigh"),
      getByPath(payload, "avm.high"),
      getByPath(payload, "valuation.high"),
      avmPrice > 0 ? avmPrice * 1.07 : 0,
    ], 0))),
  };

  const comps = pickComparableArray(payload)
    .map((entry, index) => normalizeComparable(entry, index))
    .filter(Boolean)
    .slice(0, 8);

  const marketNotes = firstString([
    getByPath(payload, "marketNotes"),
    getByPath(payload, "market_notes"),
    getByPath(payload, "market.summary"),
    getByPath(payload, "summary"),
    "Realty Base snapshot loaded. Verify condition adjustments and renovation scope before final offer.",
  ]);

  return { property, avm, comps, marketNotes };
}

function pruneForPrompt(value, depth = 0) {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > 220 ? `${value.slice(0, 220)}...` : value;
  }

  if (typeof value !== "object") return value;
  if (depth > 3) return "[truncated]";

  if (Array.isArray(value)) {
    return value.slice(0, 6).map((entry) => pruneForPrompt(entry, depth + 1));
  }

  const output = {};
  for (const [key, entry] of Object.entries(value).slice(0, 30)) {
    output[key] = pruneForPrompt(entry, depth + 1);
  }

  return output;
}

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDetailPayload({ host, apiKey, queryKey, address, pathCandidates }) {
  const attempts = [];

  for (const path of pathCandidates) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`https://${host}${cleanPath}`);
    url.searchParams.set(queryKey, address);

    try {
      const response = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": host,
        },
      });

      const rawText = await response.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        attempts.push({
          path: cleanPath,
          status: response.status,
          message: asText(payload?.message || payload?.error || rawText || response.statusText, "Upstream request failed"),
        });
        continue;
      }

      if (!payload || typeof payload !== "object") {
        attempts.push({
          path: cleanPath,
          status: 502,
          message: "Upstream response was not valid JSON",
        });
        continue;
      }

      return {
        path: cleanPath,
        payload,
        attempts,
      };
    } catch (error) {
      attempts.push({
        path: cleanPath,
        status: 0,
        message: asText(error?.message, "Network request failed"),
      });
    }
  }

  const err = new Error("Realty Base request failed for all configured detail paths.");
  err.attempts = attempts;
  throw err;
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "property-intelligence",
    max: Number(process.env.RATE_LIMIT_PROPERTY_INTELLIGENCE_MAX || 40),
    windowMs: Number(process.env.RATE_LIMIT_PROPERTY_INTELLIGENCE_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const address = asText(body.address);
  if (!address) {
    return res.status(400).json({ error: "address is required" });
  }

  const rapidApiKey = asText(process.env.RAPIDAPI_KEY_REALTY_BASE || process.env.RAPIDAPI_KEY);
  if (!rapidApiKey) {
    return res.status(503).json({
      error: "Server missing RAPIDAPI_KEY_REALTY_BASE (or RAPIDAPI_KEY) for Realty Base requests.",
    });
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
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const host = asText(process.env.RAPIDAPI_REALTY_BASE_HOST || process.env.REALTY_BASE_RAPIDAPI_HOST, DEFAULT_HOST);
  const queryKey = asText(process.env.RAPIDAPI_REALTY_BASE_QUERY_KEY || process.env.REALTY_BASE_QUERY_KEY, "query");
  const detailPaths = parsePathList(
    process.env.RAPIDAPI_REALTY_BASE_DETAIL_PATHS || process.env.REALTY_BASE_DETAIL_PATHS,
    DEFAULT_DETAIL_PATHS,
  );

  try {
    const detailResult = await fetchDetailPayload({
      host,
      apiKey: rapidApiKey,
      queryKey,
      address,
      pathCandidates: detailPaths,
    });

    const normalized = normalizePropertyPayload(detailResult.payload, address);
    const promptContext = {
      provider: PROVIDER,
      endpoint: detailResult.path,
      lookupAddress: address,
      normalized,
      payloadPreview: pruneForPrompt(detailResult.payload),
    };

    const hasCoreData =
      normalized.avm.price > 0 ||
      normalized.property.squareFootage > 0 ||
      normalized.comps.length > 0;

    return res.status(200).json({
      provider: PROVIDER,
      endpoint: detailResult.path,
      lookupAddress: address,
      normalized,
      promptContext,
      warning: hasCoreData
        ? ""
        : "Realty Base response returned limited structured fields. Fallback logic may still be required.",
      attempts: detailResult.attempts,
    });
  } catch (error) {
    return res.status(502).json({
      error: error?.message || "Failed to fetch property intelligence",
      attempts: Array.isArray(error?.attempts) ? error.attempts : [],
    });
  }
}
