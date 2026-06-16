// ── Training Log Service Worker ──────────────────────────────────
// Bump CACHE_VERSION every time you upload a new index.html
// The app will auto-detect the change and refresh on next open
const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `training-log-${CACHE_VERSION}`;

// Files to cache for offline use
const PRECACHE_URLS = [
  "./",
  "./index.html",
];

// ── Install: cache core files ─────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// ── Activate: delete old caches ───────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("training-log-") && name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for index.html, cache-first for others ───
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always fetch index.html fresh from network so updates land immediately
  // Fall back to cache if offline
  if (url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Update cache with fresh copy
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For CDN assets (React, Babel) — cache-first, they don't change
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      });
    })
  );
});

// ── Message: skip waiting to activate new SW immediately ──────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
