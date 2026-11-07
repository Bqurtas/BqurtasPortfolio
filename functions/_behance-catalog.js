/* =========================================================
   Barakat Qurtas — server-side Behance catalogue
   /assets/behance/projects.json, published with the site, is the only
   source: the Behance room lists it in the browser, and the edge function
   reads the same file to give each project its own page
   (/behance/<id>-<slug>), share card, CreativeWork data and sitemap entry.

   The leading underscore keeps this a helper module: it exports no
   onRequest handler, so Pages never routes a URL to it.
   ========================================================= */

export const BEHANCE_CATALOGUE_PATH = '/assets/behance/projects.json';

/* Behance gallery ids are positive integers (nine digits today). A project
   URL segment is the id, optionally followed by "-" and a slug of letters,
   digits and hyphens. The service worker, the dev server and the analytics
   allowlists use the same bounds. Case and slug are corrected by a 301 once
   the catalogue is read; any other shape is not a project URL at all. */
export const BEHANCE_ID = /^[1-9]\d{5,11}$/;
export const BEHANCE_SEGMENT = /^([1-9]\d{5,11})(?:-[A-Za-z0-9-]*)?$/;

const SITE = 'https://bqurtas.com';
// First-party files only: no "..", no other folder, and no query except the
// content stamp the sync writes (?v=<12 hex>, see scripts/behance-sync.mjs).
const IMAGE_PATH = /^\/assets\/behance\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(webp|jpe?g|png|avif|gif)(?:\?v=[0-9a-f]{12})?$/i;
const IMAGE_TYPES = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif', gif: 'image/gif' };

const text = (value) => (typeof value === 'string' || typeof value === 'number')
  ? String(value).replace(/\s+/g, ' ').trim() : '';
const dimension = (value) => Number.isSafeInteger(value) && value > 0 ? value : 0;

/* The slug as written in projects.json (already lower-case [a-z0-9-]);
   anything else is folded into that shape so the canonical URL is always
   one the router accepts — a redirect can never point at a 404. */
const canonicalSlug = (value) => text(value).toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

function isoDate(value) {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(date + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : '';
}

function behanceUrl(value) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && /^(?:www\.)?behance\.net$/i.test(url.hostname) ? url.href : '';
  } catch (e) { return ''; }
}

function image(value) {
  const match = value && typeof value.src === 'string' ? IMAGE_PATH.exec(value.src) : null;
  if (!match) return null;
  return { src: value.src, w: dimension(value.w), h: dimension(value.h), type: IMAGE_TYPES[match[1].toLowerCase()] };
}

function project(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = text(raw.id);
  if (!BEHANCE_ID.test(id)) return null;
  const slug = canonicalSlug(raw.slug);
  const cover = image(raw.cover);
  return {
    id,
    slug,
    segment: slug ? id + '-' + slug : id,
    title: text(raw.title) || 'Behance',
    url: behanceUrl(raw.url),
    date: isoDate(raw.date),
    about: Array.isArray(raw.about) ? raw.about.map(text).filter(Boolean) : [],
    tags: Array.isArray(raw.tags) ? [...new Set(raw.tags.map(text).filter(Boolean))] : [],
    // The share card needs the real size; a cover without one is not used.
    cover: cover && cover.w && cover.h ? cover : null,
    images: (Array.isArray(raw.images) ? raw.images : []).map(image).filter(Boolean).map((item) => item.src)
  };
}

/* Valid projects in catalogue order, first occurrence of an id wins. */
export function behanceCatalogue(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    throw new Error('invalid behance catalogue');
  }
  const byId = new Map();
  for (const raw of data.projects) {
    const item = project(raw);
    if (item && !byId.has(item.id)) byId.set(item.id, item);
  }
  return { projects: [...byId.values()], byId };
}

/* One catalogue read per isolate (per ASSETS binding, so tests can swap it),
   exactly like the gallery manifest. A failed read is not remembered: the
   next request tries again. */
const memo = new WeakMap();
export function loadBehanceCatalogue(env, origin) {
  const assets = env && env.ASSETS;
  if (!assets || typeof assets.fetch !== 'function') return Promise.reject(new Error('ASSETS binding missing'));
  if (memo.has(assets)) return memo.get(assets);
  const pending = (async () => {
    const response = await assets.fetch(new URL(BEHANCE_CATALOGUE_PATH, origin || SITE));
    if (!response || !response.ok) throw new Error('behance catalogue unavailable');
    return behanceCatalogue(await response.json());
  })();
  memo.set(assets, pending);
  pending.catch(() => { if (memo.get(assets) === pending) memo.delete(assets); });
  return pending;
}

/* A meta description from the project's first paragraph: whole words,
   at most `max` characters including the ellipsis. */
export function shortDescription(value, max = 160) {
  const clean = text(value);
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  const cut = chars.slice(0, max - 1).join('');
  const space = cut.lastIndexOf(' ');
  return (space > cut.length * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '') + '…';
}
