import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {
  discoverGalleryImages, generateGalleryManifest, IMAGE_FILE_PREFIXES,
} from '../scripts/generate-gallery-manifest.mjs';
import { catalogFromManifest, workPath } from '../functions/_gallery-catalog.js';
import { serveWorkPage } from '../functions/_work-page.js';
import { updateGalleryManifest } from '../functions/_gallery-update.js';

const source = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');

function webp(width = 640, height = 960) {
  const bytes = Buffer.alloc(30);
  bytes.write('RIFF'); bytes.writeUInt32LE(22, 4); bytes.write('WEBPVP8X', 8);
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3); bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

async function fixture(t, manifest = { version: 2, images: [], videos: [] }) {
  const root = await mkdtemp(path.join(tmpdir(), 'bq-gallery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(Object.keys(IMAGE_FILE_PREFIXES).map(folder => mkdir(path.join(root, folder))));
  const manifestFile = path.join(root, 'manifest.json');
  await writeFile(manifestFile, JSON.stringify(manifest));
  return { root, manifestFile, build: () => generateGalleryManifest({ root, manifestFile }) };
}

test('Studio image discovery appends new originals, preserves dimensions and is idempotent', async t => {
  const { root, manifestFile, build } = await fixture(t, {
    version: 2,
    images: [{ path: 'LogoDesign/Logo8.webp', label: 'Existing mark' }], videos: [],
  });
  await writeFile(path.join(root, 'LogoDesign/Logo8.webp'), webp(480, 720));
  await writeFile(path.join(root, 'LogoDesign/Logo10.webp'), webp(1200, 600));
  await writeFile(path.join(root, 'LogoDesign/Logo9.webp'), webp(300, 400));
  await writeFile(path.join(root, 'LogoDesign/draft.webp'), webp());
  const result = await build();
  assert.deepEqual(result.images.map(({ path, index }) => ({ path, index })), [
    { path: 'LogoDesign/Logo8.webp', index: 1 },
    { path: 'LogoDesign/Logo9.webp', index: 2 },
    { path: 'LogoDesign/Logo10.webp', index: 3 },
  ]);
  assert.equal(result.images[0].label, 'Existing mark');
  assert.equal(result.images[2].width, 1200);
  assert.equal(result.images[2].height, 600);
  assert.match(result.images[2].hash, /^[a-f0-9]{16}$/);
  assert.equal(result.imageIndexHighWater.LogoDesign, 3);
  const first = await readFile(manifestFile, 'utf8');
  await build();
  assert.equal(await readFile(manifestFile, 'utf8'), first);
});

test('removing first and last images never renumbers surviving works or recycles retired IDs', async t => {
  const { root, build } = await fixture(t, { version: 2, images: [
    { path: 'TickerLogo/TickerLogo2.webp' }, { path: 'TickerLogo/TickerLogo6.webp' },
    { path: 'TickerLogo/TickerLogo13.webp' },
  ], videos: [] });
  for (const n of [2, 6, 13]) await writeFile(path.join(root, `TickerLogo/TickerLogo${n}.webp`), webp(n * 100, 500));
  await build();
  await rm(path.join(root, 'TickerLogo/TickerLogo2.webp'));
  await rm(path.join(root, 'TickerLogo/TickerLogo13.webp'));
  let manifest = await build();
  assert.deepEqual(manifest.images.map(x => x.index), [2]);
  assert.equal(manifest.imageIndexHighWater.TickerLogo, 3);
  await writeFile(path.join(root, 'TickerLogo/TickerLogo14.webp'), webp(700, 500));
  manifest = await build();
  assert.deepEqual(manifest.images.map(x => x.index), [2, 4]);
  assert.equal(catalogFromManifest(manifest).byPath.has('TickerLogo/TickerLogo13.webp'), false);
  await writeFile(path.join(root, 'TickerLogo/TickerLogo2.webp'), webp(800, 500));
  manifest = await build();
  assert.deepEqual(manifest.images.map(x => x.index), [2, 4, 5], 'reintroduced file receives a new work URL');
});

test('discovery preserves every current canonical and duplicate-alias URL', async () => {
  const manifest = JSON.parse(await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url), 'utf8'));
  const before = catalogFromManifest(manifest);
  const after = catalogFromManifest(await discoverGalleryImages(manifest));
  assert.equal(after.byPath.size, before.byPath.size);
  for (const [name, item] of before.byPath) {
    const next = after.byPath.get(name);
    assert.equal(workPath(next.coll, next.index), workPath(item.coll, item.index), name);
    assert.equal(next.hash, item.hash);
    assert.equal(next.canonical?.path, item.canonical?.path, `${name} canonical owner changed`);
  }
});

test('incomplete checkouts and duplicate stable indices fail rather than silently removing works', async t => {
  const { root } = await fixture(t);
  await assert.rejects(discoverGalleryImages({ images: [
    { path: 'LogoDesign/Logo1.webp', index: 3 }, { path: 'LogoDesign/Logo2.webp', index: 3 },
  ], videos: [] }, root), /duplicate gallery image index/);
  await rm(path.join(root, 'Book'), { recursive: true });
  await assert.rejects(discoverGalleryImages({ images: [], videos: [] }, root), { code: 'ENOENT' });
});

test('atomic repository manifest updates reserve both deleted page IDs and filenames', () => {
  const original = { version: 2, images: [
    { path: 'TickerLogo/TickerLogo2.webp', width: 500, height: 500 },
    { path: 'TickerLogo/TickerLogo13.webp', width: 500, height: 500 },
  ], videos: [{ path: 'Videos/Videos1.mp4', width: 640, height: 480 }] };
  const deleted = updateGalleryManifest(original, { action: 'delete', path: 'TickerLogo/TickerLogo13.webp', filenameHighWater: 16 });
  assert.equal(deleted.imageIndexHighWater.TickerLogo, 2);
  assert.equal(deleted.imageFileHighWater.TickerLogo, 16);
  assert.equal(original.images.length, 2, 'input manifest is not mutated');
  const added = updateGalleryManifest(deleted, { action: 'upload', path: 'TickerLogo/TickerLogo17.webp',
    width: 1000, height: 600, hash: 'ab1234567890abcd' });
  assert.equal(added.images[1].index, 3);
  assert.equal(added.imageFileHighWater.TickerLogo, 17);
  assert.equal(added.videos, original.videos);
  assert.throws(() => updateGalleryManifest(added, { action: 'upload', path: 'TickerLogo/TickerLogo17.webp',
    width: 1000, height: 600, hash: 'ab1234567890abcd' }), /already exists/);
});

test('browser cards and server pages retain sparse indices after deleting a work', async () => {
  const manifest = { images: [
    { path: 'LogoDesign/Logo2.webp', index: 2, width: 500, height: 500 },
    { path: 'LogoDesign/Logo9.webp', index: 4, width: 500, height: 600 },
  ], videos: [] };
  const window = {};
  vm.runInNewContext(source, {
    window, document: { addEventListener() {} }, URL, AbortController, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, json: async () => manifest }),
  });
  const gallery = window.BQ_GALLERY;
  assert.equal(await gallery.loadManifest(), true);
  const cards = gallery.items('logo');
  assert.deepEqual(Array.from(cards, x => x.index), [2, 4]);
  assert.equal(cards[1].title, 'Logo 04');
  assert.match(cards[1].url, /\/LogoDesign\/Logo9\.webp$/);
  assert.match(gallery.rawUrl('logo', 4), /\/LogoDesign\/Logo9\.webp$/);
  assert.equal(gallery.url('logo', 1), '');
  const ASSETS = { fetch: async input => new URL(String(input)).pathname === '/assets/gallery-manifest.json'
    ? Response.json(manifest) : new Response('<!doctype html><title>404</title>') };
  const visit = index => {
    const url = new URL(`https://bqurtas.com/design/logo/${index}`);
    return serveWorkPage(new Request(url), url, { ASSETS }, { coll: 'logo', index }, {
      notFound: () => new Response(null, { status: 404 }), unavailable: () => new Response(null, { status: 503 }),
      securityHeaders: () => ({}), next: () => new Response(null, { status: 204 }),
    });
  };
  assert.equal((await visit(1)).status, 404);
  const page = await visit(4);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Logo 04/);
});
