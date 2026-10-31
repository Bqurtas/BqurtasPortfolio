import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fingerprintFontReferences, generateFontAssets } from '../scripts/fingerprint-font-assets.mjs';
import { faceModule } from '../scripts/split-font-faces.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex').slice(0, 16);

test('font URLs preserve bytes and font declarations, change with content, and remain reproducible', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bq-font-cache-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets/fonts'), { recursive: true });
  const bytes = Buffer.from([0, 255, 16, 128, 1, 25]);
  await writeFile(path.join(root, 'assets/fonts/Signature.otf'), bytes);
  const source = '@font-face{font-family:Signature;src:url(\'../assets/fonts/Signature.otf\') format("opentype");font-weight:400;font-display:swap}';
  const output = await fingerprintFontReferences(source, root);
  const oldUrl = `/font-assets/${hash(bytes)}-Signature.otf`;
  assert.equal(output, source.replace('../assets/fonts/Signature.otf', oldUrl));
  assert.deepEqual(await readFile(path.join(root, oldUrl)), bytes);
  assert.equal(await fingerprintFontReferences(output, root), output);

  const updated = Buffer.from([0, 255, 16, 128, 1, 26]);
  await writeFile(path.join(root, 'assets/fonts/Signature.otf'), updated);
  const rebuilt = await fingerprintFontReferences(output, root);
  assert.notEqual(rebuilt, output, 'a changed font cannot keep a year-long cached URL');
  assert.equal(rebuilt, output.replace(oldUrl, `/font-assets/${hash(updated)}-Signature.otf`));
  assert.deepEqual(await readFile(path.join(root, oldUrl)), bytes, 'previous documents can still load their exact font');
  assert.deepEqual(await readFile(path.join(root, 'assets/fonts/Signature.otf')), updated, 'the authoring source remains intact');
});

test('font fingerprinting only rewrites local font references and never external URLs', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bq-font-boundary-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets/fonts'), { recursive: true });
  const bytes = Buffer.from('same glyphs');
  await writeFile(path.join(root, 'assets/fonts/Body.woff2'), bytes);
  const local = `/font-assets/${hash(bytes)}-Body.woff2`;
  const source = '<link href="assets/fonts/Body.woff2"><style>src:url(/assets/fonts/Body.woff2?v=old)</style>'
    + '<link href="https://example.com/assets/fonts/Body.woff2"><link href="//example.com/assets/fonts/Body.woff2">';
  assert.equal(await fingerprintFontReferences(source, root),
    `<link href="${local}"><style>src:url(${local})</style>`
    + '<link href="https://example.com/assets/fonts/Body.woff2"><link href="//example.com/assets/fonts/Body.woff2">');
});

test('the font build keeps CSS, preloads, critical inline, 404, edge faces and worker URLs in sync', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bq-font-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'preview_site');
  await mkdir(path.join(site, 'assets/fonts'), { recursive: true });
  await mkdir(path.join(site, 'css'));
  await mkdir(path.join(root, 'functions'));
  const fontFile = path.join(site, 'assets/fonts/Kufi.woff2');
  await writeFile(fontFile, 'original font');
  const css = "@font-face {\n  font-family: 'Noto Kufi Arabic';\n  font-weight: 400 700;\n  font-display: swap;\n  src: url(/assets/fonts/Kufi.woff2) format('woff2');\n  unicode-range: U+0020-007E;\n}\n";
  await writeFile(path.join(site, 'css/fonts.css'), css);
  await writeFile(path.join(site, 'css/style.css'), css);
  await writeFile(path.join(site, 'index.html'), `<link rel="preload" href="/assets/fonts/Kufi.woff2" as="font"><style>${css}</style>`);
  await writeFile(path.join(site, '404.html'), `<style>${css}</style>`);
  await writeFile(path.join(site, 'sw.js'), "const fonts = ['/assets/fonts/Kufi.woff2'];");
  for (const bytes of ['original font', 'updated font']) {
    await writeFile(fontFile, bytes);
    const { references } = await generateFontAssets(root);
    const url = references.get('Kufi.woff2');
    assert.equal(url, `/font-assets/${hash(bytes)}-Kufi.woff2`);
    for (const name of ['css/fonts.css', 'css/style.css', 'index.html', '404.html', 'sw.js']) {
      const output = await readFile(path.join(site, name), 'utf8');
      assert.ok(output.includes(url), name);
      assert.doesNotMatch(output, /assets\/fonts\//, name);
    }
    const fontCss = await readFile(path.join(site, 'css/fonts.css'), 'utf8');
    assert.equal(await readFile(path.join(root, 'functions/_font-faces.js'), 'utf8'), faceModule(fontCss));
    assert.deepEqual((await generateFontAssets(root)).changed, [], 'the second build is byte-for-byte stable');
  }
});

test('immutable font requests have exactly one non-conflicting Cache-Control policy', async () => {
  const headers = await readFile(new URL('../preview_site/_headers', import.meta.url), 'utf8');
  const rules = [];
  let current;
  for (const line of headers.split('\n')) {
    if (line.startsWith('/')) rules.push(current = { path: line, cache: [] });
    const directive = line.match(/^\s+Cache-Control:\s*(.+)$/);
    if (directive) current.cache.push(directive[1]);
  }
  const url = '/font-assets/0123456789abcdef-Body.woff2';
  const matching = rules.filter(rule => rule.path.endsWith('*') ? url.startsWith(rule.path.slice(0, -1)) : url === rule.path);
  assert.deepEqual(matching.flatMap(rule => rule.cache), ['public, max-age=31536000, immutable']);
  assert.equal(rules.find(rule => rule.path === '/assets/*').cache[0], 'public, max-age=86400, stale-while-revalidate=604800');
});
