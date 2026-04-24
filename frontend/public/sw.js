const CACHE_NAME = 'readable-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Let API calls go through normally
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});
