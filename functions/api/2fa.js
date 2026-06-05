/* Two-factor login for the studio console. After the PIN is entered the
   dashboard calls this to text a one-time code to the owner's phone, then
   verifies it. OPTIONAL: if the Twilio vars aren't set the dashboard simply
   falls back to PIN-only, so you can never lock yourself out before setup.

   Cloudflare env vars:
     TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM   (required to enable SMS 2FA)
     OWNER_PHONE   (optional, default +9647517884985 — your number)
     DASH_PIN      (optional, default 107502 — must match the console code)
   Uses the analytics D1 binding (DB) to hold codes for 5 minutes.            */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function ensure(DB) {
  await DB.prepare('CREATE TABLE IF NOT EXISTS twofa (id TEXT PRIMARY KEY, code TEXT, exp INTEGER, tries INTEGER DEFAULT 0)').run();
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }

  // Gate every call behind the console PIN so no stranger can text the owner.
  if (String(body.pin || '') !== String(env.DASH_PIN || '107502')) return json({ ok: false, error: 'bad-pin' }, 401);

  const configured = env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM;
  if (!configured) return json({ ok: false, error: 'not-configured' });
  if (!env.DB) return json({ ok: false, error: 'no-db' });
  await ensure(env.DB);

  if (body.action === 'send') {
    await env.DB.prepare('DELETE FROM twofa WHERE exp < ?').bind(Date.now()).run();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO twofa (id,code,exp,tries) VALUES (?,?,?,0)')
      .bind(id, await sha(code), Date.now() + 5 * 60 * 1000).run();

    const to = env.OWNER_PHONE || '+9647517884985';
    const auth = btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN);
    const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: 'Pencemor studio login code: ' + code });
    let tr;
    try {
      tr = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env.TWILIO_SID + '/Messages.json', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
    } catch (e) { return json({ ok: false, error: 'sms-failed' }); }
    if (!tr.ok) { const td = await tr.text(); return json({ ok: false, error: 'sms-failed', detail: td.slice(0, 160) }); }
    return json({ ok: true, id });
  }

  if (body.action === 'verify') {
    const row = (await env.DB.prepare('SELECT * FROM twofa WHERE id=?').bind(String(body.id || '')).all()).results[0];
    if (!row || row.exp < Date.now()) { if (row) await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'expired' }); }
    if (row.tries >= 5) { await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run(); return json({ ok: false, error: 'too-many' }); }
    if ((await sha(String(body.code || ''))) !== row.code) {
      await env.DB.prepare('UPDATE twofa SET tries=tries+1 WHERE id=?').bind(row.id).run();
      return json({ ok: false, error: 'wrong-code' });
    }
    await env.DB.prepare('DELETE FROM twofa WHERE id=?').bind(row.id).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: 'bad-action' }, 400);
}
