/**
 * NN service worker.
 *
 * Deliberately minimal. It exists so NN is installable and shows something
 * other than a browser error when offline — not to cache personal data.
 * Nothing under /api is ever cached: stale authentication or stale personal
 * records would be worse than an honest failure.
 */
const CACHE = "nn-shell-v2";

/**
 * Only the offline page is kept.
 *
 * Caching `/` and `/sign-in` bought almost nothing — they are fast, and NN is
 * useless offline anyway without a session — and it cost a broken load after
 * every deploy: a tab would be handed the previous build's HTML while loading
 * the new build's JavaScript, and React would throw the whole page away on
 * hydration rather than hydrate a document it did not render.
 *
 * So documents are never cached. Online, every page comes from the network;
 * offline, every page is the offline page. Nothing in between can be stale.
 */
const SHELL = ["/offline"];

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

  // Network only, with the offline page as the one fallback. A document is
  // never written to the cache, so a document is never served from it.
  event.respondWith(
    fetch(request).catch(async () => {
      if (request.destination === "document") {
        return (await caches.match("/offline")) ?? Response.error();
      }
      return Response.error();
    }),
  );
});
