// service-worker.js
const CACHE_VERSION = "sleepaura-v3";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  // Audio – adjust paths if yours differ
  "./sounds/528hz.mp3",
  "./sounds/396hz.mp3",
  "./sounds/432hz.mp3",
  "./sounds/theta.mp3",
  "./sounds/852hz.mp3",
  "./sounds/741hz.mp3",
  "./sounds/ambient/fire.mp3",
  "./sounds/ambient/ocean.mp3",
  "./sounds/ambient/rain.mp3",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Strategy:
// - Audio: cache-first (good for offline playback)
// - Navigations (HTML): network-first, fallback to cache
// - Others (CSS/JS/fonts): stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Audio often uses Range requests; don't try to serve those from cache
  if (req.headers.has("range")) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigations (document) → network-first
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Audio → cache-first
  if (req.destination === "audio") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CORE_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CORE_CACHE);
  const cached = await cache.match(req);
  const networkPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  });
  return cached || networkPromise;
}
