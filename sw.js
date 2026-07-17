/* WebGIS Management — Service Worker (PWA GitHub Pages) */
const CACHE = 'webgis-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Jangan cache panggilan API GAS / tile peta / permintaan non-GET
  if (req.method !== 'GET' ||
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com') ||
      url.hostname.includes('arcgisonline.com') ||
      url.hostname.includes('tile.') ||
      url.hostname.includes('drive.google.com')) {
    return; // biarkan browser menangani langsung (network)
  }

  // Shell & aset lokal: cache-first, jatuh ke jaringan
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Aset CDN (Leaflet/Chart/shp): stale-while-revalidate
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
