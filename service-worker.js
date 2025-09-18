// --- SleepAura Service Worker ---
// Bump this when you release (any change = new version):
const CACHE_VERSION = "v6-2025-09-16-ambient_sounds";
const STATIC_CACHE = `sleepaura-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./script.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Tip: you can also list specific audio files here if you want them
  // available offline on first load. Otherwise they'll be cached on first play.
  // "./sounds/frequencies/528hz.mp3",
  // "./sounds/ambient_sounds/rain.mp3",
];

// Install: precache core files and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clear old caches and take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Helper
const sameOrigin = (url) => url.origin === self.location.origin;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Let browser handle byte-range audio streaming
  if (req.headers.has("range")) return;

  if (!sameOrigin(url)) return;

  // 1) Navigations: network-first (so new releases show without hard refresh)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 2) Sounds (including ambient_sounds): cache-first, then network; store on first fetch
  if (url.pathname.includes("/sounds/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) Other static assets: stale-while-revalidate
  if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|json|mp3)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
