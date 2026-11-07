/* GET /api/behance-cover?id=<project id>&f=<cover file>&s=404|808
   The cover of a project that is on Behance but not copied here yet, served
   from this site so a visitor's browser never calls Behance. Only covers of
   the owner's own projects (present in his public feed) are ever fetched,
   and only from Behance's image host. */
import { COVER_FILE, readBehanceFeed } from './_behance-feed.js';

const SIZES = new Set(['404', '808']);
const missing = () => new Response('Not found', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const file = url.searchParams.get('f') || '';
  const size = url.searchParams.get('s') || '808';
  const match = COVER_FILE.exec(file);
  if (!match || match[2] !== id || !SIZES.has(size)) return missing();
  let item;
  try {
    item = (await readBehanceFeed()).find((entry) => entry.id === id && entry.cover === file);
  } catch (e) {
    return missing();
  }
  if (!item) return missing();
  const upstream = await fetch(`https://mir-s3-cdn-cf.behance.net/projects/${size}/${encodeURIComponent(file)}`, {
    headers: { 'User-Agent': 'bqurtas.com (+https://bqurtas.com)' },
    cf: { cacheTtl: 86400, cacheEverything: true },
  }).catch(() => null);
  const type = upstream?.headers.get('Content-Type') || '';
  if (!upstream || !upstream.ok || !type.startsWith('image/')) return missing();
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
}
