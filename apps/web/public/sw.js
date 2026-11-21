/**
 * NN service worker.
 *
 * Cache only the explicitly public application shell. Authenticated workspace
 * documents and all API responses are network-only: private pages must never
 * be persisted as offline HTML or replayed from a stale session.
 */
const CACHE = "nn-shell-v2";
const SHELL = ["/", "/sign-in", "/offline"];
const CACHEABLE_DOCUMENTS = new Set(SHELL);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.destination === "document") {
    // Private routes are deliberately network-only. If offline, show the
    // generic offline page rather than a cached authenticated document.
    if (!CACHEABLE_DOCUMENTS.has(url.pathname)) {
      event.respondWith(
        fetch(request).catch(async () => (await caches.match("/offline")) ?? Response.error()),
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/offline")) ?? Response.error()),
    );
  }
});
