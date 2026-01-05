const CACHE = 'as-v1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/db.js',
  '/js/admin.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});