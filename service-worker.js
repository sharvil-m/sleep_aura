self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("sleepaura-cache-v1").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./manifest.json",
        "./styles.css",

        // 🎵 Six free sounds
        "./sounds/396hz.mp3",   // Sadness
        "./sounds/432hz.mp3",   // Energy Balance
        "./sounds/528hz.mp3",   // Anger/Stress Relief
        "./sounds/639hz.mp3",   // Overthinking
        "./sounds/741hz.mp3",   // Frustration
        "./sounds/852hz.mp3"    // Stress
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});