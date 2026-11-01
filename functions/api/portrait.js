import { json } from './_session.js';
import { readPublicPortrait, readPortraitImage } from './_portrait.js';

const VERSION = /^[a-f0-9]{64}$/;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const version = url.searchParams.get('image');
  if (version === null) {
    try { return json({ ok:true, portrait:await readPublicPortrait(env.DB) }); }
    catch { return json({ ok:false, error:'portrait-unavailable' }, 503); }
  }
  if (!VERSION.test(version)) return json({ ok:false, error:'portrait-not-found' }, 404);

  const etag = `"${version}"`;
  const headers = {
    'Content-Type':'image/webp', 'X-Content-Type-Options':'nosniff',
    'Cache-Control':'public, max-age=31536000, immutable',
    'Cloudflare-CDN-Cache-Control':'public, max-age=31536000, immutable',
    'ETag':etag
  };
  // Cache only immutable public bytes, never owner metadata or credentials.
  const key = new Request(`${url.origin}/api/portrait?image=${version}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  let response;
  try { response = cache && await cache.match(key); } catch {}
  if (!response) {
    try {
      const row = await readPortraitImage(env.DB, version);
      if (!row) return json({ ok:false, error:'portrait-not-found' }, 404);
      const bytes = new Uint8Array(row.image);
      response = new Response(bytes, { headers:{ ...headers, 'Content-Length':String(bytes.byteLength) } });
      if (cache) {
        const saving = cache.put(key, response.clone()).catch(() => {});
        if (context.waitUntil) context.waitUntil(saving); else await saving;
      }
    } catch { return json({ ok:false, error:'portrait-unavailable' }, 503); }
  }
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status:304, headers });
  if (request.method === 'HEAD') return new Response(null, { status:200, headers:response.headers });
  return response;
}

export const onRequestHead = onRequestGet;
