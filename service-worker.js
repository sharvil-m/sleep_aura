const CACHE_NAME = "sleepaura-v2"; // bump version if you update files
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./script.js",

  // Frequencies
  "./sounds/396hz.mp3",
  "./sounds/432hz.mp3",
  "./sounds/528hz.mp3",
  "./sounds/639hz.mp3",
  "./sounds/741hz.mp3",
  "./sounds/852hz.mp3",

  // Ambient sounds
  "./sounds/ambient/rain.mp3",
  "./sounds/ambient/fire.mp3",
  "./sounds/ambient/ocean.mp3",
  "./sounds/ambient/wind.mp3"
];

// Install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Activate (cleanup old caches)
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => {
      return resp || fetch(e.request);
    })
  );
});
