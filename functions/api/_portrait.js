/* One small, public website portrait. GitHub keeps the original upload;
   Cloudflare D1 serves its immutable, bounded copy immediately, without
   waiting for the Pages build to finish. The existing Studio gate owns writes. */
import { json } from './_session.js';
import { decodeWebp, handleGithubMediaUpload } from './_github-works.js';
import { BUNDLED_PORTRAIT_VARIANTS } from '../_portrait-variants.js';

export const PORTRAIT_LIMIT = 1_000_000;
// Match the authored portrait's height-aware mobile and landscape limits;
// advertising 72vw made a 255px phone portrait request a 640px rendition.
export const PORTRAIT_SIZES = '(max-width: 820px) and (max-height: 620px) min(48vw, 28svh), (max-width: 820px) min(68vw, clamp(184px, 31svh, 272px)), (max-height: 620px) 40svh, min(42vw, 52svh, 448px)';
const VERSION = /^[a-f0-9]{64}$/;
const DARK_MODES = new Set(['invert', 'original']);
const schemas = new WeakMap();
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS site_portraits (version TEXT PRIMARY KEY, image BLOB NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL, github_path TEXT NOT NULL, github_commit TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS site_portrait_active (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS site_portrait_variants (parent_version TEXT NOT NULL, version TEXT NOT NULL, image BLOB NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, PRIMARY KEY(parent_version,width))',
  'CREATE INDEX IF NOT EXISTS site_portrait_variants_version ON site_portrait_variants(version)',
  "CREATE TABLE IF NOT EXISTS site_portrait_settings (id INTEGER PRIMARY KEY CHECK(id=1), dark_mode TEXT NOT NULL CHECK(dark_mode IN ('invert','original')))"
];

async function ensure(DB) {
  if (!DB) throw new Error('portrait-unavailable');
  if (!schemas.has(DB)) {
    const pending = DB.batch(SCHEMA.map(sql => DB.prepare(sql))).catch(error => { schemas.delete(DB); throw error; });
    schemas.set(DB, pending);
  }
  await schemas.get(DB);
}

function metadata(row, variants = []) {
  if (!row || !VERSION.test(row.version)) return null;
  return { url:`/api/portrait?image=${row.version}`, width:row.width, height:row.height, updated_at:row.created_at, dark_mode:row.dark_mode === 'original' ? 'original' : 'invert', ...(variants.length ? { variants } : {}) };
}

export async function readPublicPortrait(DB) {
  if (!DB) return null;
  await ensure(DB);
  const row = await DB.prepare('SELECT p.version,p.width,p.height,p.created_at,s.dark_mode FROM site_portraits p JOIN site_portrait_active a ON a.version=p.version LEFT JOIN site_portrait_settings s ON s.id=a.id WHERE a.id=1').first();
  if (!row) return null;
  // Existing approved originals can ship small renditions with the site. The
  // full content hash is the gate: a later upload can never inherit them.
  const bundled = BUNDLED_PORTRAIT_VARIANTS[row.version];
  if (bundled) return metadata(row, bundled);
  const result = await DB.prepare('SELECT version,width,height FROM site_portrait_variants WHERE parent_version=? ORDER BY width').bind(row.version).all();
  return metadata(row, (result.results || []).map(variant => ({ url:`/api/portrait?image=${variant.version}`, width:variant.width, height:variant.height })));
}

/* The generated sitemap contains the bundled hero. Studio can replace that
   image without a deploy, so publish the same active original the HTML uses.
   Only the homepage portrait entry changes; gallery works keep their URLs. */
export async function rewritePortraitSitemap(xml, DB) {
  let portrait;
  try { portrait = await readPublicPortrait(DB); } catch { return xml; }
  if (!portrait) return xml;
  return xml.replace(/<url>\s*<loc>https:\/\/bqurtas\.com\/?<\/loc>[\s\S]*?<\/url>/, block =>
    block.replace(/<image:loc>https:\/\/bqurtas\.com\/assets\/hero-sketch\.webp(?:\?v=[A-Za-z0-9._-]+)?<\/image:loc>/g,
      `<image:loc>https://bqurtas.com${portrait.url}</image:loc>`));
}

export async function readPortraitImage(DB, version) {
  if (!DB || !VERSION.test(version || '')) return null;
  await ensure(DB);
  return DB.prepare('SELECT image,width,height FROM site_portraits WHERE version=? UNION ALL SELECT image,width,height FROM site_portrait_variants WHERE version=? LIMIT 1').bind(version, version).first();
}

async function variantImages(body, image) {
  if (body.variants === undefined) return [];
  if (!Array.isArray(body.variants) || body.variants.length > 2) throw new Error('invalid-portrait-variants');
  const result = [];
  let totalBytes = image.bytes.length;
  for (const input of body.variants) {
    const variant = decodeWebp(input?.dataB64);
    totalBytes += variant.bytes.length;
    if (totalBytes > PORTRAIT_LIMIT || variant.width > image.width || variant.height > image.height
      || Math.max(variant.width, variant.height) > 960
      || Math.abs(variant.width * image.height - variant.height * image.width) > Math.max(image.width, image.height)) {
      throw new Error('invalid-portrait-variants');
    }
    // Small uploads may already fit every slot; do not add duplicate widths
    // or a larger encoding of the same resolution to the browser's srcset.
    if (variant.width >= image.width || variant.bytes.length >= image.bytes.length
      || result.some(item => item.width === variant.width)) continue;
    const version = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', variant.bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
    result.push({ ...variant, version });
  }
  return result;
}

export async function handlePortraitAdmin(body, env) {
  await ensure(env.DB);
  if (body.action === 'get') return json({ ok:true, portrait:await readPublicPortrait(env.DB) });
  if (body.action === 'reset') {
    await env.DB.prepare('DELETE FROM site_portrait_active WHERE id=1').run();
    // Retain the prior immutable image for old browser tabs and rollback.
    return json({ ok:true, portrait:null });
  }
  if ((body.action === 'appearance' || body.dark_mode !== undefined) && !DARK_MODES.has(body.dark_mode)) {
    return json({ ok:false, error:'invalid-portrait-appearance' }, 400);
  }
  if (body.action === 'appearance') {
    // The conditional write cannot create a setting for an absent portrait,
    // even if another editor resets it while this request is in flight.
    const saved = await env.DB.prepare('INSERT INTO site_portrait_settings(id,dark_mode) SELECT 1,? FROM site_portrait_active WHERE id=1 ON CONFLICT(id) DO UPDATE SET dark_mode=excluded.dark_mode').bind(body.dark_mode).run();
    if (!saved.meta?.changes) return json({ ok:false, error:'portrait-not-found' }, 404);
    return json({ ok:true, portrait:await readPublicPortrait(env.DB) });
  }
  if (body.action !== 'publish') return json({ ok:false, error:'invalid-studio-request' }, 400);

  let image;
  try { image = decodeWebp(body.dataB64); } catch { return json({ ok:false, error:'invalid-studio-image' }, 400); }
  if (image.bytes.length > PORTRAIT_LIMIT || image.width > 2048 || image.height > 2048) {
    return json({ ok:false, error:'portrait-image-too-large' }, 400);
  }
  let variants;
  try { variants = await variantImages(body, image); }
  catch { return json({ ok:false, error:'invalid-portrait-variants' }, 400); }
  const version = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', image.bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  const setting = await env.DB.prepare('SELECT dark_mode FROM site_portrait_settings WHERE id=1').first();
  const darkMode = body.dark_mode ?? (setting?.dark_mode === 'original' ? 'original' : 'invert');
  const storeVariants = () => variants.map(variant => env.DB.prepare('INSERT OR IGNORE INTO site_portrait_variants(parent_version,version,image,width,height) VALUES(?,?,?,?,?)')
    .bind(version, variant.version, variant.bytes.buffer, variant.width, variant.height));
  const activate = () => [
    env.DB.prepare('INSERT INTO site_portrait_active(id,version) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version').bind(version),
    env.DB.prepare('INSERT INTO site_portrait_settings(id,dark_mode) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET dark_mode=excluded.dark_mode').bind(darkMode)
  ];
  const existing = await env.DB.prepare('SELECT version,width,height,created_at FROM site_portraits WHERE version=?').bind(version).first();
  if (existing) {
    await env.DB.batch([...storeVariants(), ...activate()]);
    return json({ ok:true, portrait:await readPublicPortrait(env.DB) });
  }

  const uploaded = await handleGithubMediaUpload(body, env);
  if (!uploaded.ok) return uploaded;
  const saved = await uploaded.json();
  const created = new Date().toISOString();
  // D1 batch is transactional: a failed write cannot switch the active image.
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO site_portraits(version,image,width,height,created_at,github_path,github_commit) VALUES(?,?,?,?,?,?,?)')
      .bind(version, image.bytes.buffer, image.width, image.height, created, saved.path, saved.commit),
    ...storeVariants(),
    ...activate()
  ]);
  return json({ ok:true, portrait:await readPublicPortrait(env.DB) });
}

/* Keep both public uses and the high-priority preload in step. If D1 is
   temporarily unavailable, the approved bundled portrait remains untouched. */
export async function rewritePublicPortrait(rewriter, DB) {
  let portrait;
  try { portrait = await readPublicPortrait(DB); } catch { return rewriter; }
  if (!portrait) return rewriter;
  const srcset = portrait.variants?.map(variant => `${variant.url} ${variant.width}w`).concat(`${portrait.url} ${portrait.width}w`).join(', ');
  const image = { element(el) {
    el.setAttribute('data-portrait-default', el.getAttribute('src'));
    el.setAttribute('data-portrait-default-width', el.getAttribute('width') || '768');
    el.setAttribute('data-portrait-default-height', el.getAttribute('height') || '768');
    el.setAttribute('data-portrait-default-srcset', el.getAttribute('srcset') || '');
    el.setAttribute('data-portrait-default-sizes', el.getAttribute('sizes') || '');
    if (srcset) {
      el.setAttribute('srcset', srcset);
      el.setAttribute('sizes', PORTRAIT_SIZES);
    } else {
      // An upload without renditions must not retain a future bundled
      // fallback srcset and accidentally display the old portrait.
      el.setAttribute('srcset', '');
      el.setAttribute('sizes', '');
    }
    el.setAttribute('src', portrait.url);
    el.setAttribute('width', String(portrait.width));
    el.setAttribute('height', String(portrait.height));
    el.setAttribute('data-public-portrait', 'true');
    el.setAttribute('data-portrait-dark-mode', portrait.dark_mode);
  } };
  rewriter.on('#heroPortrait img', image).on('.bio-teaser-portrait > img', image);
  rewriter.on('link[rel="preload"][as="image"][href*="hero-sketch.webp"]', { element(el) {
    el.setAttribute('href', portrait.url);
    if (srcset) {
      el.setAttribute('imagesrcset', srcset);
      el.setAttribute('imagesizes', PORTRAIT_SIZES);
    }
  } });
  return rewriter;
}
