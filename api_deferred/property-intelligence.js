import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

const PROVIDER = "realty-base-us";
const DEFAULT_HOST = "realty-base-us.p.rapidapi.com";
const DEFAULT_QUERY_KEYS = ["query", "address", "propertyAddress", "property_address", "location", "q"];
const DEFAULT_AUTOCOMPLETE_PATHS = ["/property/auto-complete", "/property/autocomplete"];
const DEFAULT_AUTOCOMPLETE_QUERY_KEYS = ["query", "q", "address"];
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

function parseKeyList(value, fallback) {
  const raw = asText(value);
  if (!raw) return fallback;

  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

function dedupeTextList(values, max = 12) {
  const seen = new Set();
  const output = [];

  for (const value of values || []) {
    const text = asText(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= max) break;
  }

  return output;
}

function isLikelyPropertyId(value) {
  return /^\d{6,}$/.test(asText(value));
}

function buildInitialLookupCandidates(lookupAddress) {
  const input = asText(lookupAddress);
  if (!input) return [];

  if (/^https?:\/\//i.test(input)) {
    return [input];
  }

  if (/^address:\d{6,}$/i.test(input)) {
    const propertyId = input.replace(/^address:/i, "");
    return dedupeTextList([input, propertyId]);
  }

  if (isLikelyPropertyId(input)) {
    return dedupeTextList([`address:${input}`, input]);
  }

  return [input];
}

function discoverObjectArrays(node, found, seen, depth = 0) {
  if (!node || typeof node !== "object" || depth > 4) return;
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry))) {
      found.push(node);
    }

    node.forEach((entry) => discoverObjectArrays(entry, found, seen, depth + 1));
    return;
  }

  Object.values(node).forEach((entry) => discoverObjectArrays(entry, found, seen, depth + 1));
}

function extractAutocompleteEntries(payload) {
  const directCandidates = [
    getByPath(payload, "data"),
    getByPath(payload, "result"),
    getByPath(payload, "results"),
    getByPath(payload, "payload.data"),
    getByPath(payload, "properties"),
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  const discovered = [];
  discoverObjectArrays(payload, discovered, new Set());

  for (const entryArray of discovered) {
    const sample = asObject(entryArray[0]);
    if (!sample) continue;

    const sampleKeys = Object.keys(sample).join(" ").toLowerCase();
    const looksLikeAutocomplete =
      /(propertyid|property_id|full_address|area_type|url|address|id)/.test(sampleKeys);

    if (looksLikeAutocomplete) return entryArray;
  }

  return [];
}

function extractLookupCandidatesFromAutocomplete(payload, fallbackAddress) {
  const entries = extractAutocompleteEntries(payload);
  if (!entries.length) return [];

  const rankedEntries = entries
    .filter((row) => {
      const areaType = asText(row?.area_type || row?.areaType).toLowerCase();
      if (!areaType) return true;
      return areaType.includes("address") || areaType.includes("property");
    })
    .slice(0, 6);

  const candidates = [asText(fallbackAddress)];

  rankedEntries.forEach((row) => {
    const propertyId = firstString([
      row?.propertyId,
      row?.property_id,
      row?.property?.propertyId,
      row?.property?.property_id,
    ]);

    const fullAddress = firstString([
      row?.full_address,
      row?.address,
      row?.formattedAddress,
      row?.formatted_address,
      row?.name,
    ]);

    const url = firstString([row?.url, row?.href, row?.permalink]);

    if (isLikelyPropertyId(propertyId)) {
      candidates.push(`address:${propertyId}`);
      candidates.push(propertyId);
    }

    if (fullAddress) candidates.push(fullAddress);
    if (/^https?:\/\//i.test(url)) candidates.push(url);
  });

  return dedupeTextList(candidates);
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

function hasCoreNormalizedData(normalized) {
  const property = normalized?.property || {};
  const avm = normalized?.avm || {};
  const comps = Array.isArray(normalized?.comps) ? normalized.comps : [];

  const propertyHasCoreFields =
    Number(property.squareFootage || 0) > 0 ||
    Number(property.bedrooms || 0) > 0 ||
    Number(property.bathrooms || 0) > 0 ||
    Number(property.yearBuilt || 0) > 0;

  const avmHasCoreFields =
    Number(avm.price || 0) > 0 ||
    Number(avm.priceRangeHigh || 0) > 0;

  return propertyHasCoreFields || avmHasCoreFields || comps.length > 0;
}

function buildFallbackIntelligence(lookupAddress, warning, attempts = []) {
  const normalized = {
    property: {
      address: asText(lookupAddress),
      bedrooms: 0,
      bathrooms: 0,
      squareFootage: 0,
      yearBuilt: 0,
      propertyType: "Unknown",
      lotSize: 0,
      lastSalePrice: 0,
      lastSaleDate: "",
    },
    avm: {
      price: 0,
      priceRangeLow: 0,
      priceRangeHigh: 0,
    },
    comps: [],
    marketNotes: asText(
      warning,
      "External property provider unavailable. Continue underwriting with manual comps or Claude-backed estimates.",
    ),
  };

  return {
    provider: PROVIDER,
    endpoint: "fallback",
    lookupAddress: asText(lookupAddress),
    normalized,
    promptContext: {
      provider: PROVIDER,
      endpoint: "fallback",
      lookupAddress: asText(lookupAddress),
      normalized,
      warning: asText(warning),
    },
    warning: asText(
      warning,
      "External property provider unavailable. Continue underwriting with manual comps or Claude-backed estimates.",
    ),
    attempts: Array.isArray(attempts) ? attempts : [],
  };
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

async function fetchAutocompleteLookupCandidates({
  host,
  apiKey,
  lookupAddress,
  pathCandidates,
  queryKeys,
}) {
  const attempts = [];

  for (const path of pathCandidates) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    for (const queryKey of queryKeys) {
      const cleanQueryKey = asText(queryKey);
      if (!cleanQueryKey) continue;

      const url = new URL(`https://${host}${cleanPath}`);
      url.searchParams.set(cleanQueryKey, lookupAddress);

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
            stage: "autocomplete",
            path: cleanPath,
            queryKey: cleanQueryKey,
            status: response.status,
            message: asText(payload?.message || payload?.error || rawText || response.statusText, "Auto-complete request failed"),
          });
          continue;
        }

        if (!payload || typeof payload !== "object") {
          attempts.push({
            stage: "autocomplete",
            path: cleanPath,
            queryKey: cleanQueryKey,
            status: 502,
            message: "Auto-complete response was not valid JSON",
          });
          continue;
        }

        const candidates = extractLookupCandidatesFromAutocomplete(payload, lookupAddress);
        if (candidates.length > 0) {
          return {
            candidates,
            attempts,
          };
        }

        attempts.push({
          stage: "autocomplete",
          path: cleanPath,
          queryKey: cleanQueryKey,
          status: 200,
          message: "Auto-complete returned no address candidates",
        });
      } catch (error) {
        attempts.push({
          stage: "autocomplete",
          path: cleanPath,
          queryKey: cleanQueryKey,
          status: 0,
          message: asText(error?.message, "Auto-complete request failed"),
        });
      }
    }
  }

  return {
    candidates: dedupeTextList([lookupAddress]),
    attempts,
  };
}

async function fetchDetailPayload({ host, apiKey, queryKeys, lookupAddress, queryValues, pathCandidates }) {
  const attempts = [];

  for (const path of pathCandidates) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    for (const queryValue of queryValues) {
      const cleanQueryValue = asText(queryValue);
      if (!cleanQueryValue) continue;

      for (const queryKey of queryKeys) {
      const cleanQueryKey = asText(queryKey);
      if (!cleanQueryKey) continue;

      const url = new URL(`https://${host}${cleanPath}`);
      url.searchParams.set(cleanQueryKey, cleanQueryValue);

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
            queryKey: cleanQueryKey,
            queryValue: cleanQueryValue.slice(0, 120),
            status: response.status,
            message: asText(payload?.message || payload?.error || rawText || response.statusText, "Upstream request failed"),
          });
          continue;
        }

        if (!payload || typeof payload !== "object") {
          attempts.push({
            path: cleanPath,
            queryKey: cleanQueryKey,
            queryValue: cleanQueryValue.slice(0, 120),
            status: 502,
            message: "Upstream response was not valid JSON",
          });
          continue;
        }

        const normalized = normalizePropertyPayload(payload, lookupAddress);
        if (!hasCoreNormalizedData(normalized)) {
          attempts.push({
            path: cleanPath,
            queryKey: cleanQueryKey,
            queryValue: cleanQueryValue.slice(0, 120),
            status: 200,
            message: "Response returned limited structured fields",
          });
          continue;
        }

        return {
          path: cleanPath,
          queryKey: cleanQueryKey,
          queryValue: cleanQueryValue,
          payload,
          normalized,
          attempts,
        };
      } catch (error) {
        attempts.push({
          path: cleanPath,
          queryKey: cleanQueryKey,
          queryValue: cleanQueryValue.slice(0, 120),
          status: 0,
          message: asText(error?.message, "Network request failed"),
        });
      }
      }
    }
  }

  const err = new Error("Realty Base request failed for all configured detail query combinations.");
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

  const rapidApiKey = asText(process.env.RAPIDAPI_KEY_REALTY_BASE || process.env.RAPIDAPI_KEY);
  if (!rapidApiKey) {
    return res.status(200).json(
      buildFallbackIntelligence(
        address,
        "RAPIDAPI key is not configured. Returning fallback context so Claude/manual underwriting can continue.",
      ),
    );
  }

  const host = asText(process.env.RAPIDAPI_REALTY_BASE_HOST || process.env.REALTY_BASE_RAPIDAPI_HOST, DEFAULT_HOST);
  const queryKeys = parseKeyList(
    process.env.RAPIDAPI_REALTY_BASE_QUERY_KEYS || process.env.REALTY_BASE_QUERY_KEYS,
    [asText(process.env.RAPIDAPI_REALTY_BASE_QUERY_KEY || process.env.REALTY_BASE_QUERY_KEY, "query"), ...DEFAULT_QUERY_KEYS],
  );
  const autoCompletePaths = parsePathList(
    process.env.RAPIDAPI_REALTY_BASE_AUTOCOMPLETE_PATHS || process.env.REALTY_BASE_AUTOCOMPLETE_PATHS,
    DEFAULT_AUTOCOMPLETE_PATHS,
  );
  const autoCompleteQueryKeys = parseKeyList(
    process.env.RAPIDAPI_REALTY_BASE_AUTOCOMPLETE_QUERY_KEYS || process.env.REALTY_BASE_AUTOCOMPLETE_QUERY_KEYS,
    DEFAULT_AUTOCOMPLETE_QUERY_KEYS,
  );
  const detailPaths = parsePathList(
    process.env.RAPIDAPI_REALTY_BASE_DETAIL_PATHS || process.env.REALTY_BASE_DETAIL_PATHS,
    DEFAULT_DETAIL_PATHS,
  );

  const preflightAttempts = [];
  let queryValues = buildInitialLookupCandidates(address);

  if (!/^https?:\/\//i.test(address) && autoCompletePaths.length > 0) {
    const autoComplete = await fetchAutocompleteLookupCandidates({
      host,
      apiKey: rapidApiKey,
      lookupAddress: address,
      pathCandidates: autoCompletePaths,
      queryKeys: autoCompleteQueryKeys,
    });

    queryValues = dedupeTextList([...(queryValues || []), ...(autoComplete?.candidates || [])]);
    if (Array.isArray(autoComplete?.attempts) && autoComplete.attempts.length > 0) {
      preflightAttempts.push(...autoComplete.attempts);
    }
  }

  try {
    const detailResult = await fetchDetailPayload({
      host,
      apiKey: rapidApiKey,
      queryKeys,
      lookupAddress: address,
      queryValues,
      pathCandidates: detailPaths,
    });

    const normalized = detailResult.normalized || normalizePropertyPayload(detailResult.payload, address);
    const promptContext = {
      provider: PROVIDER,
      endpoint: detailResult.path,
      queryKey: detailResult.queryKey,
      queryValue: detailResult.queryValue,
      lookupAddress: address,
      normalized,
      payloadPreview: pruneForPrompt(detailResult.payload),
    };

    return res.status(200).json({
      provider: PROVIDER,
      endpoint: detailResult.path,
      queryKey: detailResult.queryKey,
      queryValue: detailResult.queryValue,
      lookupAddress: address,
      normalized,
      promptContext,
      warning: "",
      attempts: [...preflightAttempts, ...detailResult.attempts],
    });
  } catch (error) {
    const fallbackWarning = asText(error?.message, "Failed to fetch property intelligence");
    const attempts = [
      ...preflightAttempts,
      ...(Array.isArray(error?.attempts) ? error.attempts : []),
    ];

    return res.status(200).json(
      buildFallbackIntelligence(
        address,
        `${fallbackWarning} Using fallback context so Claude/manual underwriting can continue.`,
        attempts,
      ),
    );
  }
}
