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
  e.waitUntil(
    caches.open(CACHE).then(c => {
      console.log('🔄 Cache abierto:', CACHE);
      return c.addAll(urlsToCache).catch(error => {
        console.log('⚠️ Error al cachear algunos recursos:', error);
        // Continuar aunque falle algún recurso
        return Promise.resolve();
      });
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      // Devuelve el recurso cacheado si existe, si no haz fetch
      return r || fetch(e.request).catch(error => {
        console.log('⚠️ Error en fetch:', error);
        // Podrías devolver una página de error aquí si quieres
        return new Response('Error de conexión', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

self.addEventListener('activate', e => {
  console.log('✅ Service Worker activado');
});