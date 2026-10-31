import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FACE_MODULE, FONTS_CSS, faceModule } from './split-font-faces.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* Keep editable originals under assets/fonts. The hash prefix lets a later
   build recover that original name and issue a new URL when its bytes change.
   The boundary deliberately excludes absolute third-party URLs. */
const FONT_REFERENCE = /(^|[\s("'=])(?:\/?assets\/fonts\/|\.\.\/assets\/fonts\/|\/font-assets\/[a-f0-9]{16}-)([A-Za-z0-9_.-]+\.(?:woff2?|otf|ttf))(?:\?[^\s"'()<>]*)?/gm;

async function writeChanged(file, value) {
  let current;
  try { current = await readFile(file); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (current?.equals(bytes)) return false;
  await writeFile(file, bytes);
  return true;
}

export async function fingerprintFontReferences(source, siteRoot, references = new Map()) {
  for (const [, , name] of source.matchAll(FONT_REFERENCE)) {
    if (references.has(name)) continue;
    const bytes = await readFile(path.join(siteRoot, 'assets/fonts', name));
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const reference = `/font-assets/${hash}-${name}`;
    await mkdir(path.join(siteRoot, 'font-assets'), { recursive: true });
    await writeChanged(path.join(siteRoot, reference), bytes);
    references.set(name, reference);
  }
  return source.replace(FONT_REFERENCE, (_whole, boundary, name) => boundary + references.get(name));
}

/* Run before minification and archive generation, so CSS, critical inline
   faces, preloads, edge work pages and archives all request the same URL.
   Existing copies stay available for documents cached before a font update.
   No subsetting, conversion or metric change happens in this build step. */
export async function generateFontAssets(root = projectRoot) {
  const siteRoot = path.join(root, 'preview_site');
  const references = new Map();
  const stylesheets = (await readdir(path.join(siteRoot, 'css')))
    .filter(name => name.endsWith('.css') && !name.endsWith('.min.css'))
    .sort().map(name => `css/${name}`);
  const changed = [];
  for (const name of [...stylesheets, 'index.html', '404.html', 'sw.js']) {
    const file = path.join(siteRoot, name);
    const source = await readFile(file, 'utf8');
    const output = await fingerprintFontReferences(source, siteRoot, references);
    if (await writeChanged(file, output)) changed.push(name);
  }
  const css = await readFile(path.join(root, FONTS_CSS), 'utf8');
  if (await writeChanged(path.join(root, FACE_MODULE), faceModule(css))) changed.push(FACE_MODULE);
  return { changed, references };
}
