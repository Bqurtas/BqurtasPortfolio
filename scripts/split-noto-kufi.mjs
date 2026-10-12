import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { woff2Codepoints } from './woff2-cmap.mjs';

/* Noto Kufi Arabic draws the whole UI, Latin included. As one 166 KB face
   with no unicode-range every English visitor downloaded its 1,200 Arabic
   glyphs too. This splits that exact file (same glyphs, metrics, variation
   axis and layout features, no re-hinting) into a Latin face and an Arabic
   face with disjoint unicode-ranges, so a page only fetches the script it
   shows. Kurdish/Arabic pages fetch both, as before.

   Maintenance step (needs `pip install fonttools brotli`); rerun only if the
   source font changes:  node scripts/split-noto-kufi.mjs */

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const KUFI_SOURCE = 'preview_site/assets/fonts/noto-kufi-CSRk4ydQnPyaDxEXLFF6LZVLKrodnOEPEWKo.woff2';
export const FONTS_CSS = 'preview_site/css/fonts.css';
const FONT_DIR = 'preview_site/assets/fonts';

// Google Fonts' "arabic" subset of Noto Kufi Arabic, including the joiners
// (U+200C-200E) so they always shape with the Arabic letters around them.
export const ARABIC_RANGES = [
  [0x0600, 0x06ff], [0x0750, 0x077f], [0x0870, 0x088e], [0x0890, 0x0891], [0x0897, 0x08e1],
  [0x08e3, 0x08ff], [0x200c, 0x200e], [0x2010, 0x2011], [0x204f, 0x204f], [0x2e41, 0x2e41],
  [0xfb50, 0xfdff], [0xfe70, 0xfe74], [0xfe76, 0xfefc], [0x102e0, 0x102fb], [0x10e60, 0x10e7e],
  [0x10ec2, 0x10ec4], [0x10efc, 0x10eff], [0x1ee00, 0x1eeff]
];
const isArabic = (cp) => ARABIC_RANGES.some(([first, last]) => cp >= first && cp <= last);

export function splitCodepoints(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  return { latin: sorted.filter((cp) => !isArabic(cp)), arabic: sorted.filter(isArabic) };
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

export function kufiFontFaces(files, ranges) {
  const face = (file, range) => `@font-face {
  font-family: 'Noto Kufi Arabic';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(/assets/fonts/${file}) format('woff2');
  unicode-range: ${range};
}`;
  return `${face(files.latin, ranges.latin)}\n${face(files.arabic, ranges.arabic)}`;
}

const KUFI_BLOCK = /\/\* ---------- Noto Kufi Arabic[^\n]*\n(?:@font-face \{[^}]*\}\n?)+/;

export async function splitNotoKufi(root = projectRoot) {
  const source = path.join(root, KUFI_SOURCE);
  const { latin, arabic } = splitCodepoints(woff2Codepoints(await readFile(source)));
  const temp = await mkdtemp(path.join(os.tmpdir(), 'bq-kufi-'));
  const files = {};
  try {
    for (const [part, codepoints] of Object.entries({ latin, arabic })) {
      const out = path.join(temp, `${part}.woff2`);
      execFileSync('pyftsubset', [source, `--unicodes=${codepoints.map((cp) => cp.toString(16)).join(',')}`,
        '--flavor=woff2', '--layout-features=*', `--output-file=${out}`], { stdio: 'inherit' });
      const bytes = await readFile(out);
      files[part] = `noto-kufi-${part}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.woff2`;
      for (const old of await readdir(path.join(root, FONT_DIR))) {
        if (old.startsWith(`noto-kufi-${part}.`) && old !== files[part]) await rm(path.join(root, FONT_DIR, old));
      }
      await writeFile(path.join(root, FONT_DIR, files[part]), bytes);
      console.log(`${part}: ${codepoints.length} characters -> ${files[part]} (${bytes.length} bytes)`);
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  const cssPath = path.join(root, FONTS_CSS);
  const css = await readFile(cssPath, 'utf8');
  if (!KUFI_BLOCK.test(css)) throw new Error('Noto Kufi block not found in fonts.css');
  await writeFile(cssPath, css.replace(KUFI_BLOCK, `/* ---------- Noto Kufi Arabic (Kurdish / Arabic UI; split by script, see scripts/split-noto-kufi.mjs) ---------- */\n${kufiFontFaces(files, { latin: unicodeRange(latin), arabic: unicodeRange(arabic) })}\n`));
  /* The Latin face draws the first paint's text, so it is the font the page
     preloads (the same URL as the @font-face, or the preload is wasted). */
  const htmlPath = path.join(root, 'preview_site/index.html');
  const html = await readFile(htmlPath, 'utf8');
  const preload = /<link rel="preload" href="\/?assets\/fonts\/[^"]+\.woff2" as="font" type="font\/woff2" crossorigin>/;
  if (!preload.test(html)) throw new Error('Body font preload not found in index.html');
  await writeFile(htmlPath, html.replace(preload, `<link rel="preload" href="/assets/fonts/${files.latin}" as="font" type="font/woff2" crossorigin>`));
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await splitNotoKufi();
