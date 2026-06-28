---
permalink: /service-worker.js
layout: null
---
const CACHE_VERSION = "v2";
const CACHE_NAME = `talk-to-the-hand-${CACHE_VERSION}`;

// Core assets that make the app usable offline.
const PRECACHE_URLS = [
  "/",
  "/show/",
  "/recognize/",
  "/help/",
  "/assets/css/main.css",
  "/assets/js/application.js",
  "/assets/js/vendor/stimulus.js",
  "/assets/js/controllers/hand_color_controller.js",
  "/assets/js/controllers/show_game_controller.js",
  "/assets/js/controllers/recognize_game_controller.js",
  "/assets/js/lib/number_codec.js",
  "/assets/js/lib/gesture_classifier.js",
  "/manifest.json",
  "/icon.svg",
  "/icon.png",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Network-first for navigations, falling back to cache (then "/") when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
      );
    })
  );
});
