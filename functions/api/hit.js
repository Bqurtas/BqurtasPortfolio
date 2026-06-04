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

export async function onRequestPost(context) {
  const { request, env } = context;
  const ok = new Response('', { status: 204 });
  if (!env.DB) return ok; // analytics DB not connected yet — do nothing

  try {
    const ua = request.headers.get('User-Agent') || '';
    if (!ua || /bot|crawl|spider|slurp|bing|yandex|preview|monitor|lighthouse|headless|curl|wget|python|axios|fetch|facebookexternal|whatsapp|telegram/i.test(ua)) {
      return ok; // ignore bots / link unfurlers
    }

    let body = {};
    try { body = JSON.parse((await request.text()) || '{}'); } catch (e) {}

    const path    = (String(body.p || '/').split('?')[0] || '/').slice(0, 120);
    const ref     = host(body.r || '');
    const lang    = String(body.l || '').slice(0, 5);
    const country = (request.cf && request.cf.country) || request.headers.get('CF-IPCountry') || '';
    const device  = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile'
                  : (/iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop');
    const ip      = request.headers.get('CF-Connecting-IP') || '';
    const day     = new Date().toISOString().slice(0, 10);
    const v       = await vid(ip, ua, day, env.SALT || 'bq-2026');

    await env.DB.prepare(
      'INSERT INTO hits (ts, path, ref, country, device, lang, vid) VALUES (?,?,?,?,?,?,?)'
    ).bind(Date.now(), path, ref, country, device, lang, v).run();
  } catch (e) { /* never break the page over analytics */ }

  return ok;
}
