/* SleepAura SW – index (landing) + player + audio caching with Range support */
const VERSION = 'v1-2025-10-08';
const CACHE_NAME = `sleepaura-${VERSION}`;

/* Core files to precache */
const PRECACHE_URLS = [
  '/',                 // if your host serves index.html at root
  '/index.html',       // landing
  '/player.html',      // player page
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  // Frequencies (adjust paths if needed)
  '/sounds/528hz.mp3',
  '/sounds/396hz.mp3',
  '/sounds/432hz.mp3',
  '/sounds/theta.mp3',
  '/sounds/852hz.mp3',
  '/sounds/741hz.mp3',

  // Ambient
  '/sounds/ambient_sounds/fire.mp3',
  '/sounds/ambient_sounds/ocean.mp3',
  '/sounds/ambient_sounds/rain.mp3'
];

/* Install – precache essential assets */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

/* Activate – clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => (n !== CACHE_NAME) && caches.delete(n)));
    await self.clients.claim();
  })());
});

/* Helper: partial content (Range) responder for cached audio */
async function serveRangeFromCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (!cached) return fetch(request); // fallback to network

  // If no Range header, just return the cached file
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return cached;

  // Parse `bytes=start-end`
  const size = (await cached.clone().arrayBuffer()).byteLength;
  const m = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!m) return cached;

  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : size - 1;
  const chunk = (await cached.clone().arrayBuffer()).slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunk.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}

/* Fetch strategy:
   - HTML: NetworkFirst (offline -> cached)
   - Audio (mp3): CacheFirst with Range support
   - Everything else: StaleWhileRevalidate
*/
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // HTML pages (navigation requests)
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, net.clone());
        return net;
      } catch {
        // Offline fallback to cached index or player
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ||
               (await cache.match('/player.html')) ||
               (await cache.match('/index.html')) ||
               new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Audio with Range support
  if (request.destination === 'audio' || url.pathname.endsWith('.mp3')) {
    event.respondWith(serveRangeFromCache(request));
    return;
  }

  // Default: Stale-While-Revalidate for assets (css/js/fonts/images)
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then((netRes) => {
      if (netRes && netRes.status === 200) cache.put(request, netRes.clone());
      return netRes;
    }).catch(() => null);

    return cached || fetchPromise || new Response(null, { status: 504 });
  })());
});
