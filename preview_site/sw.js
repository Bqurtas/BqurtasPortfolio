/* =========================================================
   Barakat Qurtas — Service Worker (PWA Offline & Cache)

   Freshness beats speed. Two rules make that true:

   1. The build-derived SW_VERSION is part of the cache name, so a changed
      release drops its previous cache instead of layering on top of it.
   2. Only URLs with a 12-hex ?v= content fingerprint are cache-first. Those
      are immutable by construction — changed content means a new URL. Every
      other eligible same-origin asset (such as unversioned art and logos) is
      served stale-while-revalidate, so an edit shows up on the next visit
      instead of being pinned for the life of the installed worker.
   ========================================================= */

const SW_VERSION = '22052c39f899'; // generated from this worker and the app shell
const CACHE_NAME = `bqurtas-cache-${SW_VERSION}`;
const DOC_FALLBACK = '/index.html';

function isAppDocument(pathname) {
  return pathname === DOC_FALLBACK || /^\/(?:(?:ku|kmr|ar|fr|tr|sv)(?:\/|$))?(?:|design(?:\/(?:logo|official|book|posters|social|events|stationery|image|video|other|certificate))?|blog(?:\/[1-9]\d{0,17})?|bio|contact)\/?$/.test(pathname);
}

async function cachedEntry(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
  } catch (error) {
    return undefined;
  }
}

/* Asset fingerprints and SW_VERSION are generated from file contents by the
   build. index.html is required here: otherwise a brand-new installation has
   no document to show when its first offline navigation happens. Navigations
   remain network-first, so this copy is only an offline fallback. */
const PRECACHE_ASSETS = [
  '/index.html',
  '/css/modern-framer.min.css?v=63cb4022d6c4',
  '/css/style.v417.min.css?v=16633f93b573',
  '/css/fonts.css?v=69cf74d1bd04',
  '/css/experience.min.css?v=349515ee7bec',
  '/js/main.v420.min.js?v=cc722224dcb1',
  '/js/gallery.v420.min.js?v=c8074cd76993',
  '/js/i18n.v420.min.js?v=1e77fb510a2d',
  '/js/motion.min.js?v=282b683a1d19',
  '/js/lux.min.js?v=4687eeaa96da',
  '/site.webmanifest?v=19c5c4b9ee48',
  '/favicon.ico',
  '/assets/portrait.webp?v=56f25216a1e1',
  '/assets/favicon-192.png',
  '/assets/favicon-512.png'
];

// Install: cache assets independently, but require the offline document.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset))
      );
      const failed = results
        .map((result, index) => result.status === 'rejected' ? PRECACHE_ASSETS[index] : '')
        .filter(Boolean);
      if (failed.length) console.warn('Some assets were not precached:', failed);

      const fallbackIndex = PRECACHE_ASSETS.indexOf(DOC_FALLBACK);
      if (fallbackIndex < 0 || results[fallbackIndex].status !== 'fulfilled') {
        throw new Error('Offline document could not be precached');
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('bqurtas-cache-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => caches.open(CACHE_NAME).then((cache) => cache.keys().then((reqs) => Promise.all(
      /* Defense in depth: remove any API entry accidentally inserted into this
         cache, even though the fetch handler below never stores one. */
      reqs.filter((r) => {
        try { return /^\/api(?:\/|$)/i.test(new URL(r.url).pathname); } catch (e) { return false; }
      }).map((r) => cache.delete(r))
    )))).then(() => self.clients.claim())
  );
});

// Fetch: Strategy
// - Documents (HTML / SPA navigation): network first, then the offline /index.html
// - 12-hex fingerprinted assets:       cache first — the URL changes when the file does
// - Public static assets:              stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin and byte-range requests.
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (request.headers.has('range')) return;

  /* Never touch the API. API URLs and responses used to be written to Cache
     Storage and served from there afterwards, potentially outliving an
     authorization change. Nothing under /api is cacheable: it is per-request
     and can be authenticated or rate-limited. Live metadata and worker control
     files are also left to the network. */
  if (/^\/api(?:\/|$)/i.test(url.pathname)) return;
  if (/^\/(?:sw\.js|sitemap(?:-[a-z]+)?\.xml|robots\.txt|llms\.txt|googlece)/i.test(url.pathname)) return;

  // Handle SPA room navigations (HTML)
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    // Unknown pages must retain their real network response. An unrelated HTML
    // file must never replace the app shell or become an offline soft 404.
    if (!isAppDocument(url.pathname)) return;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { cache: 'no-store' });
          /* Keep the newest document actually seen, for offline only. Cache
             Storage is best-effort: a quota/write failure must never replace a
             successful network navigation with an older offline document. */
          if (response && response.status === 200 && response.type === 'basic'
            && /\btext\/html\b/i.test(response.headers.get('Content-Type') || '')) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(DOC_FALLBACK, response.clone());
            } catch (cacheError) {
              console.warn('Could not refresh the offline document');
            }
          }
          return response;
        } catch (error) {
          return (await cachedEntry(DOC_FALLBACK)) || Response.error();
        }
      })()
    );
    return;
  }

  // Cache only public assets, not arbitrary same-origin responses (mail
  // discovery, verification files or future authenticated endpoints).
  if (!/^\/(?:assets|css|js|vendor)\//.test(url.pathname)
    && !['/favicon.ico', '/site.webmanifest'].includes(url.pathname)) return;

  // Respect explicit fetch freshness policies. Gallery refreshes request a
  // fresh manifest; no-store must bypass both Cache Storage reads and writes.
  if (request.cache === 'no-store') {
    event.respondWith(fetch(request));
    return;
  }
  const networkFirst = request.cache === 'reload' || request.cache === 'no-cache';

  /* Only a build-generated SHA-256 prefix is immutable. Legacy/manual values
     such as ?v=2 must still revalidate instead of becoming permanently stale. */
  const fingerprinted = /^[a-f0-9]{12}$/i.test(url.searchParams.get('v') || '');

  event.respondWith(
    (async () => {
      /* Cache reads are also best-effort; a broken Cache Storage implementation
         must not prevent the network from serving the asset. */
      const cachedResponse = await cachedEntry(request);

      // A content-addressed URL cannot have changed. Return it without even
      // starting a redundant request (or leaving a rejected promise behind).
      if (cachedResponse && fingerprinted && !networkFirst) return cachedResponse;

      const network = fetch(request).then(async (networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        } catch (cacheError) {
          console.warn('Could not update an asset cache entry');
        }
        return networkResponse;
      });

      if (networkFirst) {
        return network.catch((error) => {
          if (cachedResponse) return cachedResponse;
          throw error;
        });
      }

      // Otherwise serve what we have and refresh it in the background.
      if (cachedResponse) {
        event.waitUntil(network.catch(() => undefined));
        return cachedResponse;
      }
      return network;
    })()
  );
});
