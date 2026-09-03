/* Studio CMS content endpoint.
   - GET  /api/content            → public list of posts (no auth) for the blog.
   - POST /api/content            → create / update a post   (needs EDIT_TOKEN).
   - DELETE /api/content?id=...    → delete a post           (needs EDIT_TOKEN).
   Reuses the analytics D1 database (binding: DB). Writes are protected by an
   EDIT_TOKEN you set in Cloudflare (Settings → Environment variables) — it is
   never stored in the source. The table is auto-created on first use. */

import { hasSession } from './_session.js';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function ensure(DB) {
  await DB.prepare(
    "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, type TEXT DEFAULT 'post', num TEXT DEFAULT '', tag TEXT DEFAULT '', date TEXT DEFAULT '', readmin INTEGER DEFAULT 4, accent TEXT DEFAULT '#1a2740', img TEXT DEFAULT '', title TEXT DEFAULT '', sub TEXT DEFAULT '', body TEXT DEFAULT '[]', ts INTEGER NOT NULL)"
  ).run();
}

async function authed(env, request) {
  const t = request.headers.get('x-edit-token') || '';
  if (!!env.EDIT_TOKEN && t === env.EDIT_TOKEN) return true;
  /* A token in localStorage outlives a logout and never knew whether the
     second factor was passed. A session the server signed does both. */
  return hasSession(request, env);
}

function shape(r) {
  let body = [];
  try { body = JSON.parse(r.body || '[]'); } catch (e) { body = r.body ? [String(r.body)] : []; }
  if (!Array.isArray(body)) body = [String(body)];
  return { id: r.id, type: r.type, num: r.num, tag: r.tag, date: r.date,
           read: r.readmin, accent: r.accent, img: r.img, title: r.title, sub: r.sub, body };
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ ok: false, error: 'no-db', posts: [] });
  try {
    await ensure(env.DB);
    const rows = (await env.DB.prepare("SELECT * FROM posts WHERE type='post' ORDER BY ts DESC").all()).results || [];
    return json({ ok: true, posts: rows.map(shape) });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e), posts: [] });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'no-db' });
  if (!await authed(env, request)) return json({ ok: false, error: 'unauthorized' }, 401);
  let p;
  try { p = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }
  if (!p || !String(p.title || '').trim()) return json({ ok: false, error: 'title-required' }, 400);

  await ensure(env.DB);
  const id = (p.id && String(p.id).trim()) || ('c' + Date.now().toString(36));
  const bodyArr = Array.isArray(p.body) ? p.body : String(p.body || '').split('\n').map(s => s.trim()).filter(Boolean);
  await env.DB.prepare(
    "INSERT INTO posts (id,type,num,tag,date,readmin,accent,img,title,sub,body,ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET type=excluded.type,num=excluded.num,tag=excluded.tag,date=excluded.date,readmin=excluded.readmin,accent=excluded.accent,img=excluded.img,title=excluded.title,sub=excluded.sub,body=excluded.body,ts=excluded.ts"
  ).bind(
    id, p.type || 'post', String(p.num || ''), String(p.tag || ''), String(p.date || ''),
    parseInt(p.read, 10) || 4, String(p.accent || '#1a2740'), String(p.img || ''),
    String(p.title), String(p.sub || ''), JSON.stringify(bodyArr), Date.now()
  ).run();
  return json({ ok: true, id });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'no-db' });
  if (!await authed(env, request)) return json({ ok: false, error: 'unauthorized' }, 401);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id-required' }, 400);
  await ensure(env.DB);
  await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
  return json({ ok: true });
}
