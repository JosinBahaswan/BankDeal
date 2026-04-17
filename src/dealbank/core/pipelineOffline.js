const CACHE_PREFIX = "dealbank:pipeline:cache:";
const QUEUE_PREFIX = "dealbank:pipeline:queue:";
const MAX_QUEUE_ITEMS = 250;

function hasWindowStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function cacheKey(userId) {
  return `${CACHE_PREFIX}${String(userId || "")}`;
}

function queueKey(userId) {
  return `${QUEUE_PREFIX}${String(userId || "")}`;
}

function parseJson(rawValue, fallback) {
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function readStorageEnvelope(key, fallback) {
  if (!hasWindowStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return parseJson(raw, fallback);
  } catch {
    return fallback;
  }
}

function writeStorageEnvelope(key, value) {
  if (!hasWindowStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function toQueueItem(operation) {
  return {
    id: String(operation?.id || `queue-${Date.now()}-${Math.floor(Math.random() * 100000)}`),
    type: String(operation?.type || "").trim(),
    dealId: String(operation?.dealId || "").trim(),
    localId: String(operation?.localId || "").trim(),
    stage: String(operation?.stage || "").trim(),
    payload: operation?.payload && typeof operation.payload === "object" ? operation.payload : {},
    createdAt: String(operation?.createdAt || new Date().toISOString()),
  };
}

function isNetworkLikeError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("failed to fetch")
    || message.includes("network")
    || message.includes("offline")
    || message.includes("fetch failed")
    || message.includes("network request failed");
}

export function isLikelyOffline() {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

export function readCachedPipeline(userId) {
  if (!userId) return [];

  const envelope = readStorageEnvelope(cacheKey(userId), null);
  const deals = Array.isArray(envelope?.deals) ? envelope.deals : [];
  return deals;
}

export function writeCachedPipeline(userId, deals) {
  if (!userId) return;

  const normalizedDeals = Array.isArray(deals) ? deals : [];
  writeStorageEnvelope(cacheKey(userId), {
    version: 1,
    updatedAt: new Date().toISOString(),
    deals: normalizedDeals,
  });
}

export function readPipelineQueue(userId) {
  if (!userId) return [];

  const envelope = readStorageEnvelope(queueKey(userId), null);
  return Array.isArray(envelope?.items) ? envelope.items : [];
}

function writePipelineQueue(userId, items) {
  if (!userId) return;

  const nextItems = Array.isArray(items) ? items.slice(0, MAX_QUEUE_ITEMS) : [];
  writeStorageEnvelope(queueKey(userId), {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: nextItems,
  });
}

export function queuePipelineOperation(userId, operation) {
  if (!userId) return null;

  const item = toQueueItem(operation);
  const queue = readPipelineQueue(userId);
  queue.push(item);

  const trimmedQueue = queue.length > MAX_QUEUE_ITEMS
    ? queue.slice(queue.length - MAX_QUEUE_ITEMS)
    : queue;

  writePipelineQueue(userId, trimmedQueue);
  return item;
}

function resolveDealId(rawDealId, idMap) {
  const normalized = String(rawDealId || "").trim();
  if (!normalized) return "";
  return String(idMap.get(normalized) || normalized);
}

async function applyQueuedOperation({ supabase, userId, operation, idMap }) {
  const type = String(operation?.type || "").trim();

  if (type === "insert") {
    const dbRow = operation?.payload?.dbRow;
    if (!dbRow || typeof dbRow !== "object") {
      return { skipped: true };
    }

    const { data, error } = await supabase
      .from("deals")
      .insert(dbRow)
      .select("id")
      .single();

    if (error) throw error;

    const localId = String(operation?.localId || operation?.payload?.localId || "").trim();
    const remoteId = String(data?.id || "").trim();

    if (localId && remoteId) {
      idMap.set(localId, remoteId);
    }

    return { remoteId };
  }

  if (type === "update-stage") {
    const dealId = resolveDealId(operation?.dealId, idMap);
    const stage = String(operation?.stage || operation?.payload?.stage || "").trim();

    if (!dealId || !stage) {
      return { skipped: true };
    }

    const { error } = await supabase
      .from("deals")
      .update({ stage })
      .eq("id", dealId)
      .eq("user_id", userId);

    if (error) throw error;

    return { remoteId: dealId };
  }

  if (type === "delete") {
    const dealId = resolveDealId(operation?.dealId, idMap);

    if (!dealId) {
      return { skipped: true };
    }

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("user_id", userId);

    if (error) throw error;

    return { remoteId: dealId };
  }

  return { skipped: true };
}

export async function flushPipelineQueue({ userId, supabase }) {
  const queue = readPipelineQueue(userId);
  if (!queue.length) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const idMap = new Map();
  const remaining = [];
  let processed = 0;
  let failed = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const operation = queue[index];

    try {
      await applyQueuedOperation({
        supabase,
        userId,
        operation,
        idMap,
      });
      processed += 1;
    } catch (error) {
      failed += 1;
      remaining.push(operation);

      if (isNetworkLikeError(error)) {
        for (let tailIndex = index + 1; tailIndex < queue.length; tailIndex += 1) {
          remaining.push(queue[tailIndex]);
        }
        break;
      }
    }
  }

  writePipelineQueue(userId, remaining);
  return {
    processed,
    failed,
    remaining: remaining.length,
  };
}

export function isPipelineNetworkError(error) {
  return isNetworkLikeError(error);
}
