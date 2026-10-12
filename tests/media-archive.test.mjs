import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildMediaArchive, generateMediaArchive, jpegDimensions } from '../scripts/generate-media-archive.mjs';
import { onRequest } from '../functions/[[route]].js';
import { resolveRequestTarget } from '../scripts/dev-server.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const manifest = JSON.parse(await readFile(path.join(root, 'preview_site/assets/gallery-manifest.json'), 'utf8'));
const posters = new Set(manifest.videos.map(item => item.path));
const generated = buildMediaArchive(manifest, { posters });
const originals = 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/';

test('every catalogue image has one crawlable archive landing page with its original src', () => {
  const imagePages = [...generated.files].filter(([name]) => name.startsWith('archive/'));
  const sources = imagePages.flatMap(([, html]) => [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]));
  const sitemap = generated.files.get('sitemap-images.xml');
  assert.equal(sources.filter(url => url.startsWith(originals)).length, manifest.images.length);
  for (const item of manifest.images) {
    const source = originals + item.path;
    assert.equal(sources.filter(url => url === source).length, 1, item.path);
    assert.equal(sitemap.split(`<image:loc>${source}</image:loc>`).length - 1, 1, item.path);
    const [, landing] = imagePages.find(([, html]) => html.includes(`src="${source}"`));
    const canonical = landing.match(/rel="canonical" href="([^"]+)"/)[1];
    const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].find(match => match[1].includes(`<image:loc>${source}</image:loc>`))[1];
    assert.ok(entry.includes(`<loc>${canonical}</loc>`), 'sitemap points to the actual image landing page');
    assert.ok(landing.includes(`href="${source}"`), 'original opens through a normal link');
  }
});

test('all archive and watch pages are reachable by HTML links without script or button interactions', () => {
  const queue = ['/archive/'], visited = new Set();
  while (queue.length) {
    const route = queue.shift();
    if (visited.has(route)) continue;
    visited.add(route);
    const html = generated.files.get(`${route.slice(1)}index.html`);
    assert.ok(html, `linked page exists: ${route}`);
    assert.match(html, new RegExp(`rel="canonical" href="https://bqurtas\\.com${route}"`));
    assert.doesNotMatch(html, /<script|data-src=|noindex/);
    for (const match of html.matchAll(/<a\b[^>]*href="(\/(?:archive|watch)\/[^"#]*)"/g)) queue.push(match[1]);
  }
  assert.equal(visited.size, generated.pages.length);
  const page2 = generated.files.get('archive/books/2/index.html');
  assert.match(page2, /rel="prev" href="\/archive\/books\/"/);
  assert.match(page2, /rel="next" href="\/archive\/books\/3\/"/);
  assert.ok((page2.match(/<img /g) || []).length <= 24, 'each page keeps its image payload bounded');
});

test('video sitemap points to genuine watch pages, matching direct video sources and individual posters', async () => {
  const xml = generated.files.get('sitemap-videos.xml');
  assert.equal(generated.videoCount, manifest.videos.length);
  assert.equal((xml.match(/<video:video>/g) || []).length, manifest.videos.length);
  assert.doesNotMatch(xml, /publication_date|expiration_date|lastmod/);
  for (const item of manifest.videos) {
    const stem = path.basename(item.path, '.mp4');
    const html = generated.files.get(`watch/${stem.toLowerCase()}/index.html`);
    assert.match(html, /<video controls playsinline preload="metadata" src="https:\/\/raw\.githubusercontent\.com/);
    assert.ok(html.includes(`src="${originals}${item.path}"`));
    const poster = `/assets/video-posters/${stem}.jpg`;
    assert.ok(html.includes(`poster="${poster}"`));
    assert.ok(xml.includes(`<video:thumbnail_loc>https://bqurtas.com${poster}</video:thumbnail_loc>`));
    assert.ok(xml.includes(`<video:content_loc>${originals}${item.path}</video:content_loc>`));
    const bytes = await readFile(path.join(root, 'preview_site', poster));
    const dimensions = jpegDimensions(bytes);
    assert.ok(dimensions.width >= 60 && dimensions.height >= 30);
    assert.doesNotMatch(html, /uploadDate|VideoObject/, 'do not fabricate missing publication metadata');
  }
});

test('missing posters omit watch pages and sitemap entries while keeping original videos accessible', () => {
  const result = buildMediaArchive({ images: [], videos: [manifest.videos[0]] });
  assert.equal(result.videoCount, 0);
  assert.deepEqual(result.missingPosters, [manifest.videos[0].path]);
  assert.equal(result.pages.some(route => route.startsWith('/watch/')), false);
  assert.doesNotMatch(result.files.get('sitemap-videos.xml'), /<video:video>/);
  assert.ok(result.files.get('archive/videos/index.html').includes(`href="${originals}${manifest.videos[0].path}"`));
});

test('invalid paths and duplicate catalogue media fail the build instead of producing bad public URLs', () => {
  for (const item of [{ ...manifest.images[0], path: '../escape.webp' }, { ...manifest.images[0], width: 0 }]) {
    assert.throws(() => buildMediaArchive({ images: [item], videos: [] }));
  }
  assert.throws(() => buildMediaArchive({ images: [manifest.images[0], manifest.images[0]], videos: [] }));
  assert.throws(() => jpegDimensions(Buffer.from('not a JPEG')));
});

test('generation is deterministic and removes only obsolete generated pages', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'bq-media-archive-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  await mkdir(path.join(temp, 'scripts'), { recursive: true });
  await writeFile(path.join(temp, 'scripts/site-images.json'), '[]');
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

test('edge and local server preserve standalone media pages instead of returning the application shell', async () => {
  for (const route of ['/archive/', '/archive/books/2/', '/watch/videos1/']) {
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
  for (const route of ['/archive/not-a-category/', '/archive/books/999/', '/archive/books/1/', '/archive/books/2/extra', '/watch/', '/watch/videos31/', '/watch/videos1.html', '/ARCHIVE/']) {
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

test('known archive aliases redirect to their exact canonical URL and retain the query', async () => {
  for (const [route, destination] of [['/archive', '/archive/'], ['/archive/books/2', '/archive/books/2/'], ['/archive/books/2/index.html', '/archive/books/2/'], ['/watch/videos1', '/watch/videos1/'], ['/watch/videos1/index.html', '/watch/videos1/']]) {
    const response = await onRequest({ request: new Request(`https://bqurtas.com${route}?ref=portfolio`), env: {}, next: () => new Response('incorrect fallback') });
    assert.equal(response.status, 301, route);
    assert.equal(response.headers.get('location'), `https://bqurtas.com${destination}?ref=portfolio`);
  }
});

test('each edge media sitemap returns its own generated XML for GET and HEAD', async () => {
  for (const [route, source] of [['/sitemap-images.xml', '/sitemap-images.xml'], ['/sitemap-gallery.xml', '/sitemap-gallery.xml'], ['/sitemap-videos.xml', '/sitemap-videos.xml'], ['/sitemap-media.xml', '/sitemap-images.xml']]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await onRequest({ request: new Request(`https://bqurtas.com${route}`, { method }), env: { ASSETS: { fetch: async url => {
        assert.equal(url.pathname, source);
        return new Response(generated.files.get(source.slice(1)), { headers: { ETag: 'old' } });
      } } }, next: () => new Response('incorrect fallback') });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /application\/xml/);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('etag'), null);
      assert.equal(await response.text(), method === 'HEAD' ? '' : generated.files.get(source.slice(1)));
    }
  }
});

test('all generated outputs are current and every sitemap is advertised in robots.txt', async () => {
  const siteImages = JSON.parse(await readFile(path.join(root, 'scripts/site-images.json'), 'utf8'));
  const result = buildMediaArchive(manifest, { posters, siteImages });
  for (const [name, contents] of result.files) assert.equal(await readFile(path.join(root, 'preview_site', name), 'utf8'), contents, `${name}: run npm run build`);
  assert.equal(await readFile(path.join(root, 'functions/_media-archive-routes.js'), 'utf8'), result.routeModule, 'edge routing matches the generated pages');
  const robots = await readFile(path.join(root, 'preview_site/robots.txt'), 'utf8');
  for (const name of ['sitemap.xml', 'sitemap-images.xml', 'sitemap-gallery.xml', 'sitemap-videos.xml']) assert.ok(robots.includes(`Sitemap: https://bqurtas.com/${name}`));
});
