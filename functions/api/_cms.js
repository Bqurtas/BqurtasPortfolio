/* Native D1 content store. Separate tables preserve the older /api/content
   schema, and AUTOINCREMENT keeps previously published article IDs reserved. */
import { json } from './_session.js';

const schemas = new WeakMap();
export const CMS_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS cms_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, pos REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS cms_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, pos REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS cms_latest (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, pos REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS cms_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS cms_likes (post_id INTEGER NOT NULL, token TEXT NOT NULL, PRIMARY KEY(post_id,token))',
  'CREATE TABLE IF NOT EXISTS cms_subscribers (email TEXT PRIMARY KEY, lang TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS cms_comments_post ON cms_comments(post_id,created_at)'
];
export async function ensureCms(DB) {
  if (!DB) throw new Error('cms-unavailable');
  if (!schemas.has(DB)) {
    const pending = DB.batch(CMS_SCHEMA.map(sql => DB.prepare(sql))).catch(error => { schemas.delete(DB); throw error; });
    schemas.set(DB, pending);
  }
  await schemas.get(DB);
}
function shape(row) {
  const data = JSON.parse(row.payload);
  return { ...data, id: row.id, pos: row.pos, created_at: row.created_at,
    ...(row.published == null ? { active: !!row.active } : { published: !!row.published }) };
}
async function list(DB, table, gate, { since, limit } = {}) {
  await ensureCms(DB);
  const after = typeof since === 'string' && Number.isFinite(Date.parse(since)) ? new Date(since).toISOString() : '';
  const bounded = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 1000)));
  const args = limit == null ? [after, after] : [after, after, bounded];
  const rows = await DB.prepare(`SELECT * FROM ${table} WHERE ${gate} AND (?='' OR created_at>?) ORDER BY pos ASC,created_at DESC,id DESC${limit == null ? '' : ' LIMIT ?'}`).bind(...args).all();
  return (rows.results || []).map(shape);
}
export const listPublishedPosts = (DB, options) => list(DB, 'cms_posts', 'published=1', options);
export const listPublishedProjects = (DB, options) => list(DB, 'cms_projects', 'published=1', options);
export const listLatest = (DB, options) => list(DB, 'cms_latest', 'active=1', options);
export async function getPublishedPost(DB, id) {
  await ensureCms(DB);
  const row = await DB.prepare('SELECT * FROM cms_posts WHERE id=? AND published=1').bind(Number(id)).first();
  return row ? shape(row) : null;
}
function contentTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return '';
  const day = value.slice(0, 10);
  const midnight = Date.parse(day + 'T00:00:00Z');
  const time = Date.parse(value);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day
      || !Number.isFinite(time) || time > Date.now()) return '';
  return new Date(time).toISOString();
}
/* Both search surfaces use the same real content dates. Missing, invalid or
   future legacy values are omitted, never replaced with a made-up date. */
export function cmsContentDates(post) {
  const published = contentTimestamp(post?.created_at);
  const updated = contentTimestamp(post?.updated_at);
  const modified = updated && (!published || updated >= published) ? updated : published;
  return { ...(published ? { datePublished: published } : {}), ...(modified ? { dateModified: modified } : {}) };
}
export function validCmsId(value) {
  return (typeof value === 'number' || (typeof value === 'string' && /^[0-9]+$/.test(value)))
    && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
function text(value, maximum, required = false) {
  if (value == null) value = '';
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) throw new Error('invalid-content');
  return value.trim();
}
function safeMediaUrl(value) {
  const url = text(value, 2048);
  if (!url) return '';
  if (!/^(?:https:\/\/|\/(?!\/)|assets\/)/i.test(url) || /[\\\u0000-\u001f\u007f]/.test(url)) throw new Error('invalid-media-url');
  let parsed;
  try { parsed = new URL(url, 'https://bqurtas.com/'); } catch { throw new Error('invalid-media-url'); }
  const firstParty = parsed.origin === 'https://bqurtas.com';
  const repository = parsed.origin === 'https://raw.githubusercontent.com'
    && /^\/Bqurtas\/BqurtasPortfolio\/[^/]+\/.+/.test(parsed.pathname);
  if (parsed.username || parsed.password || (!firstParty && !repository)) throw new Error('invalid-media-url');
  return url;
}
function translations(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-content');
  const result = {};
  for (const lang of ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv']) {
    if (!value[lang]) continue;
    if (typeof value[lang] !== 'object' || Array.isArray(value[lang])) throw new Error('invalid-content');
    result[lang] = {};
    for (const key of ['title', 'subtitle', 'body', 'client', 'role', 'tag', 'summary']) {
      if (value[lang][key] != null) result[lang][key] = text(value[lang][key], key === 'body' ? 100000 : 2000);
    }
  }
  return result;
}
function normalize(input, service, i18n) {
  const data = { title: text(input.title, 300, true) };
  for (const key of ['subtitle','tag','num','date','client','year','role','summary','slug']) if (input[key] != null) data[key] = text(String(input[key]), key === 'summary' ? 6000 : 2000);
  if (input.body != null) data.body = text(input.body, 100000);
  if (input.cover != null) data.cover = safeMediaUrl(input.cover);
  if (input.image != null) data.image = safeMediaUrl(input.image);
  if (input.accent != null) {
    if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(input.accent)) throw new Error('invalid-content');
    data.accent = input.accent;
  }
  if (input.read_minutes != null) { const n = Number(input.read_minutes); if (!Number.isInteger(n) || n < 1 || n > 240) throw new Error('invalid-content'); data.read_minutes = n; }
  if (service === 'latest-admin') { data.link = text(input.link, 80); data.active = input.active !== false; }
  else data.published = input.published === true;
  if (input.palette != null) {
    if (!Array.isArray(input.palette) || input.palette.length > 32) throw new Error('invalid-content');
    data.palette = input.palette.map(c => {
      const hex = typeof c === 'string' ? c : c?.hex;
      if (typeof hex !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) throw new Error('invalid-content');
      return { name: text(typeof c === 'string' ? '' : c.name, 80), hex };
    });
  }
  if (input.gallery != null) {
    if (!Array.isArray(input.gallery) || input.gallery.length > 100) throw new Error('invalid-content');
    data.gallery = input.gallery.map(image => ({ url: safeMediaUrl(image?.url) }));
  }
  data.i18n = translations(i18n ?? input.i18n);
  return data;
}
export async function handleCmsAdmin(service, body, env) {
  const tables = { 'blog-admin': 'cms_posts', 'projects-admin': 'cms_projects', 'latest-admin': 'cms_latest' };
  const table = Object.hasOwn(tables, service) ? tables[service] : null;
  if (!table) return json({ ok: false, error: 'unknown-studio-service' }, 404);
  const actions = service === 'latest-admin' ? ['list', 'delete', 'reorder', 'add']
    : service === 'blog-admin' ? ['list', 'delete', 'reorder', 'upsert'] : ['list', 'delete', 'upsert'];
  if (!actions.includes(body?.action)) return json({ ok: false, error: 'invalid-content' }, 400);
  await ensureCms(env.DB);
  if (body.action === 'list') {
    const rows = (await env.DB.prepare(`SELECT * FROM ${table} ORDER BY pos ASC,created_at DESC,id DESC`).all()).results || [];
    const items = rows.map(shape);
    return json({ ok: true, [service === 'blog-admin' ? 'posts' : service === 'projects-admin' ? 'projects' : 'items']: items });
  }
  if (body.action === 'delete') {
    if (!validCmsId(body.id)) return json({ ok: false, error: 'invalid-content' }, 400);
    await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(Number(body.id)).run();
    return json({ ok: true });
  }
  if (body.action === 'reorder') {
    if (!Array.isArray(body.ids) || body.ids.length > 1000 || !body.ids.every(validCmsId)) return json({ ok: false, error: 'invalid-content' }, 400);
    if (body.ids.length) await env.DB.batch(body.ids.map((id, index) => env.DB.prepare(`UPDATE ${table} SET pos=? WHERE id=?`).bind(index, Number(id))));
    return json({ ok: true });
  }
  let input = body.post || body.project || body.item;
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || (input.id != null && !validCmsId(input.id))) return json({ ok: false, error: 'invalid-content' }, 400);
  let previous;
  if (input.id != null) {
    const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(Number(input.id)).first();
    if (!row) return json({ ok: false, error: 'content-not-found' }, 404);
    previous = shape(row);
    input = { ...previous, ...input, pos: input.pos ?? row.pos };
  }
  let payload;
  try { payload = normalize(input, service, body.i18n); } catch (error) {
    if (error.message === 'invalid-media-url') return json({
      ok: false, error: 'invalid-media-url',
      detail: 'Upload the image here, or use an image URL from bqurtas.com or the BqurtasPortfolio GitHub repository.'
    }, 400);
    return json({ ok: false, error: 'invalid-content' }, 400);
  }
  const flag = service === 'latest-admin' ? 'active' : 'published';
  const pos = Number.isFinite(Number(input.pos)) ? Number(input.pos) : 0;
  const date = new Date().toISOString();
  /* Record publication/content changes at the server. A list, reorder, or
     no-op save must not advertise a fresh article to search engines. Client
     supplied timestamps never pass normalize(). */
  let previousPayload;
  try { if (previous) previousPayload = normalize(previous, service); } catch {}
  if (!previous || JSON.stringify(payload) !== JSON.stringify(previousPayload)) payload.updated_at = date;
  else if (contentTimestamp(previous.updated_at)) payload.updated_at = previous.updated_at;
  if (input.id != null) {
    await env.DB.prepare(`UPDATE ${table} SET payload=?,${flag}=?,pos=? WHERE id=?`).bind(JSON.stringify(payload), payload[flag] ? 1 : 0, pos, Number(input.id)).run();
    return json({ ok: true, id: Number(input.id) });
  }
  const result = await env.DB.prepare(`INSERT INTO ${table}(payload,${flag},pos,created_at) VALUES(?,?,?,?)`).bind(JSON.stringify(payload), payload[flag] ? 1 : 0, pos, date).run();
  return json({ ok: true, id: Number(result.meta.last_row_id) });
}
