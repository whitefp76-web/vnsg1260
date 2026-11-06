/* Offline asset cache only. Does not inspect, transmit, or store charting entries.
   Charting data lives in the app's localStorage and is never touched here. */
const CACHE_NAME = 'vnsg1260-clinical-charting-v3';
const CORE = [
  './', './index.html', './app.html', './install.js', './manifest.webmanifest',
  './icons/favicon.ico', './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-192.png', './icons/maskable-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('vnsg1260-clinical-charting-') && k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function inScope(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.registration.scope).pathname);
}
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!inScope(url)) return;
  if (req.mode === 'navigate') {
    // Network first so students get updates when online; cached app when offline or on weak hospital Wi-Fi.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const fresh = await fetch(req, { signal: ctrl.signal });
        clearTimeout(t);
        if (fresh.ok) cache.put(url.pathname.endsWith('/') ? './index.html' : req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
      }
    })());
    return;
  }
  // Static assets: serve from cache, refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => cached);
    return cached || network;
  })());
});
