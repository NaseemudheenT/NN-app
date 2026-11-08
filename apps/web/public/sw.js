/**
 * NN service worker.
 *
 * Deliberately minimal. It exists so NN is installable and shows something
 * other than a browser error when offline — not to cache personal data.
 * Nothing under /api is ever cached: stale authentication or stale personal
 * records would be worse than an honest failure.
 */
const CACHE = "nn-shell-v1";
const SHELL = ["/", "/sign-in", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API responses, authentication or anything personal.
  if (url.pathname.startsWith("/api/")) return;

  // Network first: the founder should always see live data when online.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.destination === "document") {
          const copy = response.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.destination === "document") {
          return (await caches.match("/offline")) ?? Response.error();
        }
        return Response.error();
      }),
  );
});
