/* =========================================================
   Barakat Qurtas — Service Worker (PWA Offline & Cache)

   Freshness beats speed. Two rules make that true:

   1. SW_VERSION is part of the cache name, so every release drops the
      whole previous cache in `activate` instead of layering on top of it.
   2. Only URLs that carry a ?v= fingerprint are served cache-first. Those
      are immutable by construction — a new build means a new URL. Every
      other same-origin asset (unversioned art, logos, the avatar) is
      served stale-while-revalidate, so an edit shows up on the next visit
      instead of being pinned for the life of the installed worker.
   ========================================================= */

const SW_VERSION = 'v4';                       // bump on every deploy
const CACHE_NAME = `bqurtas-cache-${SW_VERSION}`;
const DOC_FALLBACK = '/index.html';

/* Keep in step with the ?v= values in index.html — a stale entry here just
   wastes an install fetch, it can never be served to the page (the page asks
   for a different URL). */
/* The HTML is deliberately absent. It is the file that names every asset
   version, so a precached copy pins a whole release: the page goes on asking
   for last week's bundles however many times the site is deployed. It is
   cached at runtime instead, from a response the network just gave us, so
   offline still works and online is never stale. */
const PRECACHE_ASSETS = [
  '/css/modern-framer.css?v=209',
  '/css/style.v417.min.css?v=470',
  '/css/fonts.css?v=447',
  '/css/experience.css?v=124',
  '/js/main.v420.min.js?v=524',
  '/js/gallery.v420.min.js?v=455',
  '/js/i18n.v420.min.js?v=456',
  '/js/motion.min.js?v=419',
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
// - Documents (HTML / SPA navigation): network first, then cache, then /index.html
// - Fingerprinted assets (?v=…):       cache first — the URL changes when the file does
// - Everything else same-origin:       stale-while-revalidate — fast, but never stale twice
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
      fetch(request).then((response) => {
        /* Keep the newest document actually seen, for offline only. */
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(DOC_FALLBACK, copy));
        }
        return response;
      }).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match(DOC_FALLBACK);
        });
      })
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const fingerprinted = url.searchParams.has('v');

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const network = fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        if (sameOrigin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      // A fingerprinted URL can never go stale, so the cached copy is final.
      if (cachedResponse && fingerprinted) return cachedResponse;

      // Otherwise serve what we have and refresh it in the background.
      if (cachedResponse) {
        event.waitUntil(network);
        return cachedResponse;
      }
      return network;
    })
  );
});
