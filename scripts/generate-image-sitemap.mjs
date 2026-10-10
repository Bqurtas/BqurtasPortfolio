/* Writes preview_site/sitemap-images.xml from the gallery manifest.

   The file used to be maintained by hand and listed every original on
   raw.githubusercontent.com under a gallery tab that renders only its first
   batch of cards — a host Search Console cannot verify, on pages that did not
   show the image. Now every work has its own page and a same-origin /media
   URL, and this sitemap is generated from the same catalogue the Pages
   Function uses: one <url> per work page with its image, or for a film a
   <video:video> block.

   Output is deterministic (manifest order, fixed static lastmod, film dates
   from the manifest), so CI rebuilding it never produces a diff. */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE, AUTHOR, COLLECTIONS, ORDER, catalogFromManifest, describe, mediaUrl, workUrl
} from '../functions/_gallery-catalog.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteRoot = path.join(projectRoot, 'preview_site');

/* The last time the static rooms' artwork changed. A fixed value: deriving
   it from the build clock would rewrite the file on every build. */
export const STATIC_LASTMOD = '2026-08-21';

/* The homepage lists only the photographs its shell really renders, at the
   exact URL it renders them (the portrait carries a ?v= fingerprint). Google
   associates an image with a page only when that page shows that URL. */
export function homeImages(html) {
  const found = new Set();
  for (const match of String(html).matchAll(/<img\b[^>]*\bsrc="(assets\/(?:portrait|avatar)\.webp(?:\?v=[A-Za-z0-9._-]+)?)"/g)) {
    found.add(SITE + '/' + match[1]);
  }
  return [...found];
}

export const xmlEscape = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const imageBlock = (loc) => `    <image:image>\n      <image:loc>${xmlEscape(loc)}</image:loc>\n    </image:image>`;

function videoBlock(item, copy) {
  const lines = [
    '    <video:video>',
    item.poster ? `      <video:thumbnail_loc>${xmlEscape(SITE + item.poster)}</video:thumbnail_loc>` : '',
    `      <video:title>${xmlEscape(`${copy.title} — ${AUTHOR}`)}</video:title>`,
    `      <video:description>${xmlEscape(copy.sentence)}</video:description>`,
    `      <video:content_loc>${xmlEscape(mediaUrl(item.path))}</video:content_loc>`,
    item.duration ? `      <video:duration>${Math.min(28800, Math.max(1, Math.round(item.duration)))}</video:duration>` : '',
    item.date ? `      <video:publication_date>${xmlEscape(item.date)}</video:publication_date>` : '',
    '      <video:family_friendly>yes</video:family_friendly>',
    `      <video:uploader info="${xmlEscape(SITE + '/bio')}">${xmlEscape(AUTHOR)}</video:uploader>`,
    '    </video:video>'
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildImageSitemap(manifest, html = '') {
  const catalog = catalogFromManifest(manifest);
  const blocks = [];

  const home = homeImages(html);
  if (home.length) {
    blocks.push([
      '  <url>',
      `    <loc>${xmlEscape(SITE)}</loc>`,
      `    <lastmod>${STATIC_LASTMOD}</lastmod>`,
      ...home.map(imageBlock),
      '  </url>'
    ].join('\n'));
  }

  for (const coll of ORDER) {
    for (const item of catalog.byColl[coll] || []) {
      // A duplicate copy's page redirects to its canonical work.
      if (item.canonical) continue;
      const copy = describe(item);
      const lastmod = item.date ? item.date.slice(0, 10) : '';
      blocks.push([
        '  <url>',
        `    <loc>${xmlEscape(workUrl(item.coll, item.index))}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        item.type === 'video' ? videoBlock(item, copy) : imageBlock(mediaUrl(item.path)),
        '  </url>'
      ].filter(Boolean).join('\n'));
    }
  }

  const missing = Object.keys(COLLECTIONS).filter((key) => !ORDER.includes(key));
  if (missing.length) throw new Error(`Collections missing from the sitemap order: ${missing.join(', ')}`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...blocks,
    '</urlset>',
    ''
  ].join('\n');
}

export async function generateImageSitemap({
  manifestFile = path.join(siteRoot, 'assets/gallery-manifest.json'),
  sitemapFile = path.join(siteRoot, 'sitemap-images.xml')
} = {}) {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const html = await readFile(path.join(siteRoot, 'index.html'), 'utf8');
  const xml = buildImageSitemap(manifest, html);
  let current = null;
  try { current = await readFile(sitemapFile, 'utf8'); } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error;
  }
  if (current !== xml) await writeFile(sitemapFile, xml);
  return { changed: current !== xml, xml };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { changed, xml } = await generateImageSitemap();
  const images = (xml.match(/<image:loc>/g) || []).length;
  const videos = (xml.match(/<video:video>/g) || []).length;
  console.log(`sitemap-images.xml: ${images} images, ${videos} videos${changed ? ' (updated)' : ''}`);
}
