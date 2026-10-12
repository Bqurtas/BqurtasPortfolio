import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildMediaArchive, generateMediaArchive } from '../scripts/generate-media-archive.mjs';
import { catalogFromManifest, mediaPath, workPath } from '../functions/_gallery-catalog.js';
import { onRequest } from '../functions/[[route]].js';
import { resolveRequestTarget } from '../scripts/dev-server.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const manifest = JSON.parse(await readFile(path.join(root, 'preview_site/assets/gallery-manifest.json'), 'utf8'));
const generated = buildMediaArchive(manifest);
const catalog = catalogFromManifest(manifest);

test('every catalogue work is listed once and links to its canonical work page', () => {
  const pages = [...generated.files].filter(([name]) => name.startsWith('archive/') && name !== 'archive/index.html');
  const cards = pages.flatMap(([, html]) => [...html.matchAll(/<article class="card" id="([^"]+)">([\s\S]*?)<\/article>/g)]);
  assert.equal(cards.length, manifest.images.length + manifest.videos.length);
  for (const item of catalog.byPath.values()) {
    const owner = item.canonical || item;
    const card = cards.filter(([, id]) => id === `work-${item.coll}-${item.index}`);
    assert.equal(card.length, 1, item.path);
    assert.ok(card[0][2].includes(`href="${workPath(owner.coll, owner.index)}"`), `${item.path} opens its work page`);
    if (item.type === 'image') assert.ok(card[0][2].includes(`src="${mediaPath(owner.path)}"`), `${item.path} uses its first-party media URL`);
  }
});

test('archive images stay first-party so the archive CSP can stay img-src self', async () => {
  const headers = await readFile(path.join(root, 'preview_site/_headers'), 'utf8');
  assert.match(headers, /\/archive\/\*[\s\S]*?img-src 'self';/);
  for (const [name, html] of generated.files) {
    if (!name.endsWith('.html')) continue;
    for (const [, src] of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) assert.match(src, /^\/(?:media|assets)\//, `${name}: ${src}`);
  }
});

test('all archive pages are reachable by HTML links without script or button interactions', () => {
  const queue = ['/archive/'], visited = new Set();
  while (queue.length) {
    const route = queue.shift();
    if (visited.has(route)) continue;
    visited.add(route);
    const html = generated.files.get(`${route.slice(1)}index.html`);
    assert.ok(html, `linked page exists: ${route}`);
    assert.match(html, new RegExp(`rel="canonical" href="https://bqurtas\\.com${route}"`));
    assert.doesNotMatch(html, /<script|data-src=|noindex/);
    for (const match of html.matchAll(/<a\b[^>]*href="(\/archive\/[^"#]*)"/g)) queue.push(match[1]);
  }
  assert.equal(visited.size, generated.pages.length);
  const page2 = generated.files.get('archive/books/2/index.html');
  assert.match(page2, /rel="prev" href="\/archive\/books\/"/);
  assert.match(page2, /rel="next" href="\/archive\/books\/3\/"/);
  assert.ok((page2.match(/<img /g) || []).length <= 24, 'each page keeps its image payload bounded');
});

test('the gallery sitemap lists exactly the generated archive pages', () => {
  const xml = generated.files.get('sitemap-gallery.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locs.sort(), generated.pages.map(route => `https://bqurtas.com${route}`).sort());
  assert.equal(generated.files.has('sitemap-images.xml'), false, 'the image sitemap belongs to generate-image-sitemap.mjs');
});

test('invalid paths and duplicate catalogue media fail the build instead of producing bad public URLs', () => {
  for (const item of [{ ...manifest.images[0], path: '../escape.webp' }, { ...manifest.images[0], width: 0 }]) {
    assert.throws(() => buildMediaArchive({ images: [item], videos: [] }));
  }
  assert.throws(() => buildMediaArchive({ images: [manifest.images[0], manifest.images[0]], videos: [] }));
});

test('generation is deterministic and removes only obsolete generated pages', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'bq-media-archive-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const siteRoot = path.join(temp, 'preview_site');
  await mkdir(path.join(siteRoot, 'archive/manual'), { recursive: true });
  await writeFile(path.join(siteRoot, 'archive/manual/index.html'), '<h1>Authored archive page</h1>');
  const sample = { images: [manifest.images[0], manifest.images.at(-1)], videos: [] };
  await generateMediaArchive({ root: temp, manifest: sample });
  const target = path.join(siteRoot, 'archive/books/index.html');
  const before = await stat(target);
  await generateMediaArchive({ root: temp, manifest: sample });
  assert.equal((await stat(target)).mtimeMs, before.mtimeMs, 'unchanged builds do not rewrite pages');
  await generateMediaArchive({ root: temp, manifest: { images: [sample.images[0]], videos: [] } });
  await assert.rejects(stat(path.join(siteRoot, 'archive/ticker-logos/index.html')), { code: 'ENOENT' });
  assert.match(await readFile(path.join(siteRoot, 'archive/manual/index.html'), 'utf8'), /Authored archive page/);
});

test('edge and local server preserve standalone archive pages instead of returning the application shell', async () => {
  for (const route of ['/archive/', '/archive/books/2/', '/archive/videos/']) {
    const response = await onRequest({ request: new Request(`https://bqurtas.com${route}`, { headers: { Accept: 'text/html' } }), env: {}, next: () => new Response('static archive') });
    assert.equal(await response.text(), 'static archive');
    const local = resolveRequestTarget(route);
    assert.equal(local.status, 200);
    assert.ok(local.filePath.endsWith(`${route}index.html`));
    assert.equal(local.spaFallback, undefined);
  }
  assert.equal(resolveRequestTarget('/archive/not-a-category/').status, 404);
});

test('unknown archive URLs are real 404s even when a downstream fallback would return the SPA shell', async () => {
  for (const route of ['/archive/not-a-category/', '/archive/books/999/', '/archive/books/1/', '/archive/books/2/extra', '/ARCHIVE/']) {
    for (const method of ['GET', 'HEAD']) {
      let reachedFallback = false;
      const response = await onRequest({ request: new Request(`https://bqurtas.com${route}`, { method }), env: {}, next: () => {
        reachedFallback = true;
        return new Response('<html>SPA shell</html>', { status: 200 });
      } });
      assert.equal(response.status, 404, `${method} ${route}`);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(reachedFallback, false);
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
});

test('the retired watch pages and video sitemap are not served', async () => {
  for (const route of ['/watch/', '/watch/videos1/', '/sitemap-videos.xml']) {
    const response = await onRequest({ request: new Request(`https://bqurtas.com${route}`, { headers: { Accept: 'text/html' } }), env: {}, next: () => new Response('<html>SPA shell</html>') });
    assert.equal(response.status, 404, route);
  }
});

test('known archive aliases redirect to their exact canonical URL and retain the query', async () => {
  for (const [route, destination] of [['/archive', '/archive/'], ['/archive/books/2', '/archive/books/2/'], ['/archive/books/2/index.html', '/archive/books/2/']]) {
    const response = await onRequest({ request: new Request(`https://bqurtas.com${route}?ref=portfolio`), env: {}, next: () => new Response('incorrect fallback') });
    assert.equal(response.status, 301, route);
    assert.equal(response.headers.get('location'), `https://bqurtas.com${destination}?ref=portfolio`);
  }
});

test('each edge media sitemap returns its own generated XML for GET and HEAD', async () => {
  const bodies = {
    '/sitemap-images.xml': await readFile(path.join(root, 'preview_site/sitemap-images.xml'), 'utf8'),
    '/sitemap-gallery.xml': generated.files.get('sitemap-gallery.xml')
  };
  for (const [route, source] of [['/sitemap-images.xml', '/sitemap-images.xml'], ['/sitemap-gallery.xml', '/sitemap-gallery.xml'], ['/sitemap-media.xml', '/sitemap-images.xml']]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await onRequest({ request: new Request(`https://bqurtas.com${route}`, { method }), env: { ASSETS: { fetch: async url => {
        assert.equal(url.pathname, source);
        return new Response(bodies[source], { headers: { ETag: 'old' } });
      } } }, next: () => new Response('incorrect fallback') });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /application\/xml/);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('etag'), null);
      assert.equal(await response.text(), method === 'HEAD' ? '' : bodies[source]);
    }
  }
});

test('all generated outputs are current and every sitemap is advertised in robots.txt', async () => {
  for (const [name, contents] of generated.files) assert.equal(await readFile(path.join(root, 'preview_site', name), 'utf8'), contents, `${name}: run npm run build`);
  assert.equal(await readFile(path.join(root, 'functions/_media-archive-routes.js'), 'utf8'), generated.routeModule, 'edge routing matches the generated pages');
  const robots = await readFile(path.join(root, 'preview_site/robots.txt'), 'utf8');
  for (const name of ['sitemap.xml', 'sitemap-images.xml', 'sitemap-gallery.xml']) assert.ok(robots.includes(`Sitemap: https://bqurtas.com/${name}`));
  assert.ok(!robots.includes('sitemap-videos.xml'));
});
