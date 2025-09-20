// service-worker.js
self.clients.claim();
});


const sameOrigin = (u) => u.origin === self.location.origin;


self.addEventListener("fetch", (event) => {
const req = event.request;
const url = new URL(req.url);


if (req.headers.has("range")) return; // let browser handle byte-range for audio
if (!sameOrigin(url)) return;


// Navigations → network-first
if (req.mode === "navigate") {
event.respondWith(
fetch(req)
.then((res) => { caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone())); return res; })
.catch(() => caches.match(req))
);
return;
}


// Any sounds (covers /sounds and /sounds/ambient_sounds) → cache-first
if (url.pathname.includes("/sounds/")) {
event.respondWith(
caches.match(req).then((cached) => {
if (cached) return cached;
return fetch(req).then((res) => { caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone())); return res; });
})
);
return;
}


// Static assets → stale-while-revalidate
if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|json|mp3)$/i.test(url.pathname)) {
event.respondWith(
caches.match(req).then((cached) => {
const fetchPromise = fetch(req)
.then((res) => { caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone())); return res; })
.catch(() => cached);
return cached || fetchPromise;
})
);
}
});
