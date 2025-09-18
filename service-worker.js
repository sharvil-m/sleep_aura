// service-worker.js
// Only manage same-origin
if (!sameOrigin(url)) return;


// 1) HTML navigations → network-first for instant updates
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


// 2) Audio under /sounds or /sounds/ambient → cache-first
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


// 3) Other static assets → stale-while-revalidate
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
