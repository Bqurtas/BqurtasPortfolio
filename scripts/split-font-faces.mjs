import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { woff2Codepoints } from './woff2-cmap.mjs';

/* A face with no unicode-range is downloaded whole by every page that uses
   the family. Noto Kufi Arabic draws the whole UI, Latin included, but its
   166 KB file is mostly 1,200 Arabic glyphs; Manrope carries Greek, Cyrillic
   and Vietnamese no site language uses. Each source file is split (same
   glyphs, metrics, variation axis and layout features, no re-hinting) into
   faces with disjoint unicode-ranges, so a page only fetches the scripts it
   shows. Kurdish/Arabic pages still fetch both Kufi faces.

   Maintenance step (needs `pip install fonttools brotli`); rerun only if a
   source font changes:  node scripts/split-font-faces.mjs */

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const FONTS_CSS = 'preview_site/css/fonts.css';
const FONT_DIR = 'preview_site/assets/fonts';

export const SPLITS = [
  {
    family: 'Noto Kufi Arabic',
    source: 'noto-kufi-CSRk4ydQnPyaDxEXLFF6LZVLKrodnOEPEWKo.woff2',
    prefix: 'noto-kufi',
    weight: '400 700',
    rest: 'latin',
    // The Latin face paints the first text on every page: it is the preload.
    preload: 'latin',
    // Google Fonts' "arabic" subset, including the joiners (U+200C-200E) so
    // they always shape together with the Arabic letters around them.
    parts: {
      arabic: [
        [0x0600, 0x06ff], [0x0750, 0x077f], [0x0870, 0x088e], [0x0890, 0x0891], [0x0897, 0x08e1],
        [0x08e3, 0x08ff], [0x200c, 0x200e], [0x2010, 0x2011], [0x204f, 0x204f], [0x2e41, 0x2e41],
        [0xfb50, 0xfdff], [0xfe70, 0xfe74], [0xfe76, 0xfefc], [0x102e0, 0x102fb], [0x10e60, 0x10e7e],
        [0x10ec2, 0x10ec4], [0x10efc, 0x10eff], [0x1ee00, 0x1eeff]
      ]
    }
  },
  {
    family: 'Manrope',
    source: 'manrope-full.woff2',
    prefix: 'manrope',
    weight: '300 700',
    rest: 'core',
    parts: {
      // Greek, Cyrillic and Vietnamese: none of the site's seven languages.
      other: [[0x0370, 0x03ff], [0x0400, 0x052f], [0x1ea0, 0x1ef9]]
    }
  }
];

const inRanges = (ranges) => (cp) => ranges.some(([first, last]) => cp >= first && cp <= last);

/* part name -> sorted codepoints; `rest` takes everything no range claims. */
export function splitCodepoints(codepoints, split) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const claimed = Object.entries(split.parts).map(([part, ranges]) => [part, sorted.filter(inRanges(ranges))]);
  const taken = new Set(claimed.flatMap(([, codepoints]) => codepoints));
  return Object.fromEntries([[split.rest, sorted.filter((cp) => !taken.has(cp))], ...claimed]);
}

const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
export function unicodeRange(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    while (sorted[i + 1] === sorted[i] + 1) i++;
    parts.push(first === sorted[i] ? `U+${hex(first)}` : `U+${hex(first)}-${hex(sorted[i])}`);
  }
  return parts.join(', ');
}

const fontFace = (family, weight, file, range) => `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(/assets/fonts/${file}) format('woff2');
  unicode-range: ${range};
}`;

/* Replace every @font-face of the family with the given faces, in place. */
export function replaceFamilyFaces(css, family, faces) {
  const rule = new RegExp(`@font-face \\{[^}]*font-family: '${family}';[^}]*\\}\\n?`, 'g');
  let first = -1;
  const without = css.replace(rule, (match, offset) => {
    if (first < 0) first = offset;
    return '';
  });
  if (first < 0) throw new Error(`No @font-face for ${family} in fonts.css`);
  return `${without.slice(0, first)}${faces.join('\n')}\n${without.slice(first)}`;
}

export async function splitFontFaces(root = projectRoot) {
  const cssPath = path.join(root, FONTS_CSS);
  let css = await readFile(cssPath, 'utf8');
  const preloads = [];
  for (const split of SPLITS) {
    const source = path.join(root, FONT_DIR, split.source);
    const parts = splitCodepoints(woff2Codepoints(await readFile(source)), split);
    const temp = await mkdtemp(path.join(os.tmpdir(), 'bq-font-split-'));
    const faces = [];
    try {
      for (const [part, codepoints] of Object.entries(parts)) {
        if (!codepoints.length) continue;
        const out = path.join(temp, `${part}.woff2`);
        execFileSync('pyftsubset', [source, `--unicodes=${codepoints.map((cp) => cp.toString(16)).join(',')}`,
          '--flavor=woff2', '--layout-features=*', `--output-file=${out}`], { stdio: 'inherit' });
        const bytes = await readFile(out);
        const file = `${split.prefix}-${part}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.woff2`;
        for (const old of await readdir(path.join(root, FONT_DIR))) {
          if (old !== file && new RegExp(`^${split.prefix}-${part}\\.[0-9a-f]{12}\\.woff2$`).test(old)) await rm(path.join(root, FONT_DIR, old));
        }
        await writeFile(path.join(root, FONT_DIR, file), bytes);
        faces.push(fontFace(split.family, split.weight, file, unicodeRange(codepoints)));
        if (split.preload === part) preloads.push(`/assets/fonts/${file}`);
        console.log(`${split.family} ${part}: ${codepoints.length} characters -> ${file} (${bytes.length} bytes)`);
      }
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
    css = replaceFamilyFaces(css, split.family, faces);
  }
  await writeFile(cssPath, css);

  /* Preload the face that paints the first text, at its exact @font-face
     URL (a preload under any other URL is downloaded and never used). */
  const htmlPath = path.join(root, 'preview_site/index.html');
  const html = await readFile(htmlPath, 'utf8');
  const preload = /<link rel="preload" href="\/?assets\/fonts\/[^"]+\.woff2" as="font" type="font\/woff2" crossorigin>/;
  if (!preload.test(html) || preloads.length !== 1) throw new Error('Expected one woff2 font preload in index.html');
  await writeFile(htmlPath, html.replace(preload, `<link rel="preload" href="${preloads[0]}" as="font" type="font/woff2" crossorigin>`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await splitFontFaces();
