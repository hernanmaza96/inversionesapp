const CACHE = 'corazonada-v9';
const SHELL = ['./', 'index.html', 'analysis.js', 'manifest.json', 'icon-512.png', 'icon-192.png', 'badge.png'];
const CDN = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))).then(() => c.add(CDN).catch(() => {}))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Archivos de la app: se muestran rápido desde el caché y se actualizan en segundo plano.
// Los datos de mercado (Binance, CoinGecko, Twelve Data) nunca se guardan.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  const mine = url.origin === location.origin || e.request.url === CDN;
  if (!mine) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (_) {}
  const urgent = /^(🔻|🚀)/.test(d.title || '');
  e.waitUntil(self.registration.showNotification(d.title || 'Corazonada', {
    body: d.body || '', tag: d.tag || 'corazonada', renotify: true, requireInteraction: urgent,
    icon: 'icon-512.png', badge: 'badge.png', vibrate: urgent ? [400, 150, 400, 150, 700] : [250, 120, 250],
    timestamp: Date.now(), actions: [{ action: 'open', title: 'Ver gráfico' }], data: { a: d.a }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const a = e.notification.data && e.notification.data.a;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if (a) c.postMessage({ a }); return c.focus(); } }
    return clients.openWindow('./' + (a ? '?a=' + encodeURIComponent(a) : ''));
  }));
});
