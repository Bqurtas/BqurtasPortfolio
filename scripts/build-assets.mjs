import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import { minify as minifyCss } from 'csso';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteRoot = path.join(projectRoot, 'preview_site');

const jsBundles = [
  ['js/main.js', 'js/main.v420.min.js'],
  ['js/gallery.js', 'js/gallery.v420.min.js'],
  ['js/i18n.js', 'js/i18n.v420.min.js'],
  ['js/i18n-more.js', 'js/i18n-more.min.js'],
  ['js/enhance.js', 'js/enhance.v420.min.js'],
  ['js/motion.js', 'js/motion.min.js'],
  ['js/chat-kb.js', 'js/chat-kb.min.js'],
  ['js/lux.js', 'js/lux.min.js']
];

const cssBundles = [
  ['css/style.css', 'css/style.v417.min.css'],
  ['css/modern-framer.css', 'css/modern-framer.min.css'],
  ['css/experience.css', 'css/experience.min.css']
];

/* Match only quoted, first-party script and stylesheet references. This covers
   HTML attributes as well as the few lazy-loader strings in index.html, without
   ever rewriting a path embedded in an external URL. */
const QUOTED_CODE_ASSET = /(["'])(\/?(?:css|js|vendor)\/[A-Za-z0-9_./-]+\.(?:css|js))(?:\?v=[A-Za-z0-9._-]+)?\1/g;
const QUOTED_VERSIONED_LOCAL_ASSET = /(["'])(\/?(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)\?v=[A-Za-z0-9._-]+\1/g;

export function contentHash(value, length = 12) {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

async function writeIfChanged(file, value) {
  let current = null;
  try { current = await readFile(file, 'utf8'); } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
  }
  if (current === value) return false;
  await writeFile(file, value);
  return true;
}

function localAssetFile(reference, root = siteRoot) {
  const relative = reference.replace(/^\//, '');
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Asset reference escapes preview_site: ${reference}`);
  }
  return resolved;
}

export async function fingerprintQuotedAssets(source, root = siteRoot) {
  const fingerprints = new Map();
  for (const match of source.matchAll(QUOTED_CODE_ASSET)) {
    const reference = match[2];
    if (fingerprints.has(reference)) continue;
    const bytes = await readFile(localAssetFile(reference, root));
    fingerprints.set(reference, contentHash(bytes));
  }

  return source.replace(QUOTED_CODE_ASSET, (whole, quote, reference) => {
    const fingerprint = fingerprints.get(reference);
    return fingerprint ? `${quote}${reference}?v=${fingerprint}${quote}` : whole;
  });
}

export async function fingerprintVersionedLocalAssets(source, root = siteRoot) {
  const fingerprints = new Map();
  for (const match of source.matchAll(QUOTED_VERSIONED_LOCAL_ASSET)) {
    const reference = match[2];
    if (reference === '/sw.js' || reference === 'sw.js' || fingerprints.has(reference)) continue;
    const bytes = await readFile(localAssetFile(reference, root));
    fingerprints.set(reference, contentHash(bytes));
  }
  return source.replace(QUOTED_VERSIONED_LOCAL_ASSET, (whole, quote, reference) => {
    const fingerprint = fingerprints.get(reference);
    return fingerprint ? `${quote}${reference}?v=${fingerprint}${quote}` : whole;
  });
}

export function serviceWorkerVersion(source, documentSource = '') {
  const normalized = source.replace(
    /const SW_VERSION = '[^']*';/,
    "const SW_VERSION = '__CONTENT_HASH__';"
  );
  const normalizedDocument = documentSource.replace(
    /\/sw\.js(?:\?v=[A-Za-z0-9._-]+)?/g,
    '/sw.js?v=__CONTENT_HASH__'
  );
  return contentHash(`${normalized}\n${normalizedDocument}`);
}

export function stripStaticBlogPosts(sitemap) {
  /* Published post IDs are injected at the edge from the live database. A
     checked-in numeric entry can outlive an unpublished/deleted post and turn
     the static fallback sitemap into a source of soft 404s. */
  return sitemap.replace(
    /\n?[ \t]*<url>\s*<loc>https:\/\/bqurtas\.com\/(?:(?:ku|kmr|ar|fr|tr|sv)\/)?blog\/\d+<\/loc>[\s\S]*?<\/url>/g,
    ''
  );
}

async function compileJavaScript() {
  for (const [input, output] of jsBundles) {
    const source = await readFile(path.join(siteRoot, input), 'utf8');
    const result = await minify(source, {
      ecma: 2020,
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false }
    });
    if (!result.code) throw new Error(`Terser produced no output for ${input}`);
    if (await writeIfChanged(path.join(siteRoot, output), `${result.code}\n`)) {
      console.log(`${input} -> ${output}`);
    }
  }
}

async function compileStylesheets() {
  for (const [input, output] of cssBundles) {
    const source = await readFile(path.join(siteRoot, input), 'utf8');
    /* restructure:false is intentional: it keeps cascade/source order intact,
       so minification cannot subtly change the existing visual design. */
    const result = minifyCss(source, { restructure: false });
    if (!result.css) throw new Error(`csso produced no output for ${input}`);
    if (await writeIfChanged(path.join(siteRoot, output), `${result.css}\n`)) {
      console.log(`${input} -> ${output}`);
    }
  }
}

export async function buildAssets() {
  await compileJavaScript();
  await compileStylesheets();

  const htmlPath = path.join(siteRoot, 'index.html');
  let html = await readFile(htmlPath, 'utf8');

  /* These two large authored stylesheets now ship through deterministic,
     cascade-preserving minified files. Re-running the build is idempotent. */
  html = html
    .replace(/css\/modern-framer(?:\.min)?\.css/g, 'css/modern-framer.min.css')
    .replace(/css\/experience(?:\.min)?\.css/g, 'css/experience.min.css');
  html = await fingerprintQuotedAssets(html);
  html = await fingerprintVersionedLocalAssets(html);

  const notFoundPath = path.join(siteRoot, '404.html');
  let notFound = await fingerprintQuotedAssets(await readFile(notFoundPath, 'utf8'));
  notFound = await fingerprintVersionedLocalAssets(notFound);

  const swPath = path.join(siteRoot, 'sw.js');
  let sw = await readFile(swPath, 'utf8');
  sw = await fingerprintQuotedAssets(sw);
  sw = await fingerprintVersionedLocalAssets(sw);
  const stamp = serviceWorkerVersion(sw, html);
  sw = sw.replace(/const SW_VERSION = '[^']*';/, `const SW_VERSION = '${stamp}';`);

  html = html.replace(/\/sw\.js(?:\?v=[A-Za-z0-9._-]+)?/g, `/sw.js?v=${stamp}`);

  if (await writeIfChanged(swPath, sw)) console.log(`sw.js -> ${stamp}`);
  if (await writeIfChanged(htmlPath, html)) console.log('index.html -> content fingerprints');
  if (await writeIfChanged(notFoundPath, notFound)) console.log('404.html -> content fingerprints');

  const sitemapPath = path.join(siteRoot, 'sitemap.xml');
  const sitemap = await readFile(sitemapPath, 'utf8');
  const staticPagesOnly = stripStaticBlogPosts(sitemap);
  if (await writeIfChanged(sitemapPath, staticPagesOnly)) {
    console.log('sitemap.xml -> removed database-owned blog URLs');
  }

  return { serviceWorkerVersion: stamp };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await buildAssets();
