import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { syntax } from 'csso';
import { iconMap, usedIconCodepoints } from '../scripts/subset-icon-fonts.mjs';
import { ICON_SOURCE, ICON_OUTPUT, subsetIconStyles, useSubsetIconStyles, generateIconStyles } from '../scripts/subset-icon-styles.mjs';
import { fingerprintQuotedAssets, contentHash } from '../scripts/build-assets.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const source = await readFile(path.join(root, 'preview_site', ICON_SOURCE), 'utf8');

function fontFaces(css) {
  const result = [];
  syntax.walk(syntax.parse(css), { visit:'Atrule', enter(node) { if (node.name === 'font-face') result.push(syntax.generate(node)); } });
  return result;
}

test('used icon names and aliases keep exactly the original glyphs and font families', async () => {
  const { classes } = await usedIconCodepoints(root);
  const output = subsetIconStyles(source, classes);
  const originalMap = iconMap(source), outputMap = iconMap(output);
  assert.ok(classes.length > 100, 'includes icons in dynamic Studio, menu and assistant templates');
  for (const name of classes) assert.deepEqual(outputMap.get(name), originalMap.get(name), name);
  assert.deepEqual(fontFaces(output), fontFaces(source), 'font names, weights and URLs stay unchanged');
  assert.match(output, /Font Awesome 6 Free/);
  assert.match(output, /Font Awesome 6 Brands/);
  assert.match(output, /License - https:\/\/fontawesome\.com\/license\/free/);
  assert.ok(gzipSync(output).length < gzipSync(source).length / 3, 'the stylesheet saves at least two thirds of transfer bytes');
  assert.equal(output, subsetIconStyles(source, [...classes].reverse()), 'scan order cannot alter CSS order');
});

test('only unused pure glyph rules are removed; utilities, keyframes and mixed selectors remain', () => {
  const input = '/*! original license */\n'
    + '.fa-solid{font-family:"Font Awesome 6 Free";font-weight:900}'
    + '@font-face{font-family:"Font Awesome 6 Free";src:url(../webfonts/solid.woff2)}'
    + '.fa-kept:before,.fa-alias:before{content:"\\f001"}'
    + '.fa-unused:before{content:"\\f002"}'
    + '.fa-dynamic:before{content:"\\f003"}'
    + '.fa-mixed:before,.custom:before{content:"\\f004"}'
    + '.fa-extra:before{content:"\\f005";color:inherit}'
    + '.fa-spin{animation:fa-spin 2s linear infinite}'
    + '@keyframes fa-spin{to{transform:rotate(1turn)}}'
    + '@media (prefers-reduced-motion:reduce){.fa-spin{animation:none}}';
  const output = subsetIconStyles(input, ['fa-alias','fa-dynamic']);
  assert.doesNotMatch(output, /fa-unused/);
  assert.deepEqual([...iconMap(output).keys()], ['fa-kept','fa-alias','fa-dynamic','fa-mixed']);
  assert.match(output, /\.custom:before/);
  assert.match(output, /\.fa-extra:before\{content:/);
  assert.match(output, /@keyframes fa-spin\{to\{transform:rotate\(1turn\)\}\}/);
  assert.match(output, /@media \(prefers-reduced-motion:reduce\)\{\.fa-spin\{animation:none\}\}/);
  assert.deepEqual(fontFaces(output), fontFaces(input));
});

test('build generation is deterministic, keeps the original vendor file, and picks up new template icons', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bq-icons-'));
  try {
    await mkdir(path.join(directory, 'preview_site', path.dirname(ICON_SOURCE)), { recursive:true });
    await mkdir(path.join(directory, 'functions'));
    await writeFile(path.join(directory, 'preview_site', ICON_SOURCE), source);
    const html = '<i class="fa-solid fa-arrow-up"></i>';
    await writeFile(path.join(directory, 'preview_site/index.html'), html);
    const first = await generateIconStyles(directory);
    const once = await readFile(path.join(directory, 'preview_site', ICON_OUTPUT), 'utf8');
    assert.equal(first.changed, true);
    assert.equal((await generateIconStyles(directory)).changed, false);
    assert.equal(await readFile(path.join(directory, 'preview_site', ICON_SOURCE), 'utf8'), source);
    await writeFile(path.join(directory, 'functions/template.js'), 'export const html = `<i class="fa-solid fa-moon"></i>`;');
    assert.equal((await generateIconStyles(directory)).changed, true);
    const twice = await readFile(path.join(directory, 'preview_site', ICON_OUTPUT), 'utf8');
    assert.ok(iconMap(twice).has('fa-moon'));
    assert.notEqual(twice, once);
    const reference = useSubsetIconStyles(`<link href="${ICON_SOURCE}?v=old">`);
    const versioned = await fingerprintQuotedAssets(reference, path.join(directory, 'preview_site'));
    assert.equal(versioned, `<link href="${ICON_OUTPUT}?v=${contentHash(twice)}">`);
  } finally { await rm(directory, { recursive:true, force:true }); }
});

test('stylesheet rewrites preserve loading attributes, order, and external references', () => {
  const local = '<link media="print" id="faCss" href="vendor/fontawesome-v309/css/all.min.css?v=old">';
  const external = '<link href="https://example.com/vendor/fontawesome-v309/css/all.min.css?v=old">';
  const output = useSubsetIconStyles(local + external);
  assert.equal(output, local.replace('all.min.css', 'icons.min.css') + external);
  assert.equal(useSubsetIconStyles(output), output);
});
