const CACHE_VERSION = "dealbank-static-v1";
const STATIC_CACHE_URLS = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/image.png",
  "/robots.txt",
  "/sitemap.xml",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(STATIC_CACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key !== CACHE_VERSION)
      .map((key) => caches.delete(key)));

    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAssetRequest(requestUrl) {
  return requestUrl.origin === self.location.origin
    && (requestUrl.pathname.startsWith("/assets/")
      || requestUrl.pathname.endsWith(".js")
      || requestUrl.pathname.endsWith(".css")
      || requestUrl.pathname.endsWith(".png")
      || requestUrl.pathname.endsWith(".svg")
      || requestUrl.pathname.endsWith(".webmanifest"));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return new Response("Offline", { status: 503, statusText: "Offline" });
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put("/index.html", response.clone());
    }
    return response;
  } catch {
    const cachedPage = await cache.match("/index.html");
    if (cachedPage) return cachedPage;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetRequest(requestUrl)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
