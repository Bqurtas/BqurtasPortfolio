/* =========================================================
   Barakat Qurtas — same-origin media
   GET/HEAD https://bqurtas.com/media/<Folder>/<file>

   Originals live in the owner's GitHub repository. This endpoint serves
   their bytes through Cloudflare under bqurtas.com: the gallery, work pages,
   Open Graph tags and image/video sitemap all use these stable URLs.

   It is not a proxy. Only files listed in assets/gallery-manifest.json, plus
   the few repository images named in EXTRA_MEDIA, are served; any other
   path is a noindex 404 and the upstream URL is always rebuilt from the
   allowlisted path, never from the request.
   ========================================================= */

import { SITE, loadCatalog, mediaType } from '../_gallery-catalog.js';

const RAW_BASE = 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/';
const FORWARDED = ['Range', 'If-Range', 'If-None-Match', 'If-Modified-Since'];
const PASSED_BACK = ['Content-Range', 'ETag', 'Last-Modified'];
// 304/206/416 are real answers about an existing file, not a miss.
const FINAL = new Set([200, 206, 304, 416]);
const UPSTREAM_TIMEOUT_MS = 15_000;

const baseHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Access-Control-Allow-Origin': SITE
});

function failure(status, method, extra = {}) {
  const headers = new Headers({
    ...baseHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra
  });
  const text = { 404: 'Not found', 405: 'Method not allowed', 502: 'Bad gateway', 503: 'Temporarily unavailable' }[status] || 'Error';
  return new Response(method === 'HEAD' ? null : text, { status, headers });
}

/* '/media/Book/BookCover7.webp' -> 'Book/BookCover7.webp', or '' for anything
   that is not exactly one folder and one file name. Encoded separators,
   dot segments and control characters never reach the allowlist lookup. */
export function mediaKeyFromPath(pathname) {
  const match = /^\/media\/([^/]+)\/([^/]+)$/.exec(String(pathname || ''));
  if (!match || /%(?:2f|5c|00)/i.test(pathname)) return '';
  let folder, file;
  try {
    folder = decodeURIComponent(match[1]);
    file = decodeURIComponent(match[2]);
  } catch (e) { return ''; }
  if (!/^[A-Za-z0-9]+$/.test(folder)) return '';
  if (!file || file.includes('..') || /[\\/\u0000-\u001f\u007f]/.test(file)) return '';
  return folder + '/' + file;
}

function discard(response) {
  try {
    const pending = response && response.body ? response.body.cancel() : null;
    if (pending && pending.catch) pending.catch(() => {});
  } catch (e) {}
}

async function fetchUpstream(key, request) {
  const slash = key.indexOf('/');
  const target = RAW_BASE + key.slice(0, slash) + '/' + encodeURIComponent(key.slice(slash + 1));
  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  /* The timer covers the wait for response headers only. A long video body
     keeps streaming after it is cleared. */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(target, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
      // A day at the edge, matching the browser cache below. Upstream errors
      // are never kept.
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '404': 60, '500-599': 0 } }
    });
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.hostname === 'www.bqurtas.com') {
    url.hostname = 'bqurtas.com';
    return Response.redirect(url.toString(), 301);
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return failure(405, request.method, { Allow: 'GET, HEAD' });
  }

  const key = mediaKeyFromPath(url.pathname);
  if (!key || !mediaType(key)) return failure(404, request.method);

  let catalog;
  try { catalog = await loadCatalog(env, url.origin); }
  catch (e) { return failure(503, request.method, { 'Retry-After': '60' }); }
  if (!catalog.byPath.has(key) && !catalog.extra.has(key)) return failure(404, request.method);

  /* The repository is the only upstream. Cloudflare caches successful media;
     failures never redirect a visitor or send their request to another host. */
  const upstream = await fetchUpstream(key, request);
  if (!upstream || !FINAL.has(upstream.status)) {
    const missing = upstream?.status === 404;
    discard(upstream);
    return missing ? failure(404, request.method) : failure(502, request.method, { 'Retry-After': '60' });
  }
  /* An unsatisfiable range is an answer about this request only: no media
     type on the origin's error body and nothing for a cache to keep. */
  if (upstream.status === 416) {
    const range = upstream.headers.get('Content-Range');
    discard(upstream);
    return failure(416, request.method, range ? { 'Content-Range': range } : {});
  }

  /* Headers are written here, not inherited: raw.githubusercontent answers
     text/plain with a sandbox CSP, and neither must reach a browser or a
     crawler as the description of a real image or film. */
  const file = key.slice(key.indexOf('/') + 1);
  const headers = new Headers({
    ...baseHeaders(),
    'Content-Type': mediaType(key),
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    'Content-Disposition': "inline; filename*=UTF-8''" + encodeURIComponent(file),
    'Accept-Ranges': 'bytes'
  });
  for (const name of PASSED_BACK) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const length = upstream.headers.get('Content-Length');
  if (length && !upstream.headers.get('Content-Encoding') && [200, 206].includes(upstream.status)) {
    headers.set('Content-Length', length);
  }
  const body = request.method === 'HEAD' || upstream.status === 304 ? null : upstream.body;
  return new Response(body, { status: upstream.status, headers });
}
