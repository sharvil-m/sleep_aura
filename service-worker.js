/* SleepAura SW – SPA + audio caching with Range support */
const VERSION = 'v1-2025-10-12';
const CACHE_NAME = `sleepaura-${VERSION}`;

/* Core files to precache (SPA uses index.html for everything) */
const PRECACHE_URLS = [
  '/',                 // serve index at root (if your host maps / -> /index.html)
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',

  // Frequencies (adjust if filenames/paths differ)
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
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
  // Try exact request first (keeps vary/search simple for audio)
  let res = await cache.match(request);
  if (!res) {
    // Fetch and cache if not present
    try {
      res = await fetch(request);
      if (res && res.ok) cache.put(request, res.clone());
    } catch (e) {
      // No network and no cache -> hard fail
      return new Response(null, { status: 504, statusText: 'Offline for audio' });
    }
  }
  // If still nothing, bail to network
  if (!res) return fetch(request);

  // Convert body to ArrayBuffer to slice ranges
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;

  const range = request.headers.get('Range');
  if (!range) {
    // No Range: return full file with Accept-Ranges
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }

  // Parse "bytes=start-end"
  const m = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!m) {
    // Malformed Range -> serve full content
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes'
      }
    });
  }

  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : size - 1;

  if (start >= size || end >= size) {
    // Unsatisfiable
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}` }
    });
  }

  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(chunk.byteLength),
      'Accept-Ranges': 'bytes',
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
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // HTML / SPA navigations
  const isHTML = request.mode === 'navigate' ||
                 request.destination === 'document' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const net = await fetch(request);
        if (net && net.ok) cache.put(request, net.clone());
        return net;
      } catch {
        return (await cache.match(request)) ||
               (await cache.match('/index.html')) ||
               new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Audio with Range support
  const isAudio = request.destination === 'audio' || url.pathname.endsWith('.mp3');
  if (isAudio) {
    event.respondWith(serveRangeFromCache(request));
    return;
  }

  // Default: Stale-While-Revalidate for assets (css/js/img/fonts)
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
