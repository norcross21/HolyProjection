// HolyProjection service worker — keeps the app usable through WiFi dropouts.
// Strategy: hashed /_next/static assets cache-first; navigations network-first
// (fresh when online, cached shell when offline); dynamic data (RSC payloads,
// /api, Supabase, fonts, CDNs) always go straight to the network and are never
// cached, so a redeploy can never leave a client on a stale shell.
//
// Bump CACHE on any caching-behaviour change — the activate handler purges every
// cache whose name doesn't match, so old/polluted caches are cleared on update.
const CACHE = 'hp-cache-v2';
const STATIC = /\/_next\/static\//;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Leave cross-origin (Supabase, fonts, CDNs) entirely to the network.
  if (url.origin !== self.location.origin) return;

  // Never cache dynamic data — RSC navigations/prefetches and API routes must
  // always be fresh (caching them is what can serve a stale, broken view).
  if (url.searchParams.has('_rsc') || url.pathname.startsWith('/api/')) return;

  // Hashed static assets — immutable, safe to cache forever.
  if (STATIC.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Page navigations — network-first, fall back to a cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Everything else same-origin: straight to the network.
});
