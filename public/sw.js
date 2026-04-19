const CACHE_VERSION = "dealbank-static-v2";
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith("/")
  ? SCOPE_URL.pathname
  : `${SCOPE_URL.pathname}/`;
const INDEX_URL = new URL("index.html", self.registration.scope).toString();

const STATIC_CACHE_URLS = [
  new URL("", self.registration.scope).toString(),
  INDEX_URL,
  new URL("site.webmanifest", self.registration.scope).toString(),
  new URL("image.png", self.registration.scope).toString(),
  new URL("robots.txt", self.registration.scope).toString(),
  new URL("sitemap.xml", self.registration.scope).toString(),
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
    && (requestUrl.pathname.startsWith(`${BASE_PATH}assets/`)
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
      cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch {
    const cachedPage = await cache.match(INDEX_URL);
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
