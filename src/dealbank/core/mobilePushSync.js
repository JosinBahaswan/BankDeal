const PUSH_TOKEN_ENDPOINT = String(import.meta.env.VITE_PUSH_TOKEN_ENDPOINT || "/api/mobile-push-token").trim();

const PUSH_TOKEN_CACHE_KEY = "dealbank_push_token_payload";
const PUSH_TOKEN_SYNC_KEY = "dealbank_push_token_sync_state";
const SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function hasWindow() {
  return typeof window !== "undefined";
}

function readJsonStorage(key, fallback = null) {
  if (!hasWindow()) return fallback;

  const raw = asText(window.localStorage.getItem(key));
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (!hasWindow()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op: storage can fail in strict private mode.
  }
}

function normalizePlatform(value) {
  const normalized = asText(value, "unknown").toLowerCase();
  if (["ios", "android", "web"].includes(normalized)) return normalized;
  return "unknown";
}

export function resolvePushPlatform() {
  if (!hasWindow()) return "unknown";

  const capacitorPlatform = typeof window.Capacitor?.getPlatform === "function"
    ? normalizePlatform(window.Capacitor.getPlatform())
    : "";

  if (capacitorPlatform && capacitorPlatform !== "unknown") {
    return capacitorPlatform;
  }

  return "web";
}

function shouldSkipSync(payload, force = false) {
  if (force) return false;

  const state = readJsonStorage(PUSH_TOKEN_SYNC_KEY, {});
  const syncedToken = asText(state?.token);
  const syncedAt = Number(state?.syncedAt || 0);

  if (!syncedToken || !Number.isFinite(syncedAt) || syncedAt <= 0) {
    return false;
  }

  if (syncedToken !== payload.token) {
    return false;
  }

  return Date.now() - syncedAt < SYNC_COOLDOWN_MS;
}

function markSyncState(token) {
  writeJsonStorage(PUSH_TOKEN_SYNC_KEY, {
    token,
    syncedAt: Date.now(),
  });
}

export function cachePushToken(token, options = {}) {
  const normalizedToken = asText(token);
  if (!normalizedToken) return null;

  const payload = {
    token: normalizedToken,
    platform: normalizePlatform(options.platform || resolvePushPlatform()),
    appVersion: asText(options.appVersion),
    deviceId: asText(options.deviceId),
    updatedAt: new Date().toISOString(),
  };

  writeJsonStorage(PUSH_TOKEN_CACHE_KEY, payload);
  return payload;
}

export function readCachedPushToken() {
  const payload = readJsonStorage(PUSH_TOKEN_CACHE_KEY, null);
  if (!payload || !asText(payload.token)) return null;

  return {
    token: asText(payload.token),
    platform: normalizePlatform(payload.platform),
    appVersion: asText(payload.appVersion),
    deviceId: asText(payload.deviceId),
    updatedAt: asText(payload.updatedAt),
  };
}

export async function syncPushTokenToServer(input = {}) {
  const supabaseClient = input.supabaseClient;
  const payload = input.payload;
  const force = Boolean(input.force);

  if (!PUSH_TOKEN_ENDPOINT) {
    return { ok: false, reason: "endpoint_not_configured" };
  }

  if (!supabaseClient || !payload?.token) {
    return { ok: false, reason: "missing_input" };
  }

  if (shouldSkipSync(payload, force)) {
    return { ok: true, skipped: true, reason: "recently_synced" };
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    return { ok: false, reason: "missing_session" };
  }

  const response = await fetch(PUSH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token: payload.token,
      platform: payload.platform,
      appVersion: payload.appVersion,
      deviceId: payload.deviceId,
    }),
  });

  if (!response.ok) {
    const fallbackText = `Push token sync failed (${response.status})`;
    const text = await response.text().catch(() => "");

    try {
      const parsed = JSON.parse(text);
      throw new Error(asText(parsed?.error, fallbackText));
    } catch {
      throw new Error(asText(text, fallbackText));
    }
  }

  markSyncState(payload.token);
  return { ok: true };
}

export async function cacheAndSyncPushToken(input = {}) {
  const payload = cachePushToken(input.token, {
    platform: input.platform,
    appVersion: input.appVersion,
    deviceId: input.deviceId,
  });

  if (!payload) {
    return { ok: false, reason: "empty_token" };
  }

  return syncPushTokenToServer({
    supabaseClient: input.supabaseClient,
    payload,
    force: Boolean(input.force),
  });
}

export async function syncCachedPushToken(input = {}) {
  const payload = readCachedPushToken();
  if (!payload) {
    return { ok: false, reason: "no_cached_token" };
  }

  return syncPushTokenToServer({
    supabaseClient: input.supabaseClient,
    payload,
    force: Boolean(input.force),
  });
}
