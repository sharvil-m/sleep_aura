/* SleepAura SW – SPA + audio caching with Range support */
const VERSION = 'v1-2025-10-13';
const CACHE_NAME = `sleepaura-${VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './player.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',

  // Frequencies
  './sounds/528hz.mp3',
  './sounds/396hz.mp3',
  './sounds/432hz.mp3',
  './sounds/theta.mp3',
  './sounds/852hz.mp3',
  './sounds/741hz.mp3',

  // Ambient
  './sounds/ambient_sounds/fire.mp3',
  './sounds/ambient_sounds/ocean.mp3',
  './sounds/ambient_sounds/rain.mp3'
];

/* Install – precache essential assets */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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
  const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: true });

  // If Range requested and we have the whole file cached, slice it
  const rangeHeader = request.headers.get('Range');

  // If no cached response, just do network (with Range if asked)
  if (!cached) {
    try {
      const net = await fetch(request);
      // cache successful 200 responses (not partials)
      if (net && net.ok && net.status === 200) cache.put(request, net.clone());
      return net;
    } catch (e) {
      return new Response(null, { status: 504 });
    }
  }

  // No range -> return cached as is
  if (!rangeHeader) return cached;

  // Parse "bytes=start-end"
  const size = parseInt(cached.headers.get('Content-Length') || '0', 10);
  const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!m) return new Response(null, { status: 416 });

  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : size - 1;
  if (isNaN(start)) start = 0;
  if (isNaN(end) || end >= size) end = size - 1;
  if (start > end || start >= size) {
    return new Response(null, { status: 416 });
  }

  // Read the cached body fully then slice
  const buf = await cached.arrayBuffer();
  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunk.byteLength),
      // Allow media to be seekable properly on iOS too
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}

/* Fetch strategy */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // HTML / navigations (Network First)
  const isHTML = request.mode === 'navigate' ||
                 request.destination === 'document' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const net = await fetch(request, { cache: 'no-store' });
        if (net && net.ok) cache.put(request, net.clone());
        return net;
      } catch {
        return (await cache.match(request)) ||
               (await cache.match('./index.html')) ||
               new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Audio (Cache First with Range)
  const isAudio = request.destination === 'audio' || url.pathname.endsWith('.mp3');
  if (isAudio) {
    event.respondWith(serveRangeFromCache(request));
    return;
  }

  // Default assets – Stale-While-Revalidate
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
