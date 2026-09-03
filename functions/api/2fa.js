/* Two-factor login for the studio console. Two ways to turn it on:

   FREE — emailed code (recommended, no app needed):
     Default recipient is hello@bqurtas.com. Optional backup recipient is selected
     by the dashboard without exposing the address in the UI. For a separate
     Web3Forms inbox, set WEB3FORMS_BACKUP_KEY to an access key for that inbox.
     using the SAME free Web3Forms key the contact form already uses (no new
     service, no secret). Needs the D1 binding (DB). Optional: WEB3FORMS_KEY to
     override the key.

   FREE — authenticator app (TOTP, e.g. Google Authenticator):
     Variables → TOTP_SECRET = a base32 secret (generate it in the dashboard
     Settings → "Set up 2FA"). Nothing is sent; you read the 6-digit code from
     the app. No cost, no SMS.

   Paid — SMS via Twilio:
     Variables → TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM (+ optional
     OWNER_PHONE, default +9647517884985). Uses D1 (binding DB) to hold codes.

   Every call is gated behind DASH_PIN and a D1 DB rate limiter. There is
   deliberately no built-in PIN: if DB, DASH_PIN, or a second-factor delivery
   method is missing, authentication fails closed and the dashboard stays
   locked.                                                                    */

import { issueSession, clearSession } from './_session.js';

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(extraHeaders || {})
    }
  });
}

const encoder = new TextEncoder();

/* Compare fixed-length digests so a wrong PIN does not short-circuit on the
   first differing character. Workers that expose timingSafeEqual use it;
   other runtimes get a constant-work XOR fallback over the same 32 bytes. */
async function secretEqual(supplied, expected) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(supplied ?? ''))),
    crypto.subtle.digest('SHA-256', encoder.encode(String(expected ?? '')))
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(a, b);
  }
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let mismatch = aa.length ^ bb.length;
  for (let i = 0; i < aa.length; i++) mismatch |= aa[i] ^ bb[i];
  return mismatch === 0;
}

/* ---- TOTP (RFC 6238, SHA-1, 6 digits) — verified against the RFC vectors ---- */
function base32decode(s) {
  s = String(s || '').replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0; const out = [];
  for (const c of s) { const i = A.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; } }
  return new Uint8Array(out);
}
async function totpAt(secret, t) {
  const counter = Math.floor(t / 1000 / 30);
  const buf = new ArrayBuffer(8); const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 2 ** 32)); dv.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', base32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = sig[sig.length - 1] & 0xf;
  const code = ((sig[off] & 0x7f) << 24 | sig[off + 1] << 16 | sig[off + 2] << 8 | sig[off + 3]) % 1000000;
  return String(code).padStart(6, '0');
}
async function totpValid(secret, code) {
  const now = Date.now();
  let valid = false;
  for (const dt of [-30000, 0, 30000]) {
    if (await secretEqual(String(code || ''), await totpAt(secret, now + dt))) valid = true;
  }
  return valid;
}

async function ensure(DB) { await DB.prepare('CREATE TABLE IF NOT EXISTS twofa (id TEXT PRIMARY KEY, code TEXT, exp INTEGER, tries INTEGER DEFAULT 0)').run(); }
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', encoder.encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function ensureRateLimit(DB) {
  await DB.prepare('CREATE TABLE IF NOT EXISTS twofa_rate (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL)').run();
}
async function takeRateSlot(DB, bucket, now, maxSlots, windowMs) {
  await ensureRateLimit(DB);
  await DB.prepare('DELETE FROM twofa_rate WHERE reset <= ?').bind(now).run();
  const result = await DB.prepare(`
    INSERT INTO twofa_rate (bucket,count,reset) VALUES (?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET
      count=CASE WHEN twofa_rate.reset <= ? THEN 1 ELSE twofa_rate.count+1 END,
      reset=CASE WHEN twofa_rate.reset <= ? THEN excluded.reset ELSE twofa_rate.reset END
    WHERE twofa_rate.reset <= ? OR twofa_rate.count < ?
  `).bind(bucket, now + windowMs, now, now, now, maxSlots).run();
  const changed = Number((result.meta && result.meta.changes) ?? result.changes ?? 0);
  if (changed > 0) return { ok: true };
  const row = (await DB.prepare('SELECT reset FROM twofa_rate WHERE bucket=?').bind(bucket).all()).results[0];
  return { ok: false, retryAfter: Math.max(1, Math.ceil((((row && row.reset) || now + windowMs) - now) / 1000)) };
}
async function clearRateSlot(DB, bucket) { await DB.prepare('DELETE FROM twofa_rate WHERE bucket=?').bind(bucket).run(); }
function clientIp(request) {
  return String(request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown').split(',')[0].trim();
}
function secureSixDigitCode() {
  const range = 900000;
  const ceiling = 0x100000000 - (0x100000000 % range);
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= ceiling);
  return String(100000 + (values[0] % range));
}
function emailRecipient(env, choice) {
  const key = String(choice || 'primary').toLowerCase() === 'backup' ? 'backup' : 'primary';
  const primary = String(env.TWOFA_EMAIL_PRIMARY || 'Hello@bqurtas.com').trim();
  const backup = String(env.TWOFA_EMAIL_BACKUP || env.TWOFA_BACKUP_EMAIL || 'Bqurtas@gmail.com').trim();
  return {
    key,
    email: key === 'backup' ? backup : primary,
    formKey: key === 'backup' && env.WEB3FORMS_BACKUP_KEY ? env.WEB3FORMS_BACKUP_KEY : (env.WEB3FORMS_KEY || 'cd575d52-8847-4286-af53-efa296c04686')
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }
  const dashboardPin = String(env.DASH_PIN || '');
  if (!dashboardPin) return json({ ok: false, error: 'not-configured' }, 503);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);

  /* Reserve a per-IP attempt before comparing the short dashboard PIN. The
     reservation is removed after a correct PIN, so normal send/verify calls do
     not accumulate failures; eight wrong attempts lock that IP for 15 minutes. */
  const requesterIp = clientIp(request);
  const authBucket = await sha('twofa-pin:' + requesterIp);
  const authSlot = await takeRateSlot(env.DB, authBucket, Date.now(), 8, 15 * 60 * 1000);
  if (!authSlot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: authSlot.retryAfter }, 429, { 'Retry-After': String(authSlot.retryAfter) });
  if (!(await secretEqual(body.pin, dashboardPin))) return json({ ok: false, error: 'bad-pin' }, 401);
  await clearRateSlot(env.DB, authBucket);

  const hasTOTP = !!env.TOTP_SECRET;
  const hasEmail = String(env.TWOFA_EMAIL_DISABLED || '').trim() !== '1';
  const hasInfobip = env.INFOBIP_API_KEY && env.INFOBIP_BASE_URL && env.INFOBIP_FROM;
  const hasTwilio = env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM;
  const hasSMS = hasInfobip || hasTwilio;
  if (!hasTOTP && !hasSMS && !hasEmail) return json({ ok: false, error: 'not-configured' }, 503);

  /* begin a challenge */
  if (body.action === 'send') {
    if (hasTOTP) return json({ ok: true, id: 'totp' });          // free: just ask for the app code
    if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
    await ensure(env.DB);
    const now = Date.now();
    await env.DB.prepare('DELETE FROM twofa WHERE exp < ?').bind(now).run();
    const bucket = await sha('twofa-send:' + requesterIp);
    const slot = await takeRateSlot(env.DB, bucket, now, 5, 15 * 60 * 1000);
    if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });
    const code = secureSixDigitCode();
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO twofa (id,code,exp,tries) VALUES (?,?,?,0)').bind(id, await sha(code), now + 5 * 60 * 1000).run();

    /* EMAIL (free) — addresses are chosen server-side, so the dashboard can show
       "Primary" / "Backup" without exposing the real inboxes in the UI. */
    if (hasEmail) {
      const recipient = emailRecipient(env, body.recipient);
      let er;
      try {
        er = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: recipient.formKey,
            subject: 'Pencemor Studio — login code ' + code,
            from_name: 'Pencemor Studio',
            email: recipient.email,
            replyto: recipient.email,
            message: 'Your studio login code is ' + code + '.\n\nIt expires in 5 minutes. If this wasn’t you, you can ignore this email.'
          })
        });
      } catch (e) { return json({ ok: false, error: 'email-failed' }, 502); }
      if (!er.ok) { const ed = await er.text(); return json({ ok: false, error: 'email-failed', detail: ed.slice(0, 160) }, 502); }
      return json({ ok: true, id, via: 'email', recipient: recipient.key });
    }

    const to = env.OWNER_PHONE || '+9647517884985';
    const text = 'Pencemor studio login code: ' + code;
    let tr;
    try {
      if (hasInfobip) {
        // Infobip SMS — INFOBIP_BASE_URL looks like https://xxxxx.api.infobip.com (scheme optional)
        const host = String(env.INFOBIP_BASE_URL).replace(/^https?:\/\//, '').replace(/\/+$/, '');
        tr = await fetch('https://' + host + '/sms/2/text/advanced', {
          method: 'POST',
          headers: { Authorization: 'App ' + env.INFOBIP_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ messages: [{ destinations: [{ to: to.replace(/^\+/, '') }], from: env.INFOBIP_FROM, text }] })
        });
      } else {
        const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: text });
        tr = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env.TWILIO_SID + '/Messages.json', {
          method: 'POST', headers: { Authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString()
        });
      }
    } catch (e) { return json({ ok: false, error: 'sms-failed' }, 502); }
    if (!tr.ok) { const td = await tr.text(); return json({ ok: false, error: 'sms-failed', detail: td.slice(0, 160) }, 502); }
    return json({ ok: true, id });
  }

  /* verify a code */
  if (body.action === 'verify') {
    const verifyBucket = await sha('twofa-verify:' + requesterIp);
    const verifySlot = await takeRateSlot(env.DB, verifyBucket, Date.now(), 8, 15 * 60 * 1000);
    if (!verifySlot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: verifySlot.retryAfter }, 429, { 'Retry-After': String(verifySlot.retryAfter) });
    if (body.id === 'totp') {
      if (!hasTOTP) return json({ ok: false, error: 'expired' }, 410);
      const valid = await totpValid(env.TOTP_SECRET, body.code);
      if (valid) await clearRateSlot(env.DB, verifyBucket);
      if (!valid) return json({ ok: false, error: 'wrong-code' }, 401);
      const cookie = await issueSession(env);
      return json({ ok: true }, 200, cookie ? { 'Set-Cookie': cookie } : undefined);
    }
    if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
    await ensure(env.DB);
    const row = (await env.DB.prepare('SELECT * FROM twofa WHERE id=?').bind(String(body.id || '')).all()).results[0];
    if (!row || row.exp < Date.now()) { if (row) await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'expired' }, 410); }
    if (row.tries >= 5) { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'too-many' }, 429); }
    if (!(await secretEqual(await sha(String(body.code || '')), row.code))) { await env.DB.prepare('UPDATE twofa SET tries=tries+1 WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'wrong-code' }, 401); }
    await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run();
    await clearRateSlot(env.DB, verifyBucket);
    const cookie = await issueSession(env);
    return json({ ok: true }, 200, cookie ? { 'Set-Cookie': cookie } : undefined);
  }

  /* Signing out has to reach the server too — a flag cleared in the tab left
     the session valid everywhere else. */
  if (body.action === 'logout') {
    return json({ ok: true }, 200, { 'Set-Cookie': clearSession() });
  }

  return json({ ok: false, error: 'bad-action' }, 400);
}
