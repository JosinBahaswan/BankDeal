const SERVICE_WORKER_FILE = "sw.js";

function normalizedBasePath() {
  const rawBasePath = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
    ? String(import.meta.env.BASE_URL)
    : "/";

  const withLeadingSlash = rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function serviceWorkerUrl() {
  return new URL(SERVICE_WORKER_FILE, `${window.location.origin}${normalizedBasePath()}`).toString();
}

async function serviceWorkerScriptExists(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

function shouldRegisterServiceWorker() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (window.isSecureContext) return true;

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function registerDealbankServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener("load", async () => {
    const workerUrl = serviceWorkerUrl();
    const workerAvailable = await serviceWorkerScriptExists(workerUrl);
    if (!workerAvailable) {
      console.warn(`[ServiceWorker] Script not found at ${workerUrl}.`);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(workerUrl, {
        scope: normalizedBasePath(),
      });

      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            installingWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch (error) {
      console.warn("[ServiceWorker] Registration failed.", error);
    }
  });
}
