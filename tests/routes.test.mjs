import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/[[route]].js';
import { onRequestPost as onTwoFactorPost } from '../functions/api/2fa.js';

const runRoute = (path, accept = 'text/html') => onRequest({
  request: new Request(`https://bqurtas.com${path}`, { headers: { Accept: accept } }),
  env: {},
  next: () => new Response(null, { status: 204 })
});

test('retired routes redirect to canonical destinations and preserve locale/query', async () => {
  const work = await runRoute('/ku/work/identity?ref=old');
  assert.equal(work.status, 301);
  assert.equal(work.headers.get('location'), 'https://bqurtas.com/ku/design?ref=old');

  const stationery = await runRoute('/design/business');
  assert.equal(stationery.status, 301);
  assert.equal(stationery.headers.get('location'), 'https://bqurtas.com/design/stationery');

  const studio = await runRoute('/ar/panjamor');
  assert.equal(studio.status, 301);
  assert.equal(studio.headers.get('location'), 'https://bqurtas.com/ar/contact');
});

test('unknown document routes are real noindex 404 responses', async () => {
  const response = await runRoute('/this-page-does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'no-store');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains; preload');
});

test('blog IDs are finite positive decimal strings without number coercion', async () => {
  for (const path of ['/blog/0', '/blog/01', '/blog/-1', '/blog/1234567890123456789']) {
    assert.equal((await runRoute(path)).status, 404, `${path} should not enter the blog lookup route`);
  }
  assert.equal((await runRoute('/blog/123456789012345678')).status, 204);
});

test('blog lookup distinguishes a confirmed missing post from an upstream outage', async () => {
  const originalFetch = globalThis.fetch;
  const assets = { fetch: async () => new Response('<!doctype html><title>404</title>') };
  try {
    globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    const missing = await onRequest({
      request: new Request('https://bqurtas.com/blog/42', { headers: { Accept: 'text/html' } }),
      env: { ASSETS: assets },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(missing.status, 404);

    globalThis.fetch = async () => new Response('upstream unavailable', { status: 503 });
    const unavailable = await onRequest({
      request: new Request('https://bqurtas.com/blog/42', { headers: { Accept: 'text/html' } }),
      env: { ASSETS: assets },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get('retry-after'), '60');
    assert.equal(unavailable.headers.get('x-robots-tag'), 'noindex, nofollow');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('known app routes and static files continue to Pages', async () => {
  assert.equal((await runRoute('/blog/12')).status, 204);
  assert.equal((await runRoute('/assets/avatar.webp', 'image/avif,image/webp,*/*')).status, 204);
  assert.equal((await runRoute('/sitemap-images.xml', 'application/xml')).status, 204);
});

test('every visible gallery category has a working localized deep link', async () => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const filters = [...new Set([...html.matchAll(/data-filter="([^"]+)"/g)].map(match => match[1]))];
  assert.ok(filters.includes('certificate'));
  for (const lang of ['', '/ku', '/kmr', '/ar', '/fr', '/tr', '/sv']) {
    for (const filter of filters) {
      const path = `${lang}/design${filter === 'all' ? '' : '/' + filter}`;
      assert.equal((await runRoute(path)).status, 204, path);
    }
  }
});

test('document routes reject state-changing HTTP methods', async () => {
  const response = await onRequest({
    request: new Request('https://bqurtas.com/bio', { method: 'POST' }),
    env: {},
    next: () => new Response(null, { status: 204 })
  });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('every canonical sitemap page is handled by the application router', async () => {
  const xml = await readFile(new URL('../preview_site/sitemap.xml', import.meta.url), 'utf8');
  const urls = [...xml.matchAll(/<loc>(https:\/\/bqurtas\.com[^<]*)<\/loc>/g)]
    .map((match) => new URL(match[1]));
  assert.ok(urls.length > 0, 'sitemap.xml should contain canonical page URLs');

  for (const url of urls) {
    const response = await runRoute(url.pathname);
    assert.notEqual(response.status, 404, `${url.pathname} is listed in the sitemap but the router returns 404`);
  }
});

test('mail autoconfig and autodiscover publish SpaceMail IMAP/SMTP hosts', async () => {
  const auto = await runRoute('/.well-known/autoconfig/mail/config-v1.1.xml', 'application/xml');
  assert.equal(auto.status, 200);
  const autoXml = await auto.text();
  assert.match(autoXml, /mail\.spacemail\.com/);
  assert.match(autoXml, /<port>993<\/port>/);
  assert.match(autoXml, /<port>465<\/port>/);

  const discover = await onRequest({
    request: new Request('https://bqurtas.com/autodiscover/autodiscover.xml', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: '<Autodiscover><Request><EMailAddress>hello@bqurtas.com</EMailAddress></Request></Autodiscover>'
    }),
    env: {},
    next: () => new Response(null, { status: 204 })
  });
  assert.equal(discover.status, 200);
  const discoverXml = await discover.text();
  assert.match(discoverXml, /<Server>mail\.spacemail\.com<\/Server>/);
  assert.match(discoverXml, /<LoginName>hello@bqurtas.com<\/LoginName>/);
});

test('two-factor authentication fails closed without server secrets', async () => {
  const response = await onTwoFactorPost({
    request: new Request('https://bqurtas.com/api/2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', pin: 'anything' })
    }),
    env: {}
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: 'not-configured' });
});

test('route CSP permits only the external origins used by translation and gallery fallback', async () => {
  const source = await readFile(new URL('../functions/[[route]].js', import.meta.url), 'utf8');
  assert.match(source, /connect-src[^\n]*https:\/\/translate\.googleapis\.com/);
  assert.match(source, /img-src[^\n]*https:\/\/cdn\.statically\.io/);
  assert.match(source, /media-src[^\n]*https:\/\/cdn\.statically\.io/);
  assert.doesNotMatch(source, /bq_fresh=1/);
});

test('rewritten routes discard static validators and return bodyless HEAD responses', async (t) => {
  const originalRewriter = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class {
    on() { return this; }
    transform(response) { return response; }
  };
  t.after(() => {
    if (originalRewriter === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = originalRewriter;
  });
  for (const method of ['GET', 'HEAD']) {
    const response = await onRequest({
      request: new Request('https://bqurtas.com/ku/bio', { method }),
      env: { ASSETS: { fetch: async () => new Response('<html>shell</html>', { headers: {
        'Content-Type': 'text/html', 'Content-Length': '18', ETag: '"static-shell"',
        'Last-Modified': 'Wed, 09 Sep 2026 12:00:00 GMT', Age: '300', 'CF-Cache-Status': 'HIT'
      } }) } },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(response.status, 200);
    for (const name of ['Content-Length', 'ETag', 'Last-Modified', 'Age', 'CF-Cache-Status']) {
      assert.equal(response.headers.get(name), null, `${name} must not describe the pre-rewrite shell`);
    }
    assert.equal(response.headers.get('content-language'), 'ckb');
    assert.match(response.headers.get('content-security-policy'), /script-src 'nonce-/);
    assert.equal(await response.text(), method === 'HEAD' ? '' : '<html>shell</html>');
  }
});

test('malformed successful blog lookups are temporary failures, not confirmed missing posts', async (t) => {
  for (const payload of [{ message: 'temporarily unavailable' }, [null], ['invalid-row']]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(payload));
    const response = await onRequest({
      request: new Request('https://bqurtas.com/blog/42'),
      env: { ASSETS: { fetch: async () => new Response('shell') } },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '60');
  }
});

test('sitemaps and ownership verification obey HEAD and reject missing source assets', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json([]));
  for (const path of ['/sitemap.xml', '/sitemap-images.xml', '/googlece435b444cb43243.html']) {
    const response = await onRequest({
      request: new Request(`https://bqurtas.com${path}`, { method: 'HEAD' }),
      env: { ASSETS: { fetch: async () => new Response('<urlset></urlset>') } },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  }
  for (const path of ['/bio', '/sitemap.xml', '/sitemap-images.xml']) {
    const response = await onRequest({
      request: new Request(`https://bqurtas.com${path}`),
      env: { ASSETS: { fetch: async () => new Response('Missing asset', { status: 404 }) } },
      next: () => new Response(null, { status: 204 })
    });
    assert.equal(response.status, 503, `missing source for ${path} must not be published as success`);
  }
});
