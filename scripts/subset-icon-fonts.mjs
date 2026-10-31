import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Font Awesome ships ~2,000 icons (275 KB of solid + brands fonts); the site
   draws a few dozen. The stylesheet keeps the full class list, but its
   @font-face rules point at subsets holding only the glyphs some class used
   by the site maps to. The full fonts stay next to them as the source.

   Maintenance step (needs `pip install fonttools brotli`, like the poster or
   image tooling, not a CI dependency): after adding an icon, run
     node scripts/subset-icon-fonts.mjs
   tests/icon-font-subset.test.mjs fails in CI when a used icon is missing. */

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const FA_DIR = 'preview_site/vendor/fontawesome-v309';
export const FA_FONTS = ['fa-solid-900', 'fa-regular-400', 'fa-brands-400'];
const SCANNED = /\.(?:html|js|mjs|css|json|txt|sql)$/;

const cssEscape = (value) => value.replace(/\\([0-9a-f]{1,6}) ?|\\(.)/gi, (_, hex, chr) => hex ? String.fromCodePoint(parseInt(hex, 16)) : chr);
const isPrivateUse = (cp) => (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0x10ffff);

/* class name (without the leading dot) -> codepoints its :before draws */
export function iconMap(css) {
  const map = new Map();
  for (const [, selectors, content] of css.matchAll(/([^{}]+)\{content:"((?:[^"\\]|\\.)*)"\}/g)) {
    const codepoints = [...cssEscape(content)].map((char) => char.codePointAt(0));
    for (const [, name] of selectors.matchAll(/\.(fa-[a-z0-9-]+):(?::)?before/g)) map.set(name, codepoints);
  }
  return map;
}

async function* sourceFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'vendor', 'archive', '.git', '.wrangler'].includes(entry.name)) continue;
      yield* sourceFiles(file);
    } else if (SCANNED.test(entry.name)) {
      yield file;
    }
  }
}

/* Every fa-* token in the site's own source (markup, scripts, dictionaries,
   styles) plus any private-use codepoint written directly into CSS content
   or a JS string. Over-inclusion only costs a few bytes. */
export async function usedIconCodepoints(root = projectRoot) {
  const css = await readFile(path.join(root, FA_DIR, 'css/all.min.css'), 'utf8');
  const map = iconMap(css);
  const classes = new Set();
  const codepoints = new Set();
  for (const dir of ['preview_site', 'functions']) {
    for await (const file of sourceFiles(path.join(root, dir))) {
      const text = await readFile(file, 'utf8');
      for (const [token] of text.matchAll(/fa-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
        if (map.has(token)) {
          classes.add(token);
          map.get(token).forEach((cp) => codepoints.add(cp));
        }
      }
      // CSS "\f015", JS "" / "\u{f015}", HTML "&#xf015;" / "&#61461;",
      // and the raw character a minifier writes into content strings.
      const literal = [
        ...[...text.matchAll(/\\(?:u\{?)?([ef][0-9a-f]{3})(?![0-9a-f])/gi)].map(([, hex]) => parseInt(hex, 16)),
        ...[...text.matchAll(/&#x([0-9a-f]+);|&#(\d+);/gi)].map(([, hex, dec]) => (hex ? parseInt(hex, 16) : Number(dec))),
        ...[...text].map((char) => char.codePointAt(0)),
      ];
      literal.filter(isPrivateUse).forEach((cp) => codepoints.add(cp));
    }
  }
  return { classes: [...classes].sort(), codepoints: [...codepoints].sort((a, b) => a - b) };
}

/* The CSS points every Font Awesome @font-face at a content-hashed subset,
   so a later subset can never be served from a year-long vendor cache. */
export function pointFontFacesAt(css, files) {
  return css.replace(/url\(\.\.\/webfonts\/(fa-[a-z]+-\d+)(?:\.[0-9a-f]{12})?\.woff2\)/g, (match, font) => files[font] ? `url(../webfonts/${files[font]})` : match);
}

export async function subsetIconFonts(root = projectRoot) {
  const { classes, codepoints } = await usedIconCodepoints(root);
  const unicodes = codepoints.map((cp) => cp.toString(16)).join(',');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'bq-fa-subset-'));
  const webfonts = path.join(root, FA_DIR, 'webfonts');
  const files = {};
  try {
    for (const font of FA_FONTS) {
      const out = path.join(temp, `${font}.woff2`);
      execFileSync('pyftsubset', [path.join(webfonts, `${font}.woff2`), `--unicodes=${unicodes}`,
        '--flavor=woff2', '--layout-features=*', `--output-file=${out}`], { stdio: 'inherit' });
      const bytes = await readFile(out);
      const name = `${font}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.woff2`;
      for (const old of await readdir(webfonts)) {
        if (old.startsWith(`${font}.`) && old !== name && /^fa-[a-z]+-\d+\.[0-9a-f]{12}\.woff2$/.test(old)) await rm(path.join(webfonts, old));
      }
      await writeFile(path.join(webfonts, name), bytes);
      files[font] = name;
      console.log(`${font}.woff2 -> ${name} (${bytes.length} bytes)`);
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  const cssPath = path.join(root, FA_DIR, 'css/all.min.css');
  await writeFile(cssPath, pointFontFacesAt(await readFile(cssPath, 'utf8'), files));
  console.log(`${classes.length} icon classes, ${codepoints.length} glyphs kept.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await subsetIconFonts();
