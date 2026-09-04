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
  keyedDigest,
  rateKey,
  readJson,
  secretEqual,
  sessionConfigured,
  takeRateLimit
} from './_session.js';

const PIN_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000, durable: true };
const SEND_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000, durable: true };
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

async function totpValid(secret, supplied) {
  const now = Date.now();
  let valid = false;
  for (const shift of [-30_000, 0, 30_000]) {
    if (await secretEqual(supplied, await totpAt(secret, now + shift))) valid = true;
  }
  return valid;
}

async function ensureChallenges(DB) {
  await DB.prepare('CREATE TABLE IF NOT EXISTS twofa (id TEXT PRIMARY KEY, code TEXT NOT NULL, exp INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0)').run();
}

function secureSixDigitCode() {
  const range = 900_000;
  const ceiling = 0x1_0000_0000 - (0x1_0000_0000 % range);
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= ceiling);
  return String(100_000 + (values[0] % range));
}

function validEmail(value) {
  return /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(String(value || ''));
}

function emailDelivery(env, choice) {
  const recipient = choice === 'backup' ? 'backup' : 'primary';
  const accessKey = recipient === 'backup' ? env.WEB3FORMS_BACKUP_KEY : env.WEB3FORMS_KEY;
  const sender = String(env.TWOFA_SENDER_EMAIL || '').trim();
  if (!accessKey || !validEmail(sender)) return null;
  return { recipient, accessKey: String(accessKey), sender };
}

function smsConfigured(env) {
  const phone = String(env.OWNER_PHONE || '');
  const hasDestination = /^\+[1-9]\d{7,14}$/.test(phone);
  const infobip = env.INFOBIP_API_KEY && env.INFOBIP_BASE_URL && env.INFOBIP_FROM;
  const twilio = env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM;
  return !!(hasDestination && (infobip || twilio));
}

function totpConfigured(env) {
  return /^[A-Z2-7]{16,}$/.test(String(env.TOTP_SECRET || '').replace(/=+$/, '').toUpperCase().replace(/\s/g, ''));
}

function secondFactorConfigured(env) {
  const emailAllowed = String(env.TWOFA_EMAIL_DISABLED || '').trim() !== '1';
  return totpConfigured(env)
    || (emailAllowed && !!(emailDelivery(env, 'primary') || emailDelivery(env, 'backup')))
    || smsConfigured(env);
}

async function sendEmail(env, delivery, code) {
  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: delivery.accessKey,
      subject: `Pencemor Studio login code ${code}`,
      from_name: 'Pencemor Studio',
      email: delivery.sender,
      message: `Your Studio login code is ${code}. It expires in 5 minutes.`
    }),
    signal: AbortSignal.timeout(10_000)
  });
  return response.ok;
}

async function sendSms(env, code) {
  const to = String(env.OWNER_PHONE);
  const text = `Pencemor Studio login code: ${code}`;
  if (env.INFOBIP_API_KEY && env.INFOBIP_BASE_URL && env.INFOBIP_FROM) {
    const host = String(env.INFOBIP_BASE_URL).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!/^[A-Za-z0-9.-]+$/.test(host)) return false;
    const response = await fetch(`https://${host}/sms/2/text/advanced`, {
      method: 'POST',
      headers: { Authorization: `App ${env.INFOBIP_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: [{ destinations: [{ to: to.replace(/^\+/, '') }], from: env.INFOBIP_FROM, text }] }),
      signal: AbortSignal.timeout(10_000)
    });
    return response.ok;
  }
  const form = new URLSearchParams({ To: to, From: String(env.TWILIO_FROM), Body: text });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_SID)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString(),
    signal: AbortSignal.timeout(10_000)
  });
  return response.ok;
}

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    configured: !!(env.DASH_PIN && env.DB && sessionConfigured(env) && secondFactorConfigured(env)),
    authenticated: await hasSession(request, env)
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await readJson(request, 4_096); } catch (error) { return inputErrorResponse(error); }

  /* Logout remains available during a DB or provider outage. */
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

  const hasTotp = totpConfigured(env);
  const emailAllowed = String(env.TWOFA_EMAIL_DISABLED || '').trim() !== '1';
  const delivery = emailAllowed ? emailDelivery(env, body.recipient) : null;
  const hasSms = smsConfigured(env);
  if (!hasTotp && !delivery && !hasSms) return json({ ok: false, error: 'not-configured' }, 503);

  if (body.action === 'send') {
    if (body.recipient && !['primary', 'backup'].includes(body.recipient)) return json({ ok: false, error: 'bad-recipient' }, 400);
    /* Honour the email destination selected by the current dashboard. TOTP is
       the delivery-free fallback when that inbox has not been configured. */
    if (!delivery && hasTotp) return json({ ok: true, id: 'totp', via: 'totp' });

    const sendBucket = await rateKey(request, env, 'twofa-send');
    const sendSlot = await takeRateLimit(env, sendBucket, SEND_LIMIT);
    if (!sendSlot.ok) return rateResponse(sendSlot);

    const now = Date.now();
    const code = secureSixDigitCode();
    const id = crypto.randomUUID();
    const digest = await keyedDigest(env.SESSION_SECRET, `twofa-code|${code}`);
    try {
      await ensureChallenges(env.DB);
      await env.DB.prepare('DELETE FROM twofa WHERE exp < ?').bind(now).run();
      await env.DB.prepare('INSERT INTO twofa (id,code,exp,tries) VALUES (?,?,?,0)').bind(id, digest, now + 5 * 60 * 1000).run();
    } catch (error) {
      return json({ ok: false, error: 'twofa-unavailable' }, 503);
    }

    try {
      if (delivery) {
        if (!(await sendEmail(env, delivery, code))) throw new Error('delivery');
        return json({ ok: true, id, via: 'email', recipient: delivery.recipient });
      }
      if (!(await sendSms(env, code))) throw new Error('delivery');
      return json({ ok: true, id, via: 'sms' });
    } catch (error) {
      try { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(id).run(); } catch (cleanupError) { /* challenge expires */ }
      return json({ ok: false, error: delivery ? 'email-failed' : 'sms-failed' }, 502);
    }
  }

  if (body.action === 'verify') {
    if (!/^\d{6}$/.test(String(body.code || ''))) return json({ ok: false, error: 'wrong-code' }, 401);
    const verifyBucket = await rateKey(request, env, 'twofa-verify');
    const verifySlot = await takeRateLimit(env, verifyBucket, VERIFY_LIMIT);
    if (!verifySlot.ok) return rateResponse(verifySlot);

    let valid = false;
    if (body.id === 'totp') {
      if (!hasTotp) return json({ ok: false, error: 'expired' }, 410);
      try { valid = await totpValid(env.TOTP_SECRET, String(body.code)); } catch (error) {
        return json({ ok: false, error: 'not-configured' }, 503);
      }
    } else {
      const id = String(body.id || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ ok: false, error: 'expired' }, 410);
      let row;
      try {
        await ensureChallenges(env.DB);
        row = await env.DB.prepare('SELECT id,code,exp,tries FROM twofa WHERE id=?').bind(id).first();
      } catch (error) {
        return json({ ok: false, error: 'twofa-unavailable' }, 503);
      }
      if (!row || row.exp < Date.now()) {
        if (row) try { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(id).run(); } catch (error) { /* expired */ }
        return json({ ok: false, error: 'expired' }, 410);
      }
      if (row.tries >= 5) {
        try { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(id).run(); } catch (error) { /* expired */ }
        return json({ ok: false, error: 'too-many' }, 429);
      }
      const suppliedDigest = await keyedDigest(env.SESSION_SECRET, `twofa-code|${body.code}`);
      valid = await secretEqual(suppliedDigest, String(row.code));
      try {
        if (!valid) await env.DB.prepare('UPDATE twofa SET tries=tries+1 WHERE id=?').bind(id).run();
        else await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(id).run();
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
