import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequest } from '../functions/[[route]].js';
import { onRequest as onMedia, mediaKeyFromPath } from '../functions/media/[[path]].js';
import {
  COLLECTIONS, EXTRA_MEDIA, ORDER, TABS, catalogFromManifest, isoDuration, mediaPath, workPath
} from '../functions/_gallery-catalog.js';
import { parseWorkPath } from '../functions/_work-page.js';
import { PAGE_GUARD_JS } from '../functions/_page-guard.js';
import { BACK_TO_TOP_HTML, BACK_TO_TOP_JS } from '../functions/_back-to-top.js';
import { ANALYTICS_CLIENT_JS } from '../functions/_analytics-client.js';
import { APPEARANCE_JS } from '../functions/_appearance.js';
import { buildImageSitemap } from '../scripts/generate-image-sitemap.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const manifestText = await read('preview_site/assets/gallery-manifest.json');
const manifest = JSON.parse(manifestText);
const catalog = catalogFromManifest(manifest);

/* A fresh ASSETS object per call: the catalogue is memoised per binding. */
const assets = (body = manifestText, status = 200) => ({
  fetch: async (input) => {
    const pathname = new URL(String(input && input.url ? input.url : input)).pathname;
    if (pathname === '/assets/gallery-manifest.json') return new Response(body, { status });
    if (pathname === '/404.html') return new Response('<!doctype html><title>404</title>');
    return new Response('missing', { status: 404 });
  }
});
const route = (path, { method = 'GET', env = { ASSETS: assets() } } = {}) => onRequest({
  request: new Request(`https://bqurtas.com${path}`, { method, headers: { Accept: 'text/html' } }),
  env,
  next: () => new Response(null, { status: 204 })
});
const media = (path, { method = 'GET', headers = {}, env = { ASSETS: assets() } } = {}) => onMedia({
  request: new Request(`https://bqurtas.com${path}`, { method, headers }),
  env
});
const jsonLd = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

async function loadGallery() {
  const source = await read('preview_site/js/gallery.js');
  const window = {};
  vm.runInNewContext(source, {
    window, document: { addEventListener() {} }, URL, AbortController, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, json: async () => JSON.parse(manifestText) })
  });
  return window.BQ_GALLERY;
}

/* ---------- the server catalogue can never drift from gallery.js ---------- */

test('the server catalogue mirrors gallery.js collections, titles, tabs and translations', async () => {
  const gallery = await loadGallery();
  assert.deepEqual(Object.keys(COLLECTIONS).sort(), Object.keys(gallery.COLLECTIONS).sort());
  const html = await read('preview_site/index.html');
  const tabs = new Set([...html.matchAll(/data-filter="([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== 'all'));
  assert.deepEqual([...tabs].sort(), [...TABS].sort(), 'catalogue TABS must be the real Design tabs');
  const i18n = await read('preview_site/js/i18n.js');
  const galI18n = JSON.parse(i18n.match(/^window\.GAL_I18N = (\{.*\});$/m)[1]);

  for (const [key, server] of Object.entries(COLLECTIONS)) {
    const client = gallery.COLLECTIONS[key];
    for (const field of ['folder', 'title', 'cat', 'tag']) {
      assert.equal(server[field], client[field], `${key}.${field} differs from gallery.js`);
    }
    // The page links to the tab whose filter actually shows this collection.
    const expectedTab = tabs.has(client.cat) ? client.cat : (key === 'tickerlogo' ? 'logo' : '');
    assert.equal(server.tab, expectedTab, `${key} links to the wrong Design tab`);
    assert.equal(server.ku, galI18n.ku[key].title, `${key} Sorani title differs from GAL_I18N`);
    assert.equal(server.ar, galI18n.ar[key].title, `${key} Arabic title differs from GAL_I18N`);
  }
  assert.deepEqual([...ORDER].sort(), Object.keys(COLLECTIONS).sort());
});

test('work page numbers are the same 1-based indexes the gallery cards use', async () => {
  const gallery = await loadGallery();
  assert.equal(await gallery.loadManifest(), true);
  for (const key of Object.keys(COLLECTIONS)) {
    const cards = gallery.items(key);
    const works = catalog.byColl[key];
    assert.equal(works.length, cards.length, `${key} count`);
    cards.forEach((card, i) => {
      assert.equal(works[i].index, card.index);
      assert.equal(`${card.titlePrefix} ${String(card.index).padStart(2, '0')}`, card.title);
      assert.ok(card.url.endsWith('/' + works[i].folder + '/' + encodeURIComponent(works[i].file)), `${key} ${card.index}`);
      assert.equal(works[i].type, card.type);
    });
  }
});

test('gallery cards link to their work page and credit the author in the alt text', async () => {
  const source = await read('preview_site/js/gallery.js');
  assert.match(source, /<a class="card-open" href="\/design\/\$\{item\.coll\}\/\$\{item\.index\}"/);
  assert.doesNotMatch(source, /<button class="card-open"/);
  assert.match(source, /alt="\$\{galAlt\(dispTitle\)\}"/);
  const main = await read('preview_site/js/main.js');
  assert.match(main, /event\.target\.closest\('a\.card-open'\)[\s\S]{0,260}event\.preventDefault\(\)/,
    'a plain click on a card must stay in the lightbox');
});

/* ---------- /design/<coll>/<n> ---------- */

test('work paths are canonical: no zero padding, no language prefix, no trailing slash', () => {
  assert.deepEqual(parseWorkPath('/design/book/7'), { coll: 'book', index: 7 });
  assert.deepEqual(parseWorkPath('/ku/design/book/7'), { redirect: '/design/book/7' });
  assert.deepEqual(parseWorkPath('/design/book/7/'), { redirect: '/design/book/7' });
  for (const bad of ['/design/book/07', '/design/book/0', '/design/book/-1', '/design/book/7a', '/design/book/123456']) {
    assert.deepEqual(parseWorkPath(bad), { status: 404 }, bad);
  }
  for (const other of ['/design/book', '/design', '/design/nope/3', '/xx/design/book/7', '/work/book/7']) {
    assert.equal(parseWorkPath(other), null, other);
  }
});

test('an image work page is a complete, crawlable, same-origin document', async () => {
  const response = await route('/design/book/7');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('content-language'), 'en');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), null);
  const csp = response.headers.get('content-security-policy');
  assert.match(csp, /img-src 'self' data:/);
  const html = await response.text();
  const nonce = csp.match(/style-src 'nonce-([a-f0-9]+)'/)[1];
  assert.match(csp, new RegExp(`script-src 'nonce-${nonce}'(?:;|$)`), 'scripts: this response\'s nonce only');
  assert.match(html, new RegExp(`<style nonce="${nonce}">`));
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<title>Book Cover 07 — Barakat Qurtas, Graphic Designer in Erbil<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bqurtas\.com\/design\/book\/7">/);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large/);
  assert.match(html, /<meta property="og:image" content="https:\/\/bqurtas\.com\/media\/Book\/BookCover7\.webp">/);
  assert.match(html, /<img src="\/media\/Book\/BookCover7\.webp" width="696" height="1039" alt="Book Cover 07 — book cover design by Barakat Qurtas, Kurdish graphic designer in Erbil \(Hewlêr\), Kurdistan"/);
  assert.match(html, /lang="ckb" dir="rtl"/);
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /href="\/design\/book"/);
  assert.match(html, /href="\/contact"/);
  assert.match(html, /href="\/design\/book\/6"/);
  assert.match(html, /href="\/design\/book\/8"/);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/type="application\/ld\+json"/.test(attrs));
  assert.deepEqual(scripts.map(([, attrs, body]) => [attrs, body]), [[` nonce="${nonce}"`, APPEARANCE_JS], [` nonce="${nonce}"`, PAGE_GUARD_JS], [` nonce="${nonce}"`, BACK_TO_TOP_JS], [` nonce="${nonce}"`, ANALYTICS_CLIENT_JS]],
    'only local appearance, page guard, back-to-top and privacy-aware analytics execute, protected by this response nonce');
  assert.match(csp, /connect-src 'self' https:\/\/gateway\.umami\.is\/api\/send(?:;|$)/);
  assert.ok(html.includes(BACK_TO_TOP_HTML));
  assert.match(html, /<body id="page-top">/);
  assert.doesNotMatch(html, /(?:src|href)="https:\/\/(?!bqurtas\.com)/, 'no external requests');

  const graph = jsonLd(html)['@graph'];
  const image = graph.find((node) => node['@type'] === 'ImageObject');
  assert.equal(image.contentUrl, 'https://bqurtas.com/media/Book/BookCover7.webp');
  assert.equal(image.creator['@id'], 'https://bqurtas.com/#person');
  assert.equal(image.acquireLicensePage, 'https://bqurtas.com/contact');
  assert.equal(image.representativeOfPage, true);
  assert.equal(image.width.value, 696);
  assert.ok(image.creditText && image.copyrightNotice);
  const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList').itemListElement.map((item) => item.name);
  assert.deepEqual(crumbs, ['Home', 'Design', 'Book Covers', 'Book Cover 07']);
});

test('a video work page leads with the film and publishes VideoObject data', async () => {
  const response = await route('/design/video/26');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<video controls controlslist="nodownload" playsinline preload="metadata" poster="\/assets\/thumbs\/Videos\/Videos26\.jpg"/);
  assert.match(html, /<source src="\/media\/Videos\/Videos26\.mp4" type="video\/mp4">/);
  const video = jsonLd(html)['@graph'].find((node) => node['@type'] === 'VideoObject');
  assert.equal(video.contentUrl, 'https://bqurtas.com/media/Videos/Videos26.mp4');
  assert.deepEqual(video.thumbnailUrl, ['https://bqurtas.com/assets/thumbs/Videos/Videos26.jpg']);
  assert.match(video.uploadDate, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(video.duration, /^PT/);
});

test('work pages fold variants into the canonical URL and 404 what cannot exist', async () => {
  for (const [path, location] of [['/ku/design/book/7', '/design/book/7'], ['/ar/design/video/3', '/design/video/3'], ['/design/logo/2/', '/design/logo/2']]) {
    const response = await route(path);
    assert.equal(response.status, 301, path);
    assert.equal(response.headers.get('location'), `https://bqurtas.com${location}`);
  }
  for (const path of ['/design/book/07', '/design/book/0', `/design/book/${catalog.byColl.book.length + 1}`, '/design/tickerlogo/9', '/design/nope/3']) {
    const response = await route(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
  const head = await route('/design/book/7', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const outage = await route('/design/book/7', { env: { ASSETS: assets('gone', 500) } });
  assert.equal(outage.status, 503);
  assert.equal(outage.headers.get('x-robots-tag'), 'noindex, nofollow');
});

/* ---------- /media/<Folder>/<file> ---------- */

test('media paths are a strict allowlist, never an open proxy', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => { calls.push(String(url)); return new Response('bytes'); });
  for (const path of [
    '/media/Book/..%2fsecret.webp', '/media/Book/..', '/media/Book%2FBookCover7.webp', '/media/Book/BookCover7.webp%00.png',
    '/media/Book/BookCover999.webp', '/media/Secret/key.webp', '/media/Book/BookCover7.svg', '/media/Book',
    '/media/', '/media/Book/sub/BookCover7.webp', '/media/Book/..%5Csecret.webp', '/media/Book/%E0%A4%A.webp'
  ]) {
    const response = await media(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  assert.deepEqual(calls, [], 'rejected paths must never reach an upstream');
  assert.equal(mediaKeyFromPath('/media/WebsitePortfolio/websiteLogo%26tab.webp'), 'WebsitePortfolio/websiteLogo&tab.webp');

  const post = await media('/media/Book/BookCover7.webp', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('media is served from GitHub through Cloudflare with first-party headers and the query ignored', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('webp-bytes', { headers: {
      'Content-Type': 'text/plain', 'Content-Length': '10', ETag: '"abc"',
      'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Frame-Options': 'deny'
    } });
  });
  const response = await media('/media/Book/BookCover7.webp?url=https://evil.example/x');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'webp-bytes');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Book/BookCover7.webp');
  assert.equal(calls[0].init.cf.cacheEverything, true);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=86400, stale-while-revalidate=604800');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://bqurtas.com');
  assert.match(response.headers.get('content-disposition'), /^inline/);
  assert.equal(response.headers.get('etag'), '"abc"');
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal(response.headers.get('content-security-policy'), null);
  assert.equal(response.headers.get('x-frame-options'), null);
  assert.equal(response.headers.get('x-robots-tag'), null, 'real media must stay indexable');

  const extra = await media('/media/WebsitePortfolio/websiteLogo%26tab.webp');
  assert.equal(extra.status, 200);
  assert.equal(calls.at(-1).url, 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/WebsitePortfolio/websiteLogo%26tab.webp');
});

test('videos use raw GitHub directly for byte ranges and HEAD', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), range: init.headers.get('Range'), method: init.method });
    return new Response(init.method === 'HEAD' ? null : 'abc', {
      status: init.method === 'HEAD' ? 200 : 206,
      headers: init.method === 'HEAD'
        ? { 'Content-Length': '24269001', 'Content-Type': 'text/plain' }
        : { 'Content-Range': 'bytes 0-2/24269001', 'Content-Length': '3', 'Content-Type': 'text/plain' }
    });
  });
  const response = await media('/media/Videos/Videos26.mp4', { headers: { Range: 'bytes=0-2' } });
  assert.equal(response.status, 206);
  assert.equal(await response.text(), 'abc');
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.equal(response.headers.get('content-range'), 'bytes 0-2/24269001');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-length'), '3');
  assert.deepEqual(calls.map((call) => [call.url, call.range]), [
    ['https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos26.mp4', 'bytes=0-2']
  ]);

  const head = await media('/media/Videos/Videos26.mp4', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-length'), '24269001');
  assert.equal(calls.length, 2, 'successful GET and HEAD each use exactly one upstream request');
  assert.equal(calls.at(-1).url, 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos26.mp4');
  assert.equal(calls.at(-1).method, 'HEAD');
});

test('media errors and redirects never try an unrelated hosting provider', async (t) => {
  for (const failure of [503, 302, 'network']) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push({ url: String(url), range: init.headers.get('Range'), condition: init.headers.get('If-Range'), redirect: init.redirect });
      if (failure === 'network') throw new Error('origin unavailable');
      return new Response('origin unavailable', { status: failure, headers: { Location: 'https://outside.example/media.mp4' } });
    });
    const response = await media('/media/Videos/Videos26.mp4', { headers: { Range: 'bytes=0-2', 'If-Range': '"film"' } });
    assert.equal(response.status, 502, String(failure));
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.deepEqual(calls, [
      { url: 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos26.mp4', range: 'bytes=0-2', condition: '"film"', redirect: 'manual' }
    ], String(failure));
  }
});

test('conditional media and unsatisfiable byte ranges retain their upstream semantics', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    calls.push(init);
    if (init.headers.has('Range')) return new Response('range error', {
      status: 416, headers: { 'Content-Range': 'bytes */24269001', 'Content-Type': 'text/html' }
    });
    return new Response(null, { status: 304, headers: { ETag: '"film"', 'Last-Modified': 'Fri, 23 Oct 2026 07:00:00 GMT' } });
  });
  const unchanged = await media('/media/Videos/Videos26.mp4', {
    headers: { 'If-None-Match': '"film"', 'If-Modified-Since': 'Fri, 23 Oct 2026 07:00:00 GMT' }
  });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');
  assert.equal(unchanged.headers.get('etag'), '"film"');
  assert.equal(calls[0].headers.get('If-None-Match'), '"film"');
  assert.equal(calls[0].headers.get('If-Modified-Since'), 'Fri, 23 Oct 2026 07:00:00 GMT');
  const invalidRange = await media('/media/Videos/Videos26.mp4', { method: 'HEAD', headers: { Range: 'bytes=99999999-' } });
  assert.equal(invalidRange.status, 416);
  assert.equal(await invalidRange.text(), '');
  assert.equal(invalidRange.headers.get('content-range'), 'bytes */24269001');
  assert.match(invalidRange.headers.get('cache-control'), /no-store/);
  assert.equal(invalidRange.headers.get('content-type'), 'text/plain; charset=utf-8');
});

test('an upstream header timeout returns an uncached gateway error', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let fetchStarted;
  const started = new Promise(resolve => { fetchStarted = resolve; });
  t.mock.method(globalThis, 'fetch', async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
    fetchStarted();
  }));
  const pending = media('/media/Book/BookCover7.webp');
  await started;
  t.mock.timers.tick(15_000);
  const response = await pending;
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('upstream failures are uncached, noindex errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('gone', { status: 404 }));
  const missing = await media('/media/Book/BookCover7.webp');
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('x-robots-tag'), 'noindex, nofollow');

  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network down'); });
  const down = await media('/media/Book/BookCover7.webp');
  assert.equal(down.status, 502);
  assert.match(down.headers.get('cache-control'), /no-store/);
  assert.equal(down.headers.get('x-robots-tag'), 'noindex, nofollow');

  const noManifest = await media('/media/Book/BookCover7.webp', { env: { ASSETS: assets('nope', 500) } });
  assert.equal(noManifest.status, 503);
});

/* ---------- sitemap-images.xml ---------- */

function assertWellFormed(xml) {
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset /);
  assert.doesNotMatch(xml.replace(/&(?:amp|lt|gt|quot|apos);/g, ''), /&/, 'every ampersand must be escaped');
  const stack = [];
  for (const [, close, name, selfClose] of xml.replace(/<\?xml[^>]*\?>/, '').matchAll(/<(\/?)([a-zA-Z:]+)[^>]*?(\/?)>/g)) {
    if (selfClose) continue;
    if (close) assert.equal(stack.pop(), name, `unbalanced </${name}>`);
    else stack.push(name);
  }
  assert.deepEqual(stack, []);
}

test('the committed image sitemap is exactly what the build generates', async () => {
  const html = await read('preview_site/index.html');
  assert.equal(await read('preview_site/sitemap-images.xml'), buildImageSitemap(manifest, html), 'run npm run build');
});

test('every distinct gallery image and film appears exactly once, under its own work page, on bqurtas.com', async () => {
  const html = await read('preview_site/index.html');
  const xml = buildImageSitemap(manifest, html);
  assertWellFormed(xml);
  assert.match(xml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(xml, /xmlns:video="http:\/\/www\.google\.com\/schemas\/sitemap-video\/1\.1"/);
  assert.doesNotMatch(xml, /<image:(?:title|caption)>/, 'deprecated image tags');
  assert.doesNotMatch(xml, /githubusercontent|jsdelivr/);

  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const homepage = urls.find(block => /<loc>https:\/\/bqurtas\.com<\/loc>/.test(block));
  assert.ok(homepage);
  const heroSource = html.match(/id="heroPortrait"[^>]*>\s*<img[^>]*src="([^"]+)"/)[1];
  assert.ok(homepage.includes(`<image:loc>https://bqurtas.com/${heroSource}</image:loc>`), 'the displayed hero artwork is discoverable under its exact fingerprinted URL');
  assert.doesNotMatch(homepage, /<lastmod>/, 'the homepage has no verified modification date');
  const locs = [];
  const mediaByPage = new Map();
  for (const block of urls) {
    const page = block.match(/<loc>([^<]+)<\/loc>/)[1];
    const found = [...block.matchAll(/<(?:image:loc|video:content_loc)>([^<]+)</g)].map((m) => m[1]);
    for (const loc of [page, ...found, ...[...block.matchAll(/<video:thumbnail_loc>([^<]+)</g)].map((m) => m[1])]) {
      assert.ok(loc.startsWith('https://bqurtas.com'), loc);
      locs.push(loc);
    }
    mediaByPage.set(page, found);
  }
  let images = 0, videos = 0, aliases = 0;
  const hashes = new Set();
  for (const coll of Object.keys(COLLECTIONS)) {
    for (const item of catalog.byColl[coll]) {
      const found = mediaByPage.get(`https://bqurtas.com${workPath(coll, item.index)}`);
      if (item.canonical) {
        // A byte-identical copy is represented by its canonical work only.
        assert.equal(found, undefined, item.path);
        assert.equal(item.canonical.hash, item.hash);
        aliases++;
        continue;
      }
      assert.deepEqual(found, [`https://bqurtas.com${mediaPath(item.path).replace(/&/g, '&amp;')}`], item.path);
      if (item.hash) {
        assert.ok(!hashes.has(item.hash), `image listed twice: ${item.path}`);
        hashes.add(item.hash);
      }
      if (item.type === 'video') videos++; else images++;
    }
  }
  assert.ok(aliases > 0, 'the catalogue knows its duplicate copies');
  assert.equal(images + aliases, manifest.images.length);
  assert.equal(videos, manifest.videos.length);
  assert.equal(videos, 30);
  const allMedia = [...mediaByPage.values()].flat();
  assert.equal(new Set(allMedia).size, allMedia.length, 'no media listed twice');
  assert.equal((xml.match(/<video:video>/g) || []).length, 30);
  for (const block of urls.filter((b) => b.includes('<video:video>'))) {
    for (const tag of ['thumbnail_loc', 'title', 'description', 'content_loc', 'publication_date', 'family_friendly']) {
      assert.match(block, new RegExp(`<video:${tag}>`), tag);
    }
  }
});

test('every page and poster the sitemap names exists', async () => {
  const xml = buildImageSitemap(manifest, await read('preview_site/index.html'));
  for (const [, loc] of xml.matchAll(/<video:thumbnail_loc>https:\/\/bqurtas\.com([^<]+)</g)) {
    assert.ok(existsSync(new URL(`../preview_site${loc}`, import.meta.url)), loc);
  }
  for (const [, loc] of xml.matchAll(/<image:loc>https:\/\/bqurtas\.com\/assets\/([^<?]+)/g)) {
    assert.ok(existsSync(new URL(`../preview_site/assets/${loc}`, import.meta.url)), loc);
  }
  const env = { ASSETS: assets() };
  for (const [, path] of xml.matchAll(/<loc>https:\/\/bqurtas\.com([^<]*)<\/loc>/g)) {
    if (!path.startsWith('/design/')) continue;
    assert.equal((await route(path, { method: 'HEAD', env })).status, 200, path);
  }
});

test('the extra repository images are allowlisted exactly', async () => {
  for (const folder of ['WorkWith', 'WebsitePortfolio', 'Blog']) {
    const files = (await readdir(new URL(`../${folder}/`, import.meta.url))).filter((f) => !f.startsWith('.')).sort();
    const listed = EXTRA_MEDIA.filter((e) => e.path.startsWith(folder + '/')).map((e) => e.path.slice(folder.length + 1)).sort();
    assert.deepEqual(listed, files, folder);
  }
});

test('film lengths are ISO 8601 durations', () => {
  assert.equal(isoDuration(28.03), 'PT28S');
  assert.equal(isoDuration(70.04), 'PT1M10S');
  assert.equal(isoDuration(3600), 'PT1H');
});

test('a duplicate copy redirects to the one canonical work for that image', async () => {
  const alias = Object.values(catalog.byColl).flat().find((item) => item.canonical && item.coll === 'general');
  assert.ok(alias, 'GeneralDesign repeats artwork from the specific collections');
  assert.notEqual(alias.canonical.coll, 'general', 'the specific collection owns the page');
  const response = await route(workPath(alias.coll, alias.index));
  assert.equal(response.status, 301);
  assert.equal(new URL(response.headers.get('Location')).pathname, workPath(alias.canonical.coll, alias.canonical.index));
});

test('certificates are about him, not licensed as his own artwork', async () => {
  const html = await (await route('/design/certificate/1')).text();
  const image = jsonLd(html)['@graph'].find((node) => node['@type'] === 'ImageObject');
  for (const key of ['creator', 'copyrightHolder', 'creditText', 'copyrightNotice', 'acquireLicensePage']) {
    assert.equal(image[key], undefined, key);
  }
  assert.deepEqual(image.about, { '@id': 'https://bqurtas.com/#person' });
});
