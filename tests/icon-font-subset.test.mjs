import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FA_DIR, FA_FONTS, iconMap, usedIconCodepoints } from '../scripts/subset-icon-fonts.mjs';
import { woff2Codepoints } from '../scripts/woff2-cmap.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = await readFile(path.join(root, FA_DIR, 'css/all.min.css'), 'utf8');
const subsetFiles = [...new Set([...css.matchAll(/url\(\.\.\/webfonts\/(fa-[a-z]+-\d+\.[0-9a-f]{12}\.woff2)\)/g)].map((match) => match[1]))];

test('every Font Awesome face points at a committed subset of its own font', async () => {
  assert.deepEqual(subsetFiles.map((file) => file.split('.')[0]).sort(), [...FA_FONTS].sort());
  assert.doesNotMatch(css, /url\(\.\.\/webfonts\/fa-(?:solid-900|regular-400|brands-400)\.woff2\)/, 'no face may load a full font');
  for (const file of subsetFiles) assert.ok((await readFile(path.join(root, FA_DIR, 'webfonts', file))).length < 40_000, file);
});

test('every icon the site draws has its glyph in the subset fonts (run node scripts/subset-icon-fonts.mjs)', async () => {
  const { classes, codepoints } = await usedIconCodepoints(root);
  assert.ok(classes.length > 50, 'the scan still finds the site icons');
  const covered = new Set();
  for (const file of subsetFiles) woff2Codepoints(await readFile(path.join(root, FA_DIR, 'webfonts', file))).forEach((cp) => covered.add(cp));
  const missing = codepoints.filter((cp) => !covered.has(cp)).map((cp) => cp.toString(16));
  assert.deepEqual(missing, []);
  const map = iconMap(css);
  for (const name of classes) assert.ok(map.get(name).every((cp) => covered.has(cp)), name);
});

test('the icon scan sees markup entities, CSS escapes and class names', async () => {
  const { codepoints, classes } = await usedIconCodepoints(root);
  for (const cp of [0xf14e, 0xf15c, 0xf518]) assert.ok(codepoints.includes(cp), cp.toString(16));
  for (const name of ['fa-spinner', 'fa-circle-check', 'fa-circle-exclamation', 'fa-x-twitter']) assert.ok(classes.includes(name), name);
});
