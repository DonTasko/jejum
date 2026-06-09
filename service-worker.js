/**
 * service-worker.js — Jejum Fácil
 * Estratégia: Cache-First para assets estáticos, Network-First para dados.
 */

const CACHE_NAME    = 'jejumfacil-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/timer.js',
  '/js/stats.js',
  '/js/notifications.js',
  '/js/adsManager.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

// ── INSTALL ───────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
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

  // Ignorar requests externos (AdMob, etc.)
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback offline
          if (e.request.destination === 'document') {
            return caches.match('/index.html');
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
      icon:  '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-96.png',
      data:  { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
