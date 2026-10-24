/* Two-factor login for the Studio console. Authentication succeeds only when
   DASH_PIN, a real second factor, D1 rate limiting and an independent
   SESSION_SECRET are all configured. */

import {
  clearRateLimit,
  clearSession,
  hasSession,
  inputErrorResponse,
  isSameOrigin,
  issueSession,
  json,
  rateKey,
  readJson,
  secretEqual,
  sessionConfigured,
  takeRateLimit
} from './_session.js';

const PIN_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000, durable: true };
const VERIFY_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000, durable: true };

function rateResponse(slot) {
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  return json(
    { ok: false, error: 'rate-limited', retryAfter: slot.retryAfter },
    429,
    { 'Retry-After': String(slot.retryAfter) }
  );
}

/* RFC 6238, SHA-1, six digits, with the standard adjacent-window allowance. */
function base32decode(value) {
  const source = String(value || '').replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z2-7]{16,}$/.test(source)) throw new Error('invalid-totp-secret');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let current = 0;
  const output = [];
  for (const character of source) {
    current = (current << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function totpAt(secret, time) {
  const counter = Math.floor(time / 1000 / 30);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', base32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const number = ((signature[offset] & 0x7f) << 24
    | signature[offset + 1] << 16
    | signature[offset + 2] << 8
    | signature[offset + 3]) % 1_000_000;
  return String(number).padStart(6, '0');
}

async function totpStep(secret, supplied) {
  const now = Date.now();
  let matched = null;
  for (const shift of [-30_000, 0, 30_000]) {
    if (await secretEqual(supplied, await totpAt(secret, now + shift))) matched = Math.floor((now + shift) / 30_000);
  }
  return matched;
}

async function ensureChallenges(DB) {
  await DB.prepare('CREATE TABLE IF NOT EXISTS twofa (id TEXT PRIMARY KEY, code TEXT NOT NULL, exp INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0)').run();
}

function changed(result) {
  return Number((result && result.meta && result.meta.changes) ?? (result && result.changes) ?? 0) > 0;
}

function totpConfigured(env) {
  return /^[A-Z2-7]{16,}$/.test(String(env.TOTP_SECRET || '').replace(/=+$/, '').toUpperCase().replace(/\s/g, ''));
}

export async function onRequestGet({ request, env }) {
  const requirements = {
    pin: !!env.DASH_PIN,
    session: sessionConfigured(env),
    database: !!env.DB,
    secondFactor: totpConfigured(env),
    editor: !!env.EDIT_TOKEN,
    github: typeof env.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN.trim().length > 0
  };
  return json({
    ok: true,
    configured: requirements.pin && requirements.database && requirements.session && requirements.secondFactor,
    authenticated: await hasSession(request, env),
    requirements
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await readJson(request, 4_096); } catch (error) { return inputErrorResponse(error); }

  /* Logout remains available during a database outage. */
  if (body.action === 'logout') {
    if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
    return json({ ok: true }, 200, { 'Set-Cookie': clearSession() });
  }

  const dashboardPin = String(env.DASH_PIN || '');
  if (!dashboardPin) return json({ ok: false, error: 'not-configured' }, 503);
  if (!sessionConfigured(env)) return json({ ok: false, error: 'session-not-configured' }, 503);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!['send', 'verify'].includes(body.action)) return json({ ok: false, error: 'bad-action' }, 400);
  if (typeof body.pin !== 'string' || body.pin.length > 128) return json({ ok: false, error: 'bad-pin' }, 401);

  const pinBucket = await rateKey(request, env, 'twofa-pin');
  const pinSlot = await takeRateLimit(env, pinBucket, PIN_LIMIT);
  if (!pinSlot.ok) return rateResponse(pinSlot);
  if (!(await secretEqual(body.pin, dashboardPin))) return json({ ok: false, error: 'bad-pin' }, 401);
  await clearRateLimit(env, pinBucket);

  if (!totpConfigured(env)) return json({ ok: false, error: 'not-configured' }, 503);

  if (body.action === 'send') {
    // The authenticator generates the second factor locally. Legacy recipient
    // fields are ignored; no login credential is sent to another service.
    return json({ ok: true, id: 'totp', via: 'totp' });
  }

  if (body.action === 'verify') {
    if (!/^\d{6}$/.test(String(body.code || ''))) return json({ ok: false, error: 'wrong-code' }, 401);
    const verifyBucket = await rateKey(request, env, 'twofa-verify');
    const verifySlot = await takeRateLimit(env, verifyBucket, VERIFY_LIMIT);
    if (!verifySlot.ok) return rateResponse(verifySlot);

    // Retired delivered-code challenges cannot mint sessions. Existing signed
    // sessions and the owner's authenticator secret remain unchanged.
    if (body.id !== 'totp') return json({ ok: false, error: 'expired' }, 410);
    let step;
    try { step = await totpStep(env.TOTP_SECRET, String(body.code)); } catch (error) {
      return json({ ok: false, error: 'not-configured' }, 503);
    }
    let valid = false;
    if (step !== null) {
      try {
        await ensureChallenges(env.DB);
        await env.DB.prepare('DELETE FROM twofa WHERE exp < ?').bind(Date.now()).run();
        /* RFC 6238 codes are one-time credentials. A unique timestep claim
           prevents replay, including concurrent requests on different edges. */
        valid = changed(await env.DB.prepare('INSERT OR IGNORE INTO twofa (id,code,exp,tries) VALUES (?,?,?,0)')
          .bind(`totp:${step}`, 'used', (step + 2) * 30_000).run());
      } catch (error) {
        return json({ ok: false, error: 'twofa-unavailable' }, 503);
      }
    }

    if (!valid) return json({ ok: false, error: 'wrong-code' }, 401);
    await clearRateLimit(env, verifyBucket);
    const cookie = await issueSession(env);
    if (!cookie) return json({ ok: false, error: 'session-not-configured' }, 503);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  }

  return json({ ok: false, error: 'bad-action' }, 400);
}
