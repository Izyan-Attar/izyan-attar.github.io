// IZYAN website service worker.
// • Pages (HTML): network first, so prices/products are always fresh; cached copy only when offline.
// • Images/icons/fonts: stale-while-revalidate (fast, refreshed in the background).
// • Videos, Google Sheets, Apps Script, WhatsApp and every other site: never cached, always straight to the network.
const CACHE = 'izyan-site-v1';
const CORE = ['./', 'index.html', 'feedback.html', 'manifest.webmanifest', 'images/izyan-logo.webp', 'icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Sheets, Apps Script, CDNs, WhatsApp → untouched
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || req.headers.has('range')) return;   // videos → untouched
  if (req.mode === 'navigate' || /\.html?$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
