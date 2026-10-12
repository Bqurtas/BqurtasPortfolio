import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FONTS_CSS, KUFI_SOURCE } from '../scripts/split-noto-kufi.mjs';
import { woff2Codepoints } from '../scripts/woff2-cmap.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = await readFile(path.join(root, FONTS_CSS), 'utf8');
const html = await readFile(path.join(root, 'preview_site/index.html'), 'utf8');
const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)]
  .map(([, body]) => body)
  .filter((body) => body.includes("'Noto Kufi Arabic'"))
  .map((body) => ({ src: body.match(/url\(([^)]+)\)/)[1], range: body.match(/unicode-range: ([^;]+);/)?.[1] }));

function rangeSet(range) {
  const set = new Set();
  for (const part of range.split(',').map((value) => value.trim())) {
    const [first, last = first] = part.slice(2).split('-').map((value) => parseInt(value, 16));
    for (let cp = first; cp <= last; cp++) set.add(cp);
  }
  return set;
}

test('Noto Kufi is served as two script faces with disjoint unicode-ranges', () => {
  assert.equal(faces.length, 2);
  assert.ok(faces.every((face) => face.range), 'a face without unicode-range is downloaded for every page');
  const [a, b] = faces.map((face) => rangeSet(face.range));
  assert.equal([...a].filter((cp) => b.has(cp)).length, 0);
});

test('the two faces hold exactly the glyphs of the original font, each matching its range', async () => {
  const original = woff2Codepoints(await readFile(path.join(root, KUFI_SOURCE)));
  const covered = new Set();
  for (const face of faces) {
    const glyphs = woff2Codepoints(await readFile(path.join(root, 'preview_site', face.src)));
    assert.deepEqual([...glyphs].sort((x, y) => x - y), [...rangeSet(face.range)].sort((x, y) => x - y), face.src);
    glyphs.forEach((cp) => covered.add(cp));
  }
  assert.deepEqual([...covered].sort((x, y) => x - y), [...original].sort((x, y) => x - y));
  const latin = faces.find((face) => face.src.includes('-latin.'));
  for (const cp of 'Barakat Qurtas — ğşçêîûé'.split('').map((char) => char.codePointAt(0))) assert.ok(rangeSet(latin.range).has(cp), cp.toString(16));
});

test('the page preloads the Latin face at the exact @font-face URL', () => {
  const latin = faces.find((face) => face.src.includes('-latin.'));
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="font\/woff2" crossorigin>/g)].map((match) => match[1]);
  assert.deepEqual(preloads, [latin.src]);
});
