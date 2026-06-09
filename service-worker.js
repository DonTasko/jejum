/**
 * service-worker.js — Jejum Fácil
 * Estratégia: Cache-First para assets estáticos.
 * Paths relativos para compatibilidade com GitHub Pages em subdiretória.
 */

const CACHE_NAME    = 'jejumfacil-v1.0.1';

// Paths RELATIVOS ao scope do SW — funciona em qualquer subdiretória
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/timer.js',
  './js/stats.js',
  './js/notifications.js',
  './js/adsManager.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

// ── INSTALL ───────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll individual com tratamento de erro — um 404 não mata tudo
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(err => {
            console.warn('[SW] Não foi possível fazer cache de:', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignorar requests externos (AdMob, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Ignorar métodos não-GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(response => {
          // Só fazer cache de respostas válidas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback offline para documentos HTML
          if (e.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Jejum Fácil', {
      body:  data.body  || '',
      icon:  './assets/icons/icon-192.png',
      badge: './assets/icons/icon-96.png',
      data:  { url: self.registration.scope },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || self.registration.scope));
});
