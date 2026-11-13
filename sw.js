/* Loreweaver service worker: cache-first for the app shell, network-first for nothing else.
   The app has no build step and no remote calls, so every same-origin GET of a shell asset can be
   served from cache after the first visit. Version bumps invalidate the old cache. */
const CACHE = "loreweaver-v1";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "favicon.ico",
  "src/main.js",
  "src/styles.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }

        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
