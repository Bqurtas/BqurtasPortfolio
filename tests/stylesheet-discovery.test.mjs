import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const site = new URL('../preview_site/', import.meta.url);
const html = await readFile(new URL('index.html', site), 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const activeHead = head.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/g, '');
const links = [...activeHead.matchAll(/<link\b[^>]*>/g)].map(match => ({
  position: match.index,
  ...Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]])),
}));
const earlySheets = ['modern-framer.min.css', 'fonts.css', 'experience.min.css', 'polish.min.css'];
const path = link => link.href?.split('?')[0];

test('blocking overlays are discovered just after the base URL without moving their cascade slots', () => {
  const baseEnd = head.indexOf('/>', head.indexOf('<base ')) + 2;
  const firstMetaAfterBase = head.indexOf('<meta ', baseEnd);
  const critical = head.indexOf('<style id="bqCriticalCss">');
  assert.ok(baseEnd > 0 && firstMetaAfterBase > baseEnd && critical > firstMetaAfterBase);
  for (const filename of earlySheets) {
    const matches = links.filter(link => path(link) === `css/${filename}`);
    const preloads = matches.filter(link => link.rel === 'preload');
    const applied = matches.filter(link => link.rel === 'stylesheet');
    assert.equal(preloads.length, 1, `${filename} has exactly one preload`);
    assert.equal(applied.length, 1, `${filename} still has one applying stylesheet`);
    assert.equal(preloads[0].as, 'style');
    assert.ok(preloads[0].position > baseEnd && preloads[0].position < firstMetaAfterBase);
    assert.ok(applied[0].position > critical, `${filename} retains its post-critical cascade slot`);
    assert.equal(preloads[0].href, applied[0].href, 'the browser can reuse the identical request');
    assert.equal(preloads[0].crossorigin, applied[0].crossorigin, 'request credential modes match');
  }
  const actualOrder = links.filter(link => link.rel === 'stylesheet' && earlySheets.some(file => path(link) === `css/${file}`));
  assert.deepEqual(actualOrder.map(path), earlySheets.map(file => `css/${file}`));
});

test('the base stylesheet keeps its single preload and original guarded activation position', () => {
  const baseLinks = links.filter(link => path(link) === 'css/style.v417.min.css');
  assert.equal(baseLinks.length, 1);
  assert.equal(baseLinks[0].id, 'bqFullCss');
  assert.equal(baseLinks[0].rel, 'preload');
  assert.equal(baseLinks[0]['data-href'], baseLinks[0].href);
  assert.ok(baseLinks[0].position > head.indexOf('<style id="bqCriticalGuards">'));
  assert.ok(baseLinks[0].position < links.find(link => link.rel === 'stylesheet' && path(link) === 'css/modern-framer.min.css').position);
  assert.ok(head.indexOf("var link = document.getElementById('bqFullCss');") > baseLinks[0].position);
});

test('early styles use the current content fingerprints, including after a build', async () => {
  for (const filename of earlySheets) {
    const preload = links.find(link => link.rel === 'preload' && path(link) === `css/${filename}`);
    const bytes = await readFile(new URL(`css/${filename}`, site));
    const fingerprint = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    assert.equal(preload.href, `css/${filename}?v=${fingerprint}`);
  }
});
