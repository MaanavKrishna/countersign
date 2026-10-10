// Countersign service worker: the Family Countersign and Call Shield screens
// must open with no signal, because that's when a scam call can come in.
const VERSION = "countersign-v5";
const PAGES = ["/", "/family", "/family/practice", "/family/card", "/shield", "/check", "/vault"];
const EXTRA = ["/manifest.webmanifest", "/icon"];

// Cache each offline-critical page AND the scripts/styles it references, so the
// pages hydrate offline even if the person never visited them before.
async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set();
  await Promise.allSettled(
    PAGES.map(async (path) => {
      const res = await fetch(new Request(path, { cache: "reload" }));
      if (!res.ok) return;
      await cache.put(path, res.clone());
      const html = await res.text();
      for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
    }),
  );
  await Promise.allSettled([...EXTRA, ...assets].map((u) => cache.add(new Request(u, { cache: "reload" }))));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always live

  // Build assets are content-hashed and immutable: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and everything else: network first, cached copy when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && !res.redirected && (req.mode === "navigate" || url.pathname === "/icon" || url.pathname.endsWith(".webmanifest"))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(url.pathname, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = (await caches.match(req)) || (await caches.match(url.pathname));
        if (cached) return cached;
        if (req.mode === "navigate") return (await caches.match("/family")) || Response.error();
        return Response.error();
      }),
  );
});
