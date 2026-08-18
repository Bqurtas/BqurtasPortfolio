/* =========================================================
   Barakat Qurtas — Service Worker (PWA Offline & Cache)
   Version: 1.0.0
   ========================================================= */

const CACHE_NAME = 'bqurtas-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/modern-framer.css?v=161',
  '/css/style.v417.min.css?v=458',
  '/css/fonts.css?v=447',
  '/css/experience.css?v=6',
  '/js/main.v420.min.js?v=490',
  '/js/gallery.v420.min.js?v=452',
  '/js/i18n.v420.min.js?v=449',
  '/js/i18n-more.min.js',
  '/js/enhance.v420.min.js',
  '/js/motion.min.js?v=411',
  '/js/chat-kb.min.js',
  '/js/lux.min.js?v=359',
  '/site.webmanifest?v=333',
  '/favicon.ico',
  '/assets/portrait.webp?v=2',
  '/assets/favicon-192.png',
  '/assets/favicon-512.png'
];

// Install: precache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy
// - Documents (HTML / SPA navigation): Network first, falling back to cache, then /index.html
// - Static assets (CSS, JS, Fonts, Images): Cache first, falling back to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin analytics / external API calls
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('jsdelivr.net') && !url.hostname.includes('raw.githubusercontent.com')) {
    return;
  }

  // Handle SPA room navigations (HTML)
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache same-origin assets or specific CDN media
          if (url.origin === self.location.origin) {
            cache.put(request, responseToCache);
          }
        });
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
