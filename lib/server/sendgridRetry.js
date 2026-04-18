function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function nextRetryDelayMs(attemptCount, baseDelayMs, maxDelayMs) {
  const attempts = Math.max(1, Number(attemptCount) || 1);
  const base = Math.max(200, Number(baseDelayMs) || 750);
  const max = Math.max(base, Number(maxDelayMs) || 30_000);
  const expo = Math.min(max, base * (2 ** Math.max(0, attempts - 1)));
  const jitter = Math.floor(Math.random() * Math.max(80, Math.round(base * 0.15)));
  return Math.min(max, expo + jitter);
}

export function compactSendgridError(error) {
  const status = Number(error?.code || error?.response?.statusCode || 0);
  const body = error?.response?.body;
  const fallback = typeof error?.message === "string" ? error.message : "SendGrid request failed";

  if (body && Array.isArray(body.errors) && body.errors.length > 0) {
    const messages = body.errors
      .map((entry) => (typeof entry?.message === "string" ? entry.message.trim() : ""))
      .filter(Boolean)
      .slice(0, 3);

    if (messages.length > 0) {
      return {
        status,
        message: messages.join(" | "),
      };
    }
  }

  return {
    status,
    message: fallback,
  };
}

export async function sendWithRetry(sendFn, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 3);
  const baseDelayMs = Math.max(200, Number(options.baseDelayMs) || 900);
  const maxDelayMs = Math.max(baseDelayMs, Number(options.maxDelayMs) || 30_000);

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await sendFn(attempt);
      return {
        ok: true,
        attempt,
        result,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;

      const waitMs = nextRetryDelayMs(attempt, baseDelayMs, maxDelayMs);
      await delay(waitMs);
    }
  }

  return {
    ok: false,
    attempt: maxAttempts,
    error: lastError,
  };
}
