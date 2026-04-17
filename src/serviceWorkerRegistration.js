const SERVICE_WORKER_PATH = "/sw.js";

function shouldRegisterServiceWorker() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  return true;
}

export function registerDealbankServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);

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
    } catch {
      // no-op: app works without service worker.
    }
  });
}
