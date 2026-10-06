/* PujoGuide service worker: makes the app open offline with map tile caching ("Puja Day Mode").
 * - Static assets (/_next/static, icons, MapLibre worker): cache-first.
 * - Map tiles, styles, fonts (CARTO / MapLibre): cache-first with network fallback.
 * - Page loads: network-first, falling back to cached offline shell. */
const CACHE = "pujoguide-v1";
const TILE_CACHE = "pujoguide-tiles-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/maplibre/");

const isMapResource = (url) =>
  url.hostname.includes("cartocdn.com") ||
  url.hostname.includes("openstreetmap.org") ||
  url.hostname.includes("maplibre.org") ||
  url.pathname.includes("style.json") ||
  url.pathname.includes("/font/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Map tiles and maplibre resources: Cache-first
  if (isMapResource(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req)
            .then((res) => {
              if (res.ok) {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => Response.error());
        }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error())),
    );
  }
});
