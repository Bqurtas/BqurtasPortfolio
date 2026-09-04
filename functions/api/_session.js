/* Shared security helpers for the private Studio APIs.
   SESSION_SECRET is deliberately independent from DASH_PIN, EDIT_TOKEN and
   STATS_TOKEN: knowing any of those values must never be enough to mint a
   browser session. */

const COOKIE = '__Host-bq_admin_session';
const TTL_MS = 2 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const memoryRates = new Map();
const rateSchemaPromises = new WeakMap();
const ratePruneTimes = new WeakMap();
const editSchemaPromises = new WeakMap();

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacBytes(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function keyedDigest(secret, message) {
  if (!secret) return '';
  return bytesToBase64Url(await hmacBytes(String(secret), String(message)));
}

/* Compare equal-size digests so supplied secrets never short-circuit at the
   first differing character. */
export async function secretEqual(supplied, expected) {
  if (typeof expected !== 'string' || expected.length === 0) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(supplied ?? ''))),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const aa = new Uint8Array(a);
  const bb = new Uint8Array(b);
  let mismatch = aa.length ^ bb.length;
  for (let i = 0; i < aa.length; i += 1) mismatch |= aa[i] ^ bb[i];
  return mismatch === 0;
}

function signingSecret(env) {
  const value = String((env && env.SESSION_SECRET) || '');
  return encoder.encode(value).byteLength >= 32 ? value : '';
}

export function sessionConfigured(env) {
  return signingSecret(env).length > 0;
}

export async function issueSession(env) {
  const secret = signingSecret(env);
  if (!secret) return null;
  const expires = Date.now() + TTL_MS;
  const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `${expires}.${nonce}`;
  const signature = await keyedDigest(secret, payload);
  return `${COOKIE}=${payload}.${signature}; Path=/; Max-Age=${TTL_MS / 1000}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSession() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function cookieValue(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  for (const entry of cookies.split(';')) {
    const item = entry.trim();
    if (item.startsWith(`${name}=`)) return item.slice(name.length + 1);
  }
  return '';
}

function constantTimeTextEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export async function hasSession(request, env) {
  const secret = signingSecret(env);
  if (!secret) return false;
  const parts = cookieValue(request, COOKIE).split('.');
  if (parts.length !== 3) return false;
  const [expiresText, nonce, signature] = parts;
  if (!/^\d{13}$/.test(expiresText) || !/^[A-Za-z0-9_-]{20,32}$/.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const expires = Number(expiresText);
  const now = Date.now();
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + TTL_MS + 60_000) return false;
  const expected = await keyedDigest(secret, `${expiresText}.${nonce}`);
  return constantTimeTextEqual(signature, expected);
}

async function ensureEditTokenStore(DB) {
  let schema = editSchemaPromises.get(DB);
  if (!schema) {
    schema = DB.prepare('CREATE TABLE IF NOT EXISTS studio_auth (k TEXT PRIMARY KEY, digest TEXT NOT NULL, updated INTEGER NOT NULL)').run();
    editSchemaPromises.set(DB, schema);
  }
  try { await schema; } catch (error) {
    editSchemaPromises.delete(DB);
    throw error;
  }
}

/* EDIT_TOKEN bootstraps the browser-facing Studio credential. The Settings UI
   may later rotate it without putting the replacement in plaintext in D1.
   Once a rotated digest exists, the bootstrap token is no longer accepted. */
export async function hasEditToken(request, env) {
  const bootstrap = String((env && env.EDIT_TOKEN) || '');
  const supplied = request.headers.get('x-edit-token') || '';
  if (!sessionConfigured(env) || !bootstrap || !supplied || !env || !env.DB) return false;
  try {
    await ensureEditTokenStore(env.DB);
    const row = await env.DB.prepare("SELECT digest FROM studio_auth WHERE k='edit-token'").first();
    if (row && row.digest) {
      const digest = await keyedDigest(signingSecret(env), `studio-edit-token|${supplied}`);
      return constantTimeTextEqual(digest, String(row.digest));
    }
  } catch (error) {
    return false;
  }
  return secretEqual(supplied, bootstrap);
}

export async function rotateEditToken(env, replacement) {
  if (!env || !env.DB || !sessionConfigured(env)) return false;
  const token = String(replacement || '');
  if (token.length < 4 || token.length > 256) return false;
  try {
    await ensureEditTokenStore(env.DB);
    const digest = await keyedDigest(signingSecret(env), `studio-edit-token|${token}`);
    await env.DB.prepare(
      "INSERT INTO studio_auth (k,digest,updated) VALUES ('edit-token',?,?) ON CONFLICT(k) DO UPDATE SET digest=excluded.digest,updated=excluded.updated"
    ).bind(digest, Date.now()).run();
    return true;
  } catch (error) {
    return false;
  }
}

export function noStoreHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra
  };
}

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: noStoreHeaders(extraHeaders)
  });
}

export function noContent(status = 204, extraHeaders = {}) {
  const headers = noStoreHeaders(extraHeaders);
  delete headers['Content-Type'];
  return new Response(null, { status, headers });
}

/* Browser mutations must originate from the same site. Origin is preferred;
   Fetch Metadata and Referer cover same-origin GETs and older WebKit clients. */
export function isSameOrigin(request) {
  let expected;
  try { expected = new URL(request.url).origin; } catch (error) { return false; }
  const origin = request.headers.get('Origin');
  if (origin) {
    try { return new URL(origin).origin === expected; } catch (error) { return false; }
  }
  const fetchSite = (request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  if (fetchSite === 'same-origin' || fetchSite === 'none') return true;
  const referer = request.headers.get('Referer');
  if (referer) {
    try { return new URL(referer).origin === expected; } catch (error) { return false; }
  }
  return false;
}

export class RequestInputError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function readJson(request, maxBytes = 16_384) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) throw new RequestInputError('unsupported-media-type', 415);
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestInputError('payload-too-large', 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new RequestInputError('payload-too-large', 413);
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
    return parsed;
  } catch (error) {
    throw new RequestInputError('bad-json', 400);
  }
}

export function inputErrorResponse(error) {
  if (error instanceof RequestInputError) return json({ ok: false, error: error.code }, error.status);
  return json({ ok: false, error: 'bad-request' }, 400);
}

export function clientAddress(request) {
  return String(request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '')
    .split(',')[0].trim().slice(0, 64);
}

export async function rateKey(request, env, scope, secretOverride) {
  const secret = String(secretOverride || signingSecret(env));
  if (!secret) return '';
  const ip = clientAddress(request);
  const fallback = String(request.headers.get('User-Agent') || 'unknown').slice(0, 256);
  /* Do not mix UA into an available IP key: an attacker must not be able to
     reset a PIN limit simply by rotating User-Agent strings. */
  return keyedDigest(secret, `${scope}|${ip || `ua:${fallback}`}`);
}

function memoryRate(key, now, limit, windowMs) {
  if (memoryRates.size > 2_000) {
    for (const [entry, value] of memoryRates) if (value.reset <= now) memoryRates.delete(entry);
  }
  const current = memoryRates.get(key);
  if (!current || current.reset <= now) {
    memoryRates.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0, durable: false };
  }
  if (current.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1000)), durable: false };
  current.count += 1;
  return { ok: true, retryAfter: 0, durable: false };
}

/* Uses a Cloudflare Rate Limiting binding when supplied, otherwise an atomic
   D1 upsert. In-memory limiting is intentionally only an opt-in fallback for
   low-risk reads; costly/writable endpoints request durable enforcement. */
export async function takeRateLimit(env, key, { limit, windowMs, durable = true }) {
  const now = Date.now();
  if (!key) return { ok: false, unavailable: true, retryAfter: 0 };

  if (env && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
    try {
      const result = await env.RATE_LIMITER.limit({ key });
      return { ok: result && result.success !== false, retryAfter: 60, durable: true };
    } catch (error) {
      if (durable && !(env && env.DB)) return { ok: false, unavailable: true, retryAfter: 0 };
    }
  }

  if (env && env.DB) {
    try {
      let schema = rateSchemaPromises.get(env.DB);
      if (!schema) {
        schema = env.DB.prepare('CREATE TABLE IF NOT EXISTS api_rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)').run();
        rateSchemaPromises.set(env.DB, schema);
      }
      try { await schema; } catch (error) {
        rateSchemaPromises.delete(env.DB);
        throw error;
      }
      const lastPrune = ratePruneTimes.get(env.DB) || 0;
      if (now - lastPrune > 10 * 60 * 1000) {
        await env.DB.prepare('DELETE FROM api_rate WHERE reset <= ?').bind(now).run();
        ratePruneTimes.set(env.DB, now);
      }
      const result = await env.DB.prepare(`
        INSERT INTO api_rate (k,n,reset) VALUES (?,1,?)
        ON CONFLICT(k) DO UPDATE SET
          n=CASE WHEN api_rate.reset <= ? THEN 1 ELSE api_rate.n+1 END,
          reset=CASE WHEN api_rate.reset <= ? THEN excluded.reset ELSE api_rate.reset END
        WHERE api_rate.reset <= ? OR api_rate.n < ?
      `).bind(key, now + windowMs, now, now, now, limit).run();
      const changes = Number((result.meta && result.meta.changes) ?? result.changes ?? 0);
      if (changes > 0) return { ok: true, retryAfter: 0, durable: true };
      const row = await env.DB.prepare('SELECT reset FROM api_rate WHERE k=?').bind(key).first();
      return { ok: false, retryAfter: Math.max(1, Math.ceil((((row && row.reset) || now + windowMs) - now) / 1000)), durable: true };
    } catch (error) {
      if (durable) return { ok: false, unavailable: true, retryAfter: 0 };
    }
  }

  if (durable) return { ok: false, unavailable: true, retryAfter: 0 };
  return memoryRate(key, now, limit, windowMs);
}

export async function clearRateLimit(env, key) {
  memoryRates.delete(key);
  if (!env || !env.DB || !key) return;
  try { await env.DB.prepare('DELETE FROM api_rate WHERE k=?').bind(key).run(); } catch (error) { /* expiry still clears it */ }
}
