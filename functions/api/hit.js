/* First-party, cookieless visit logging → Cloudflare D1 (binding: DB).
   Privacy: no cookies, no raw IP stored. A daily one-way hash (IP+UA+date)
   gives an approximate unique-visitor id that cannot identify anyone and
   rotates every day. If no D1 is bound yet, this safely no-ops. */

function host(u) {
  try { return new URL(u).hostname.replace(/^www\./, '').slice(0, 80); }
  catch (e) { return ''; }
}

async function vid(ip, ua, day, salt) {
  const data = new TextEncoder().encode(ip + '|' + ua + '|' + day + '|' + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/* One writer, one slot. Without this the endpoint accepted unlimited
   unauthenticated writes: anyone could inflate the numbers and grow D1 without
   bound, and the figures on the dashboard would mean nothing. Sixty beats a
   minute is far more than a person browsing can produce and far less than a
   script needs to be useful. */
async function withinRate(db, key, now) {
  if (!db) return true;
  try {
    await db.prepare(
      'CREATE TABLE IF NOT EXISTS hit_rate (k TEXT PRIMARY KEY, n INTEGER, win INTEGER)'
    ).run();
    const row = (await db.prepare('SELECT n, win FROM hit_rate WHERE k=?').bind(key).all()).results[0];
    const win = Math.floor(now / 60000);
    if (!row || row.win !== win) {
      await db.prepare('INSERT OR REPLACE INTO hit_rate (k, n, win) VALUES (?,1,?)').bind(key, win).run();
      return true;
    }
    if (row.n >= 60) return false;
    await db.prepare('UPDATE hit_rate SET n=n+1 WHERE k=?').bind(key).run();
    return true;
  } catch (e) { return true; }   /* never let the limiter break the page */
}

/* Only paths this site actually serves are recorded. The path arrived from the
   client and was written to the database as given, so anything at all could be
   inserted under any URL. */
const ROUTE_OK = /^\/(?:(?:ku|kmr|ar|fr|tr|sv)(?:\/|$))?(?:|design(?:\/[a-z-]{1,24})?|blog(?:\/\d{1,9})?|bio|contact)\/?$/i;

export async function onRequestPost(context) {
  const { request, env } = context;
  const ok = new Response('', { status: 204 });
  if (!env.DB) return ok; // analytics DB not connected yet — do nothing

  try {
    const ua = request.headers.get('User-Agent') || '';
    if (!ua || /bot|crawl|spider|slurp|bing|yandex|preview|monitor|lighthouse|headless|curl|wget|python|axios|fetch|facebookexternal|whatsapp|telegram/i.test(ua)) {
      return ok; // ignore bots / link unfurlers
    }

    /* A body big enough to be interesting is a body that is not ours. */
    const raw = await request.text();
    if (raw.length > 1024) return ok;
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { return ok; }

    const path    = (String(body.p || '/').split('?')[0] || '/').slice(0, 120);
    if (!ROUTE_OK.test(path)) return ok;
    const ref     = host(body.r || '');
    const lang    = String(body.l || '').slice(0, 5);
    if (lang && !/^(?:en|ku|kmr|ar|fr|tr|sv)$/.test(lang)) return ok;
    const country = (request.cf && request.cf.country) || request.headers.get('CF-IPCountry') || '';
    const device  = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile'
                  : (/iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop');
    const ip      = request.headers.get('CF-Connecting-IP') || '';
    const day     = new Date().toISOString().slice(0, 10);
    const v       = await vid(ip, ua, day, env.SALT || 'bq-2026');

    if (!(await withinRate(env.DB, 'ip:' + v, Date.now()))) return ok;

    await env.DB.prepare(
      'INSERT INTO hits (ts, path, ref, country, device, lang, vid) VALUES (?,?,?,?,?,?,?)'
    ).bind(Date.now(), path, ref, country, device, lang, v).run();
  } catch (e) { /* never break the page over analytics */ }

  return ok;
}
