/* Studio CMS content endpoint.
   GET is public. Mutations require both the HttpOnly two-factor session and
   the independent x-edit-token header. */

import {
  hasSession,
  hasEditToken,
  inputErrorResponse,
  isSameOrigin,
  json,
  rateKey,
  readJson,
  sessionConfigured,
  takeRateLimit
} from './_session.js';

async function ensure(DB) {
  await DB.prepare(
    "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, type TEXT DEFAULT 'post', num TEXT DEFAULT '', tag TEXT DEFAULT '', date TEXT DEFAULT '', readmin INTEGER DEFAULT 4, accent TEXT DEFAULT '#1a2740', img TEXT DEFAULT '', title TEXT DEFAULT '', sub TEXT DEFAULT '', body TEXT DEFAULT '[]', ts INTEGER NOT NULL)"
  ).run();
}

async function authorized(request, env) {
  if (!sessionConfigured(env) || !env.EDIT_TOKEN) return false;
  const [session, token] = await Promise.all([
    hasSession(request, env),
    hasEditToken(request, env)
  ]);
  return session && token;
}

function shape(row) {
  let body = [];
  try { body = JSON.parse(row.body || '[]'); } catch (error) { body = row.body ? [String(row.body)] : []; }
  if (!Array.isArray(body)) body = [String(body)];
  return {
    id: row.id,
    type: row.type,
    num: row.num,
    tag: row.tag,
    date: row.date,
    read: row.readmin,
    accent: row.accent,
    img: row.img,
    title: row.title,
    sub: row.sub,
    body
  };
}

function textField(value, name, maximum, { required = false } = {}) {
  if (value == null) value = '';
  if (typeof value !== 'string') throw new Error(`${name}-invalid`);
  const result = value.trim();
  if (required && !result) throw new Error(`${name}-required`);
  if (result.length > maximum) throw new Error(`${name}-too-long`);
  return result;
}

function normalizePost(input) {
  const id = input.id == null || input.id === ''
    ? `c${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`
    : textField(input.id, 'id', 64);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('id-invalid');

  const type = textField(input.type == null ? 'post' : input.type, 'type', 16);
  if (!/^[a-z][a-z-]{0,15}$/.test(type)) throw new Error('type-invalid');
  const num = textField(input.num, 'num', 18);
  if (num && !/^[1-9]\d{0,17}$/.test(num)) throw new Error('num-invalid');
  const accent = textField(input.accent == null ? '#1a2740' : input.accent, 'accent', 9);
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(accent)) throw new Error('accent-invalid');
  const image = textField(input.img, 'img', 2_048);
  if (image && !/^(?:https:\/\/|\/|assets\/)/i.test(image)) throw new Error('img-invalid');

  const read = input.read == null || input.read === '' ? 4 : Number(input.read);
  if (!Number.isInteger(read) || read < 1 || read > 120) throw new Error('read-invalid');

  let body;
  if (Array.isArray(input.body)) body = input.body;
  else if (typeof input.body === 'string') body = input.body.split('\n').map((value) => value.trim()).filter(Boolean);
  else if (input.body == null) body = [];
  else throw new Error('body-invalid');
  if (body.length > 100 || body.some((part) => typeof part !== 'string' || part.length > 10_000)) throw new Error('body-invalid');
  if (body.reduce((length, part) => length + part.length, 0) > 80_000) throw new Error('body-too-long');

  return {
    id,
    type,
    num,
    tag: textField(input.tag, 'tag', 80),
    date: textField(input.date, 'date', 80),
    read,
    accent,
    image,
    title: textField(input.title, 'title', 300, { required: true }),
    sub: textField(input.sub, 'sub', 1_000),
    body
  };
}

async function mutationGate(request, env) {
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  if (!sessionConfigured(env) || !env.EDIT_TOKEN) return json({ ok: false, error: 'not-configured' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);
  const key = await rateKey(request, env, 'content-write');
  const slot = await takeRateLimit(env, key, { limit: 120, windowMs: 15 * 60 * 1000, durable: true });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: 'no-db', posts: [] }, 503);
  try {
    await ensure(env.DB);
    const rows = (await env.DB.prepare("SELECT * FROM posts WHERE type='post' ORDER BY ts DESC").all()).results || [];
    return json({ ok: true, posts: rows.map(shape) });
  } catch (error) {
    return json({ ok: false, error: 'content-unavailable', posts: [] }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  const gate = await mutationGate(request, env);
  if (gate) return gate;

  let input;
  try { input = await readJson(request, 96 * 1024); } catch (error) { return inputErrorResponse(error); }

  let post;
  try { post = normalizePost(input); } catch (error) {
    return json({ ok: false, error: String(error.message || 'invalid-post') }, 400);
  }

  try {
    await ensure(env.DB);
    await env.DB.prepare(
      "INSERT INTO posts (id,type,num,tag,date,readmin,accent,img,title,sub,body,ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) "
      + 'ON CONFLICT(id) DO UPDATE SET type=excluded.type,num=excluded.num,tag=excluded.tag,date=excluded.date,readmin=excluded.readmin,accent=excluded.accent,img=excluded.img,title=excluded.title,sub=excluded.sub,body=excluded.body,ts=excluded.ts'
    ).bind(
      post.id, post.type, post.num, post.tag, post.date, post.read, post.accent,
      post.image, post.title, post.sub, JSON.stringify(post.body), Date.now()
    ).run();
    return json({ ok: true, id: post.id });
  } catch (error) {
    return json({ ok: false, error: 'content-write-failed' }, 503);
  }
}

export async function onRequestDelete({ request, env }) {
  const gate = await mutationGate(request, env);
  if (gate) return gate;

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json({ ok: false, error: 'id-required' }, 400);
  try {
    await ensure(env.DB);
    await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: 'content-delete-failed' }, 503);
  }
}
