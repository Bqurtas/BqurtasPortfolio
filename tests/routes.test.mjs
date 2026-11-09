import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/[[route]].js';
import { onRequestPost as onTwoFactorPost } from '../functions/api/2fa.js';
import { behanceCatalogue, shortDescription } from '../functions/_behance-catalog.js';

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

test('blog lookup distinguishes a confirmed missing D1 post from a database outage', async () => {
  const assets = { fetch: async () => new Response('<!doctype html><title>404</title>') };
  const emptyDB = {
    prepare() { return { bind() { return this; }, async run() { return { success:true }; }, async first() { return null; }, async all() { return { results:[] }; } }; },
    batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  const missing = await onRequest({
    request: new Request('https://bqurtas.com/blog/42', { headers: { Accept: 'text/html' } }),
    env: { ASSETS:assets, DB:emptyDB }, next:() => new Response(null, { status:204 })
  });
  assert.equal(missing.status, 404);

  const unavailable = await onRequest({
    request: new Request('https://bqurtas.com/blog/42', { headers: { Accept: 'text/html' } }),
    env: { ASSETS:assets, DB:{ prepare() { throw new Error('database unavailable'); } } },
    next:() => new Response(null, { status:204 })
  });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('retry-after'), '60');
  assert.equal(unavailable.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('known app routes and static files continue to Pages', async () => {
  assert.equal((await runRoute('/blog/12')).status, 204);
  assert.equal((await runRoute('/assets/avatar.webp', 'image/avif,image/webp,*/*')).status, 204);
  assert.equal((await runRoute('/uploads/published-cover.webp', 'text/html')).status, 204, 'uploaded media can be opened directly as well as embedded');
  assert.equal((await runRoute('/font-assets/0123456789abcdef-Body.woff2', 'text/html')).status, 204, 'font files keep their static caching policy even when opened directly');
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

test('autodiscover cancels oversized streams without trusting Content-Length', async () => {
  for (const declared of [undefined, '8']) {
    let pulls = 0, canceled = false;
    const body = new ReadableStream({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(1_024));
        if (pulls === 100) controller.close();
      },
      cancel() { canceled = true; }
    });
    const response = await onRequest({
      request: new Request('https://bqurtas.com/autodiscover/autodiscover.xml', {
        method: 'POST', body, duplex: 'half',
        headers: { 'Content-Type': 'text/xml', ...(declared ? { 'Content-Length': declared } : {}) }
      }),
      env: {}, next: () => assert.fail('autodiscover must handle its own request')
    });
    assert.equal(response.status, 413);
    assert.equal(canceled, true);
    assert.ok(pulls < 22, `read ${pulls} chunks before rejecting the oversized request`);
  }
});

test('autodiscover enforces its byte boundary while preserving valid mail discovery', async () => {
  const email = '<EMailAddress>studio@bqurtas.com</EMailAddress>';
  for (const [body, expected] of [
    [email.padEnd(16_384, ' '), 200],
    [email + 'ە'.repeat(9_000), 413]
  ]) {
    const response = await onRequest({
      request: new Request('https://bqurtas.com/autodiscover/autodiscover.xml', {
        method: 'POST', headers: { 'Content-Type': 'text/xml' }, body
      }),
      env: {}, next: () => assert.fail('autodiscover must handle its own request')
    });
    assert.equal(response.status, expected);
    if (expected === 200) assert.match(await response.text(), /<LoginName>studio@bqurtas\.com<\/LoginName>/);
  }
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

test('route CSP limits external runtime access to GitHub and the consent-gated Umami collection endpoint', async () => {
  const source = await readFile(new URL('../functions/[[route]].js', import.meta.url), 'utf8');
  assert.match(source, /connect-src 'self' https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com/);
  assert.match(source, /img-src 'self' data: blob: https:\/\/raw\.githubusercontent\.com/);
  assert.match(source, /media-src 'self' blob: https:\/\/raw\.githubusercontent\.com/);
  assert.match(source, /connect-src 'self' https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com https:\/\/gateway\.umami\.is\/api\/send/);
  assert.doesNotMatch(source, /translate\.googleapis|statically\.io|jsdelivr|weserv|web3forms|cloud\.umami/);
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

test('a missing D1 binding is a temporary blog failure, never a confirmed missing post', async () => {
  const response = await onRequest({
    request: new Request('https://bqurtas.com/blog/42'),
    env: { ASSETS: { fetch: async () => new Response('shell') } },
    next: () => new Response(null, { status:204 })
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '60');
});

test('sitemaps and ownership verification obey HEAD and reject missing source assets', async (t) => {
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

/* ---------- the Behance room and its project pages ---------- */

const BEHANCE_CATALOGUE = {
  profile: 'https://www.behance.net/bqurtas',
  synced: '2026-11-07',
  projects: [
    {
      id: '258156477', slug: 'barakat-qurtas-selected-works-20142026',
      title: 'Barakat Qurtas — Selected Works 2014–2026',
      url: 'https://www.behance.net/gallery/258156477/Barakat-Qurtas-Selected-Works-20142026',
      date: '2026-11-06',
      about: ['Twelve years. Twelve disciplines. One desk in Hewlêr.', 'A catalogue of selected work.'],
      tools: ['Adobe Illustrator'],
      tags: ['portfolio', 'brand identity', 'Kurdistan'],
      cover: { src: '/assets/behance/258156477/cover.webp', small: '/assets/behance/258156477/cover-404.webp', w: 808, h: 632 },
      images: [{ src: '/assets/behance/258156477/01.webp', w: 1400, h: 1040 }, { src: '/assets/behance/258156477/02.webp', w: 1400, h: 1000 }]
    },
    {
      id: '243902845', slug: 'photography', title: 'PHOTOGRAPHY',
      url: 'https://www.behance.net/gallery/243902845/PHOTOGRAPHY',
      date: '2026-02-10', about: [], tools: [], tags: ['Photography'],
      cover: { src: '/assets/behance/243902845/cover.webp', small: '/assets/behance/243902845/cover-404.webp', w: 808, h: 632 },
      images: [{ src: '/assets/behance/243902845/01.webp', w: 1400, h: 606 }]
    }
  ]
};
const STATIC_SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
  + '  <url>\n    <loc>https://bqurtas.com/behance</loc>\n  </url>\n</urlset>\n';

/* A fresh ASSETS object per call: the catalogue is memoised per binding. */
const behanceAssets = ({ catalogue = JSON.stringify(BEHANCE_CATALOGUE), status = 200 } = {}) => ({
  fetch: async (input) => {
    const pathname = new URL(String(input && input.url ? input.url : input)).pathname;
    if (pathname === '/assets/behance/projects.json') return new Response(catalogue, { status });
    if (pathname === '/index.html') return new Response('<!doctype html><html><head><title>shell</title></head></html>', { headers: { 'Content-Type': 'text/html' } });
    if (pathname === '/404.html') return new Response('<!doctype html><title>404</title>');
    if (pathname === '/sitemap.xml') return new Response(STATIC_SITEMAP);
    return new Response('missing', { status: 404 });
  }
});
const behanceRoute = (path, env = { ASSETS: behanceAssets() }) => onRequest({
  request: new Request(`https://bqurtas.com${path}`, { headers: { Accept: 'text/html' } }),
  env,
  next: () => new Response(null, { status: 204 })
});

/* Records what the edge would rewrite, so a test can apply one selector's
   handlers to a stand-in element and read the result. */
function recordRewrites(t) {
  const original = globalThis.HTMLRewriter;
  const record = { handlers: [] };
  globalThis.HTMLRewriter = class {
    constructor() { record.handlers = []; }
    on(selector, handler) { record.handlers.push([selector, handler]); return this; }
    transform(response) { return response; }
  };
  t.after(() => {
    if (original === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = original;
  });
  record.apply = (selector, attrs = {}) => {
    const element = {
      attrs: { ...attrs }, content: undefined, appended: '',
      getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
      setAttribute(name, value) { this.attrs[name] = String(value); },
      setInnerContent(value) { this.content = value; },
      append(value) { this.appended += value; }
    };
    for (const [registered, handler] of record.handlers) if (registered === selector && handler.element) handler.element(element);
    return element;
  };
  return record;
}

test('localized pages share refreshed covers and retain canonical URLs and image dimensions', async (t) => {
  const page = recordRewrites(t);
  const shell = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const shellMeta = (name) => shell.match(new RegExp('<meta (?:property|name)="' + name + '" content="([^"]+)"'))?.[1];
  const imageMeta = (name) => page.apply(`meta[property="${name}"]`, { content: shellMeta(name) }).attrs.content;
  const defaultCover = 'https://bqurtas.com/assets/covers/en-home.jpg?v=5';
  assert.equal(shellMeta('og:image'), defaultCover);
  assert.equal(shellMeta('twitter:image'), defaultCover);

  const routes = [
    ['home', ''], ['design', '/design'], ['blog', '/blog'], ['bio', '/bio'],
    ['contact', '/contact'], ['behance', '/behance'],
    ...['logo', 'official', 'book', 'posters', 'social', 'events', 'stationery', 'image', 'video', 'other', 'certificate']
      .map((key) => [key, '/design/' + key])
  ];
  for (const lang of ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv']) {
    for (const [key, suffix] of routes) {
      const path = (lang === 'en' ? '' : '/' + lang) + suffix || '/';
      const response = await behanceRoute(path);
      const cover = `https://bqurtas.com/assets/covers/${lang}-${key}.jpg?v=5`;
      const canon = 'https://bqurtas.com' + path;
      assert.equal(response.status, 200, path);
      assert.equal(imageMeta('og:image'), cover, path);
      assert.equal(page.apply('meta[name="twitter:image"]').attrs.content, cover, path);
      assert.equal(imageMeta('og:image:type'), 'image/jpeg', path);
      assert.equal(imageMeta('og:image:width'), '1200', path);
      assert.equal(imageMeta('og:image:height'), '630', path);
      assert.equal(page.apply('meta[property="og:url"]').attrs.content, canon, path);
      assert.equal(page.apply('link[rel="canonical"]').attrs.href, canon, path);
      const bytes = await readFile(new URL(`../preview_site/assets/covers/${lang}-${key}.jpg`, import.meta.url));
      assert.deepEqual(jpegDimensions(bytes), { width: 1200, height: 630 }, path);
    }
  }
});

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'cover is a JPEG');
  for (let offset = 2; offset + 8 < bytes.length;) {
    assert.equal(bytes[offset], 0xff, 'valid JPEG marker');
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    if (marker === 0xda || marker === 0xd9) break;
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw new Error('cover has no supported JPEG frame');
}

test('the Behance room and well-formed project links are application routes', async () => {
  for (const path of ['/behance', '/ku/behance', '/sv/behance/', '/behance/258156477-barakat-qurtas-selected-works-20142026',
    '/ar/behance/243902845', '/behance/243902845-PHOTOGRAPHY']) {
    assert.equal((await runRoute(path)).status, 204, path);
  }
  for (const path of ['/behance/0', '/behance/abc', '/behance/1/2', '/behance/12345', '/behance/0243902845',
    '/behance/243902845photography', '/behance/243902845-photo_graphy', '/ku/behance/243902845-photography/extra']) {
    assert.equal((await runRoute(path)).status, 404, `${path} is not a project URL`);
  }
});

test('Behance project pages answer from the catalogue: unknown 404, outage 503, other spellings 301', async () => {
  const unknown = await behanceRoute('/behance/999999999-missing');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.headers.get('x-robots-tag'), 'noindex, nofollow');

  for (const assets of [behanceAssets({ status: 404 }), behanceAssets({ catalogue: '<html>not json</html>' }), behanceAssets({ catalogue: '{"projects":"none"}' })]) {
    const unavailable = await behanceRoute('/behance/243902845-photography', { ASSETS: assets });
    assert.equal(unavailable.status, 503, 'an unreadable catalogue is temporary, never a confirmed missing project');
    assert.equal(unavailable.headers.get('retry-after'), '60');
    assert.equal(unavailable.headers.get('x-robots-tag'), 'noindex, nofollow');
  }

  for (const [path, location] of [
    ['/behance/258156477', '/behance/258156477-barakat-qurtas-selected-works-20142026'],
    ['/ku/behance/258156477?ref=old&x=1', '/ku/behance/258156477-barakat-qurtas-selected-works-20142026?ref=old&x=1'],
    ['/behance/243902845-PHOTOGRAPHY', '/behance/243902845-photography'],
    ['/fr/behance/243902845-Photography?utm_source=behance', '/fr/behance/243902845-photography?utm_source=behance'],
    ['/ar/behance/243902845-an-old-title', '/ar/behance/243902845-photography'],
    ['/behance/243902845-photography/', '/behance/243902845-photography']
  ]) {
    const response = await behanceRoute(path);
    assert.equal(response.status, 301, path);
    assert.equal(response.headers.get('location'), 'https://bqurtas.com' + location, path);
  }
});

test('a canonical Behance project page carries its own title, description, cover and CreativeWork', async (t) => {
  const page = recordRewrites(t);
  const path = '/behance/258156477-barakat-qurtas-selected-works-20142026';
  const canon = 'https://bqurtas.com' + path;
  const cover = 'https://bqurtas.com/assets/behance/258156477/cover.webp';
  const response = await behanceRoute(path);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-language'), 'en');

  // The project title already opens with the owner's name, so it is not repeated.
  const title = 'Barakat Qurtas — Selected Works 2014–2026';
  assert.equal(page.apply('title').content, title);
  assert.equal(page.apply('meta[property="og:title"]').attrs.content, title);
  assert.equal(page.apply('meta[name="description"]').attrs.content, 'Twelve years. Twelve disciplines. One desk in Hewlêr.');
  assert.equal(page.apply('meta[property="og:image"]').attrs.content, cover);
  assert.equal(page.apply('meta[name="twitter:image"]').attrs.content, cover);
  assert.equal(page.apply('meta[property="og:image:type"]').attrs.content, 'image/webp');
  assert.equal(page.apply('meta[property="og:image:width"]', { content: '1200' }).attrs.content, '808');
  assert.equal(page.apply('meta[property="og:image:height"]', { content: '630' }).attrs.content, '632');
  assert.equal(page.apply('link[rel="canonical"]').attrs.href, canon);
  assert.equal(page.apply('meta[property="og:url"]').attrs.content, canon);
  assert.equal(page.apply('link[data-alt-lang="ku"]').attrs.href, 'https://bqurtas.com/ku' + path);
  assert.equal(page.apply('link[data-alt-lang="x-default"]').attrs.href, canon);

  const html = page.apply('html');
  assert.equal(html.attrs['data-room'], 'behance', 'a project opens the Behance room');
  assert.equal(html.attrs['data-initial-route'], 'behance');
  assert.doesNotMatch(page.apply('#behance.room', { class: 'room paper-stack is-hidden' }).attrs.class, /is-hidden/);
  assert.match(page.apply('#design.room', { class: 'room' }).attrs.class, /is-hidden/);

  const head = page.apply('head').appended;
  assert.match(head, /^<script nonce="[a-f0-9]{32}" type="application\/ld\+json">/);
  const work = JSON.parse(head.match(/<script[^>]*>([\s\S]*)<\/script>/)[1]);
  assert.equal(work['@type'], 'CreativeWork');
  assert.equal(work['@id'], canon + '#work');
  assert.equal(work.name, 'Barakat Qurtas — Selected Works 2014–2026');
  assert.equal(work.url, canon);
  assert.equal(work.sameAs, 'https://www.behance.net/gallery/258156477/Barakat-Qurtas-Selected-Works-20142026');
  assert.equal(work.datePublished, '2026-11-06');
  assert.deepEqual(work.keywords, ['portfolio', 'brand identity', 'Kurdistan']);
  assert.deepEqual(work.image, [cover, 'https://bqurtas.com/assets/behance/258156477/01.webp', 'https://bqurtas.com/assets/behance/258156477/02.webp']);
  assert.equal(work.author['@id'], 'https://bqurtas.com/#person');
  assert.equal(work.mainEntityOfPage['@id'], canon + '#webpage');
  const graph = JSON.parse(page.apply('#site-schema').content)['@graph'];
  const webpage = graph.find((node) => node['@id'] === canon + '#webpage');
  assert.equal(webpage['@type'], 'ItemPage');
  assert.equal(webpage.mainEntity['@id'], canon + '#work');

  // Without an about paragraph the room description stands in, in the page's language.
  const ku = await behanceRoute('/ku/behance/243902845-photography');
  assert.equal(ku.status, 200);
  assert.equal(ku.headers.get('content-language'), 'ckb');
  assert.equal(page.apply('title').content, 'PHOTOGRAPHY — بەرەکات قورتاس');
  assert.match(page.apply('meta[name="description"]').attrs.content, /^هەموو پڕۆژەکانی Behance/);
  assert.equal(JSON.parse(page.apply('head').appended.match(/<script[^>]*>([\s\S]*)<\/script>/)[1]).author.name, 'بەرەکات قورتاس');

  const room = await behanceRoute('/fr/behance');
  assert.equal(room.status, 200);
  assert.equal(page.apply('title').content, 'Behance — Barakat Qurtas');
  assert.match(page.apply('meta[name="description"]').attrs.content, /^Tous les projets Behance/);
  assert.equal(page.apply('meta[property="og:image"]').attrs.content, 'https://bqurtas.com/assets/covers/fr-behance.jpg?v=5');
  assert.equal(page.apply('meta[property="og:image:width"]', { content: '1200' }).attrs.content, '1200', 'room covers keep the shell size');
  assert.equal(page.apply('head').appended, '');
  assert.equal(page.apply('html').attrs['data-room'], 'behance');
});

test('the Behance catalogue yields only safe, canonical project data', () => {
  const { projects, byId } = behanceCatalogue({ projects: [
    { id: '243902845', slug: 'Photography', title: '  PHOTOGRAPHY  ', url: 'https://evil.example/243902845', date: '2026-02-31',
      tags: ['photo', 'photo', ''], cover: { src: '/assets/behance/243902845/cover.webp', w: 808 },
      images: [{ src: '/assets/behance/243902845/01.webp' }, { src: '/assets/behance/../secret.webp' }, { src: 'https://cdn.example/x.webp' },
        { src: '/assets/behance/243902845/02.gif?v=0123456789ab' }, { src: '/assets/behance/243902845/03.webp?x=1' },
        { src: '/assets/behance/243902845/04.webp?v=0123456789ab&x=1' }] },
    { id: '243902845', slug: 'duplicate', title: 'Duplicate' },
    { id: '0123', slug: 'bad-id' },
    { id: 258156477, slug: '', title: 'Untitled slug' },
    null
  ] });
  assert.deepEqual(projects.map((p) => p.segment), ['243902845-photography', '258156477']);
  const photo = byId.get('243902845');
  assert.equal(photo.title, 'PHOTOGRAPHY');
  assert.equal(photo.url, '', 'only Behance URLs are published as sameAs');
  assert.equal(photo.date, '', 'an impossible date is dropped');
  assert.deepEqual(photo.tags, ['photo']);
  assert.equal(photo.cover, null, 'a cover without its size is not used for the share card');
  assert.deepEqual(photo.images, ['/assets/behance/243902845/01.webp', '/assets/behance/243902845/02.gif?v=0123456789ab'],
    'only first-party files, with at most the sync\'s content stamp');
  assert.throws(() => behanceCatalogue({ projects: 'none' }), /invalid behance catalogue/);

  const long = 'A catalogue of selected work by Barakat Qurtas, a Kurdish multidisciplinary designer, creative technologist and photographer in Hewlêr (Erbil), Kurdistan Region. Since 2014.';
  const short = shortDescription(long);
  assert.ok(Array.from(short).length <= 160, short);
  assert.match(short, /…$/);
  assert.ok(long.startsWith(short.slice(0, -1)), 'cut on a word boundary of the original text');
  assert.equal(shortDescription('  Twelve years.\n One desk. '), 'Twelve years. One desk.');
});

test('the sitemap lists every Behance project in all seven languages and survives a broken catalogue', async (t) => {
  const response = await behanceRoute('/sitemap.xml');
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.ok(xml.includes('<loc>https://bqurtas.com/behance</loc>'), 'the static room entry stays');
  const prefixes = ['', '/ku', '/kmr', '/ar', '/fr', '/tr', '/sv'];
  for (const prefix of prefixes) {
    assert.ok(xml.includes(`<loc>https://bqurtas.com${prefix}/behance/258156477-barakat-qurtas-selected-works-20142026</loc>`), prefix || 'en');
    assert.ok(xml.includes(`<loc>https://bqurtas.com${prefix}/behance/243902845-photography</loc>`), prefix || 'en');
  }
  assert.equal((xml.match(/<lastmod>2026-11-06<\/lastmod>/g) || []).length, 7);
  assert.equal((xml.match(/<lastmod>2026-02-10<\/lastmod>/g) || []).length, 7);
  assert.equal((xml.match(/hreflang="ckb" href="https:\/\/bqurtas\.com\/ku\/behance\/243902845-photography"/g) || []).length, 7);
  assert.equal((xml.match(/hreflang="x-default" href="https:\/\/bqurtas\.com\/behance\/243902845-photography"/g) || []).length, 7);
  assert.match(xml, /<\/url>\n<\/urlset>\n$/);

  // Every listed project URL is canonical: it is served, not redirected.
  recordRewrites(t);
  const listed = [...xml.matchAll(/<loc>https:\/\/bqurtas\.com([^<]*\/behance\/[^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(listed.length, 14);
  for (const path of listed) assert.equal((await behanceRoute(path)).status, 200, path);

  for (const assets of [behanceAssets({ status: 404 }), behanceAssets({ catalogue: 'not json' })]) {
    const fallback = await behanceRoute('/sitemap.xml', { ASSETS: assets });
    assert.equal(fallback.status, 200, 'a missing catalogue never breaks the sitemap');
    const text = await fallback.text();
    assert.ok(text.includes('<loc>https://bqurtas.com/behance</loc>'));
    assert.doesNotMatch(text, /\/behance\/\d/);
  }
});
