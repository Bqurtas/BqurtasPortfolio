import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { webpDimensions, withOriginalImageDimensions } from '../scripts/generate-gallery-manifest.mjs';

const source = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url), 'utf8'));

test('the shipped gallery requests the exact manifest for this release instead of a stale CDN key', async () => {
  const bytes = await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const built = await readFile(new URL('../preview_site/js/gallery.v420.min.js', import.meta.url), 'utf8');
  const requests = [], window = {};
  vm.runInNewContext(built, {
    window, document: { addEventListener() {} }, AbortController, setTimeout, clearTimeout,
    fetch: async url => { requests.push(url); return { ok: true, json: async () => manifest }; },
  });
  assert.equal(await window.BQ_GALLERY.loadManifest(), true);
  assert.deepEqual(requests, [`assets/gallery-manifest.json?v=${hash}`]);
});

function riff(type, payload) {
  const bytes = Buffer.alloc(20 + payload.length + payload.length % 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WEBP', 8);
  bytes.write(type, 12); bytes.writeUInt32LE(payload.length, 16); payload.copy(bytes, 20);
  return bytes;
}

test('WebP metadata reader supports lossy, lossless and extended canvas headers', () => {
  const width = 3396, height = 600;
  const lossy = Buffer.alloc(10);
  lossy.set([0x9d, 0x01, 0x2a], 3); lossy.writeUInt16LE(width, 6); lossy.writeUInt16LE(height, 8);
  const lossless = Buffer.alloc(5);
  lossless[0] = 0x2f; lossless.writeUInt32LE(((height - 1) << 14) | (width - 1), 1);
  const extended = Buffer.alloc(10);
  extended.writeUIntLE(width - 1, 4, 3); extended.writeUIntLE(height - 1, 7, 3);
  for (const [type, payload] of [['VP8 ', lossy], ['VP8L', lossless], ['VP8X', extended]]) {
    assert.deepEqual(webpDimensions(riff(type, payload)), { width, height });
  }
  assert.throws(() => webpDimensions(Buffer.from('not an image')), /Not a WebP/);
  assert.throws(() => webpDimensions(riff('VP8X', extended).subarray(0, 25)), /Truncated/);
});

test('every gallery frame reserves original dimensions while catalogue order and video records remain intact', async () => {
  const rebuilt = await withOriginalImageDimensions(manifest);
  assert.deepEqual(rebuilt, manifest, 'run node scripts/generate-gallery-manifest.mjs after changing original images');
  assert.equal(rebuilt.videos, manifest.videos);
  assert.deepEqual(rebuilt.images.map(record => record.path), manifest.images.map(record => record.path));
  const panorama = manifest.images.find(record => record.path === 'Other/Other37.webp');
  assert.equal(panorama.width, 3396);
  assert.equal(panorama.height, 600);
});

test('existing thumbnail proportions stay within half a resized pixel of their originals', async () => {
  for (const record of manifest.images) {
    const thumb = webpDimensions(await readFile(new URL(`../preview_site/assets/thumbs/${record.path}`, import.meta.url)));
    const error = Math.abs(thumb.height - thumb.width * record.height / record.width);
    assert.ok(error <= 0.500001, `${record.path} thumbnail crop/ratio differs by ${error}px`);
  }
});

function fixture(item, media) {
  const events = [], attributes = {}, styles = {};
  const window = { dispatchEvent: event => events.push(event) };
  vm.runInNewContext(source, {
    window, document: { addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  const card = { style: { setProperty(name, value) { styles[name] = value; } } };
  media.setAttribute = (name, value) => { attributes[name] = value; };
  return { sync: () => window.BQ_GALLERY.syncCardDimensions(card, media, item), events, attributes, styles };
}

const original = 'https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main/Other/Other37.webp';

test('a rounded thumbnail never replaces the exact original aspect ratio or triggers gallery remeasurement', () => {
  const item = { width: 3396, height: 600, url: original };
  const media = { tagName: 'IMG', naturalWidth: 320, naturalHeight: 57, currentSrc: 'https://bqurtas.com/assets/thumbs/Other/Other37.webp' };
  const { sync, events, styles } = fixture(item, media);
  assert.equal(sync(), false);
  assert.equal(item.width, 3396); assert.equal(item.height, 600);
  assert.deepEqual(styles, {}); assert.deepEqual(events, []);
});

test('missing image metadata corrects its temporary frame once and updates future masonry dimensions', () => {
  const item = { width: 0, height: 0, coll: 'other', index: 1 };
  const media = { tagName: 'IMG', naturalWidth: 320, naturalHeight: 453 };
  const { sync, events, attributes, styles } = fixture(item, media);
  assert.equal(sync(), true);
  assert.equal(styles['--card-ratio'], '320 / 453');
  assert.deepEqual(attributes, { width: '320', height: '453' });
  assert.equal(item.width, 320); assert.equal(item.height, 453);
  assert.equal(sync(), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'bq:gallery-dimensions');
});

test('a changed original reached through fallback corrects stale metadata but repeated loads stay stable', () => {
  const item = { width: 800, height: 500, url: original, rawUrl: 'https://raw.example/original.webp' };
  const media = { tagName: 'IMG', naturalWidth: 800, naturalHeight: 1000, currentSrc: item.rawUrl };
  const { sync, events, styles } = fixture(item, media);
  assert.equal(sync(), true);
  assert.equal(styles['--card-ratio'], '800 / 1000');
  assert.equal(sync(), false); assert.equal(events.length, 1);
});

test('video metadata supplies its natural ratio once, while undecoded media leave known geometry alone', () => {
  const item = { width: 1280, height: 720 };
  const media = { tagName: 'VIDEO', videoWidth: 0, videoHeight: 0 };
  const { sync, events, styles } = fixture(item, media);
  assert.equal(sync(), false);
  media.videoWidth = 406; media.videoHeight = 720;
  assert.equal(sync(), true);
  assert.equal(styles['--card-ratio'], '406 / 720');
  assert.equal(sync(), false); assert.equal(events.length, 1);
});
