const DEFERRED_ROUTE_LOADERS = {
  "contract-delivery-retry": () => import("../api_deferred/contract-delivery-retry.js"),
  "contracts-generate-pdf": () => import("../api_deferred/contracts-generate-pdf.js"),
  "contracts-signature-attestation": () => import("../api_deferred/contracts-signature-attestation.js"),
  "cslb-verify": () => import("../api_deferred/cslb-verify.js"),
  "get-client-ip": () => import("../api_deferred/get-client-ip.js"),
  "mobile-push-token": () => import("../api_deferred/mobile-push-token.js"),
  "notify-contract": () => import("../api_deferred/notify-contract.js"),
  "partner-referral-event": () => import("../api_deferred/partner-referral-event.js"),
  "property-intelligence": () => import("../api_deferred/property-intelligence.js"),
  "realtor-commission-review": () => import("../api_deferred/realtor-commission-review.js"),
  "title-portal-admin": () => import("../api_deferred/title-portal-admin.js"),
  "title-portal": () => import("../api_deferred/title-portal.js"),
};

const handlerCache = new Map();

function asRouteValue(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  if (value == null) return "";
  return String(value).trim();
}

function routeFromRequest(req) {
  const fromQuery = asRouteValue(req.query?.route).toLowerCase();
  if (fromQuery) return fromQuery;

  const requestUrl = String(req.url || "");
  const pathname = requestUrl.split("?")[0] || "";
  const prefix = "/api/deferred/";
  if (pathname.startsWith(prefix)) {
    return decodeURIComponent(pathname.slice(prefix.length)).toLowerCase();
  }

  return "";
}

async function resolveHandler(routeName) {
  const loadModule = DEFERRED_ROUTE_LOADERS[routeName];
  if (!loadModule) return null;

  if (handlerCache.has(routeName)) {
    return handlerCache.get(routeName);
  }

  const imported = await loadModule();
  const candidate = imported?.default;
  if (typeof candidate !== "function") {
    throw new Error(`Deferred route ${routeName} has no default handler`);
  }

  handlerCache.set(routeName, candidate);
  return candidate;
}

export default async function handler(req, res) {
  const routeName = routeFromRequest(req);
  if (!routeName) {
    return res.status(400).json({ error: "Missing deferred route" });
  }

  let routeHandler;
  try {
    routeHandler = await resolveHandler(routeName);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to load deferred route handler",
    });
  }

  if (!routeHandler) {
    return res.status(404).json({ error: "Deferred route not found" });
  }

  return routeHandler(req, res);
}
