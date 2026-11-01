import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, serviceWorkerVersion } from './build-assets.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_SITE_ROOT = path.join(projectRoot, 'preview_site');
const QUOTED_CODE_ASSET = /(["'])(\/?(?:css|js|vendor)\/[A-Za-z0-9_./-]+\.(?:css|js))(?:\?v=([A-Za-z0-9._-]+))?\1/g;
const QUOTED_VERSIONED_LOCAL_ASSET = /(["'])(\/?(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)\?v=([A-Za-z0-9._-]+)\1/g;

function assetPath(root, reference) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, reference.replace(/^\//, '').split(/[?#]/, 1)[0]);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`asset path escapes preview_site: ${reference}`);
  }
  return resolved;
}

function localCssReference(cssFile, reference, root) {
  /* A data-URI may itself contain `url(...)`, so the lightweight scanner can
     stop before its closing quote. Removing either edge quote still lets us
     identify and ignore the outer data URL correctly. */
  const clean = reference.trim().replace(/^["']|["']$/g, '');
  if (!clean || /^(?:data:|https?:|\/\/|#)/i.test(clean)) return null;
  const withoutSuffix = clean.split(/[?#]/, 1)[0];
  let decoded;
  try { decoded = decodeURIComponent(withoutSuffix); } catch { return Symbol.for('malformed-url'); }
  return decoded.startsWith('/')
    ? path.resolve(root, decoded.slice(1))
    : path.resolve(path.dirname(cssFile), decoded);
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

export async function validateStructure(root = DEFAULT_SITE_ROOT) {
  const failures = [];
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const notFoundHtml = await readFile(path.join(root, '404.html'), 'utf8');
  const sw = await readFile(path.join(root, 'sw.js'), 'utf8');

  if (/css\/(?:modern-framer|experience)\.css(?:\?|["'])/.test(html)) {
    failures.push('index.html still loads an unminified large stylesheet');
  }

  for (const [documentName, documentHtml] of [['index.html', html], ['404.html', notFoundHtml]]) {
    for (const match of documentHtml.matchAll(QUOTED_CODE_ASSET)) {
      const [, , reference, version] = match;
      const file = assetPath(root, reference);
      if (!existsSync(file)) {
        failures.push(`missing code asset in ${documentName}: ${reference}`);
        continue;
      }
      if (!version) failures.push(`unfingerprinted code asset in ${documentName}: ${reference}`);
      else {
        const expected = contentHash(await readFile(file));
        if (version !== expected) failures.push(`stale fingerprint in ${documentName} for ${reference}: ${version} (expected ${expected})`);
      }
    }
    for (const match of documentHtml.matchAll(QUOTED_VERSIONED_LOCAL_ASSET)) {
      const [, , reference, version] = match;
      if (reference === '/sw.js' || reference === 'sw.js') continue;
      const file = assetPath(root, reference);
      if (!existsSync(file)) continue; // already reported by the reference checks
      const expected = contentHash(await readFile(file));
      if (version !== expected) failures.push(`stale local-asset fingerprint in ${documentName} for ${reference}`);
    }
  }

  const precacheBlock = (sw.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/) || [])[1];
  if (!precacheBlock) failures.push('service worker precache list is missing');
  else {
    const entries = [...precacheBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
    if (!entries.includes('/index.html')) failures.push('service worker does not precache /index.html');
    for (const entry of entries) {
      const file = assetPath(root, entry);
      if (!existsSync(file)) failures.push(`missing service-worker precache asset: ${entry}`);
      const version = new URL(entry, 'https://local.invalid').searchParams.get('v');
      if (version && existsSync(file)) {
        const expected = contentHash(await readFile(file));
        if (version !== expected) failures.push(`stale service-worker fingerprint for ${entry}`);
      }
    }
    for (const match of precacheBlock.matchAll(QUOTED_CODE_ASSET)) {
      const [, , reference, version] = match;
      if (!version) failures.push(`unfingerprinted service-worker asset: ${reference}`);
      else {
        const expected = contentHash(await readFile(assetPath(root, reference)));
        if (version !== expected) failures.push(`stale service-worker fingerprint for ${reference}`);
      }
    }
  }

  const declaredVersion = (sw.match(/const SW_VERSION = '([^']+)';/) || [])[1];
  const expectedVersion = serviceWorkerVersion(sw, html);
  if (!declaredVersion || declaredVersion !== expectedVersion) {
    failures.push(`stale service-worker version: ${declaredVersion || '(missing)'} (expected ${expectedVersion})`);
  }
  if (!html.includes(`/sw.js?v=${expectedVersion}`)) failures.push('index.html has a stale service-worker URL');

  for (const cssFile of (await listFiles(root)).filter((file) => file.endsWith('.css'))) {
    const css = await readFile(cssFile, 'utf8');
    for (const match of css.matchAll(/url\(([^)]+)\)/gi)) {
      const reference = localCssReference(cssFile, match[1], root);
      if (reference === Symbol.for('malformed-url')) {
        failures.push(`malformed CSS URL in ${path.relative(root, cssFile)}: ${match[1]}`);
      } else if (reference && !existsSync(reference)) {
        failures.push(`missing CSS asset in ${path.relative(root, cssFile)}: ${match[1]}`);
      }
    }
  }

  const gallery = JSON.parse(await readFile(path.join(root, 'assets/gallery-manifest.json'), 'utf8'));
  for (const record of gallery.images || []) {
    if (!record || typeof record.path !== 'string' || !record.path || record.path.includes('..')) {
      failures.push('gallery manifest contains an unsafe image path');
      continue;
    }
    if (!(record.width > 0) || !(record.height > 0)) failures.push(`gallery item lacks dimensions: ${record.path}`);
    const image = path.resolve(root, 'assets/thumbs', record.path);
    if (!existsSync(image)) failures.push(`missing gallery thumbnail: ${record.path}`);
  }

  const redirects = await readFile(path.join(root, '_redirects'), 'utf8');
  if (/^\s*\/\*\s+\/index\.html\s+200(?:\s|$)/m.test(redirects)) {
    failures.push('_redirects contains a wildcard 200 SPA fallback');
  }

  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
  if (/<loc>https:\/\/bqurtas\.com\/(?:(?:ku|kmr|ar|fr|tr|sv)\/)?blog\/\d+<\/loc>/.test(sitemap)) {
    failures.push('static sitemap contains database-owned numeric blog URLs');
  }

  return failures;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const failures = await validateStructure();
  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Validated fingerprints, offline assets, CSS URLs and gallery structure.');
  }
}
