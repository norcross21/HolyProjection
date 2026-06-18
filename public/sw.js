// HolyProjection service worker — keeps the app usable through WiFi dropouts.
// Strategy: hashed /_next/static assets cache-first; same-origin pages
// network-first (fresh when online, cached copy when offline); cross-origin
// (Supabase realtime/REST, Google Fonts, ffmpeg CDN) always go to the network.
const CACHE = 'hp-cache-v1';
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

  // Hashed static assets — safe to cache forever.
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

  // Same-origin pages/data — network-first, fall back to cache when offline.
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/'))) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      const cache = await caches.open(CACHE);
      const hit = (await cache.match(req)) || (await cache.match('/'));
      if (hit) return hit;
      throw new Error('offline and not cached');
    }
  })());
});
