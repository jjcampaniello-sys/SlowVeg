const CACHE_NAME = 'slowveg-v16'; // ⚠️ incrémenter à chaque déploiement
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './readme.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCodeFile = url.pathname.endsWith('.js') || url.pathname.endsWith('.html');

  if (isCodeFile) {
    // Network-first : toujours essayer la version fraîche en premier
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request)) // hors-ligne → fallback cache
    );
  } else {
    // Cache-first pour le reste (icônes, manifest) : change rarement
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
