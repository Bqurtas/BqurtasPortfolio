/* Two-factor login for the studio console. Two ways to turn it on:

   FREE — authenticator app (TOTP, e.g. Google Authenticator):
     Variables → TOTP_SECRET = a base32 secret (generate it in the dashboard
     Settings → "Set up 2FA"). Nothing is sent; you read the 6-digit code from
     the app. No cost, no SMS.

   Paid — SMS via Twilio:
     Variables → TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM (+ optional
     OWNER_PHONE, default +9647517884985). Uses D1 (binding DB) to hold codes.

   If neither is configured the dashboard stays PIN-only — you can never lock
   yourself out. Every call is gated behind the console PIN (DASH_PIN, default
   107502) so no stranger can trigger it.                                     */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
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
  for (const dt of [-30000, 0, 30000]) { if (await totpAt(secret, now + dt) === String(code)) return true; }
  return false;
}

async function ensure(DB) { await DB.prepare('CREATE TABLE IF NOT EXISTS twofa (id TEXT PRIMARY KEY, code TEXT, exp INTEGER, tries INTEGER DEFAULT 0)').run(); }
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }
  if (String(body.pin || '') !== String(env.DASH_PIN || '107502')) return json({ ok: false, error: 'bad-pin' }, 401);

  const hasTOTP = !!env.TOTP_SECRET;
  const hasSMS = env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM;
  if (!hasTOTP && !hasSMS) return json({ ok: false, error: 'not-configured' });

  /* begin a challenge */
  if (body.action === 'send') {
    if (hasTOTP) return json({ ok: true, id: 'totp' });          // free: just ask for the app code
    if (!env.DB) return json({ ok: false, error: 'no-db' });
    await ensure(env.DB);
    await env.DB.prepare('DELETE FROM twofa WHERE exp < ?').bind(Date.now()).run();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO twofa (id,code,exp,tries) VALUES (?,?,?,0)').bind(id, await sha(code), Date.now() + 5 * 60 * 1000).run();
    const to = env.OWNER_PHONE || '+9647517884985';
    const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: 'Pencemor studio login code: ' + code });
    let tr;
    try {
      tr = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env.TWILIO_SID + '/Messages.json', {
        method: 'POST', headers: { Authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString()
      });
    } catch (e) { return json({ ok: false, error: 'sms-failed' }); }
    if (!tr.ok) { const td = await tr.text(); return json({ ok: false, error: 'sms-failed', detail: td.slice(0, 160) }); }
    return json({ ok: true, id });
  }

  /* verify a code */
  if (body.action === 'verify') {
    if (body.id === 'totp') {
      if (!hasTOTP) return json({ ok: false, error: 'expired' });
      return json(await totpValid(env.TOTP_SECRET, body.code) ? { ok: true } : { ok: false, error: 'wrong-code' });
    }
    if (!env.DB) return json({ ok: false, error: 'no-db' });
    await ensure(env.DB);
    const row = (await env.DB.prepare('SELECT * FROM twofa WHERE id=?').bind(String(body.id || '')).all()).results[0];
    if (!row || row.exp < Date.now()) { if (row) await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'expired' }); }
    if (row.tries >= 5) { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'too-many' }); }
    if ((await sha(String(body.code || ''))) !== row.code) { await env.DB.prepare('UPDATE twofa SET tries=tries+1 WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'wrong-code' }); }
    await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: 'bad-action' }, 400);
}
