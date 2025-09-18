// service-worker.js
// • Ignore byte-range (audio streaming) so browser handles it.


const CACHE_VERSION = "v9-2025-09-18-02"; // bump on any release
const STATIC_CACHE = `sleepaura-${CACHE_VERSION}`;


const PRECACHE_URLS = [
"./",
"./index.html",
"./manifest.json",
// Add your bundled css/js if separate (e.g., "./style.css", "./script.js")
"./icons/icon-192.png",
"./icons/icon-512.png",
// OPTIONAL: small starter set for offline-first impression
// "./sounds/frequencies/528hz.mp3",
// "./sounds/ambient_sounds/rain.mp3",
];


self.addEventListener("install", (event) => {
// Take control immediately
self.skipWaiting();
event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS)));
});


self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : null))))
);
self.clients.claim();
});


const sameOrigin = (u) => u.origin === self.location.origin;


self.addEventListener("fetch", (event) => {
const req = event.request;
const url = new URL(req.url);


// Hand off byte-range requests (audio streaming)
if (req.headers.has("range")) return;
if (!sameOrigin(url)) return;


// 1) Page navigations → network-first
if (req.mode === "navigate") {
event.respondWith(
fetch(req)
.then((res) => {
const copy = res.clone();
caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
return res;
})
.catch(async () => (await caches.match(req)) || (await caches.match("./")))
);
return;
}


// 2) Sounds → cache-first (covers /sounds/ambient_sounds/ too)
if (url.pathname.includes("/sounds/")) {
event.respondWith(
caches.match(req).then((cached) => {
if (cached) return cached;
return fetch(req).then((res) => {
const copy = res.clone();
});

