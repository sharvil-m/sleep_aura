// service-worker.js
Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : null)))
)
);
self.clients.claim();
});


const sameOrigin = (url) => url.origin === self.location.origin;


self.addEventListener("fetch", (event) => {
const req = event.request;
const url = new URL(req.url);


if (req.headers.has("range")) return;
if (!sameOrigin(url)) return;


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
