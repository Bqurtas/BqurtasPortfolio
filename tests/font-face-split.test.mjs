import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FACE_MODULE, FONTS_CSS, SPLITS, faceModule } from '../scripts/split-font-faces.mjs';
import { woff2Codepoints } from '../scripts/woff2-cmap.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = await readFile(path.join(root, FONTS_CSS), 'utf8');
const html = await readFile(path.join(root, 'preview_site/index.html'), 'utf8');
const facesOf = (family) => [...css.matchAll(/@font-face \{([^}]*)\}/g)]
  .map(([, body]) => body)
  .filter((body) => body.includes(`font-family: '${family}';`))
  .map((body) => ({ src: body.match(/url\(([^)]+)\)/)[1], range: body.match(/unicode-range: ([^;]+);/)?.[1] }));

function rangeSet(range) {
  const set = new Set();
  for (const part of range.split(',').map((value) => value.trim())) {
    const [first, last = first] = part.slice(2).split('-').map((value) => parseInt(value, 16));
    for (let cp = first; cp <= last; cp++) set.add(cp);
  }
  return set;
}
const sorted = (set) => [...set].sort((a, b) => a - b);

for (const split of SPLITS) {
  test(`${split.family} faces have disjoint unicode-ranges and together hold exactly the original glyphs`, async () => {
    const faces = facesOf(split.family);
    assert.equal(faces.length, Object.keys(split.parts).length + 1);
    assert.ok(faces.every((face) => face.range), 'a face without unicode-range is downloaded by every page');
    const seen = new Set();
    for (const face of faces) {
      const range = rangeSet(face.range);
      assert.equal(sorted(range).filter((cp) => seen.has(cp)).length, 0, `${face.src} overlaps another face`);
      range.forEach((cp) => seen.add(cp));
      const glyphs = woff2Codepoints(await readFile(path.join(root, 'preview_site', face.src)));
      assert.deepEqual(sorted(glyphs), sorted(range), `${face.src} holds exactly its range`);
    }
    const original = woff2Codepoints(await readFile(path.join(root, 'preview_site/assets/fonts', split.source)));
    assert.deepEqual(sorted(seen), sorted(original));
  });
}

test('every site language is drawn from the faces a Latin page already loads', () => {
  const sample = 'Barakat Qurtas — “Design” & co. ğşıİçöü êîû åäö éèàœç ñ ’…';
  for (const split of SPLITS) {
    const latin = facesOf(split.family).find((face) => face.src.includes(`-${split.rest}.`));
    const range = rangeSet(latin.range);
    for (const char of sample) assert.ok(range.has(char.codePointAt(0)), `${split.family} ${split.rest} lacks ${char}`);
  }
});

test('the page preloads the hero body and UI faces at their exact @font-face URLs', () => {
  const latin = facesOf('Noto Kufi Arabic').find((face) => face.src.includes('-latin.'));
  const body = facesOf('Manrope').find((face) => face.src.includes('-core.'));
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="font\/woff2" crossorigin>/g)].map((match) => match[1]);
  assert.deepEqual(preloads, [body.src, latin.src]);
});

test('work pages inline exactly the Noto Kufi faces of fonts.css', async () => {
  assert.equal(await readFile(path.join(root, FACE_MODULE), 'utf8'), faceModule(css));
  const workPage = await readFile(path.join(root, 'functions/_work-page.js'), 'utf8');
  assert.match(workPage, /\$\{KUFI_FACES\}/);
  assert.doesNotMatch(workPage, /noto-kufi-CSRk4/);
});
