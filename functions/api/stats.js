/* Private analytics read endpoint for the Studio dashboard's Visitors tab.
   Protected by a token you set in Cloudflare as STATS_TOKEN.

   Two data sources, picked automatically:
     1) Umami Cloud (preferred) — set UMAMI_API_KEY (an Umami Cloud API key).
        Optional: UMAMI_WEBSITE_ID (defaults to this site), UMAMI_TZ, UMAMI_API_URL.
        This returns exactly what the Umami dashboard shows.
     2) Cloudflare D1 (fallback) — bind a database as DB (filled by /api/hit).
*/

import { hasSession } from './_session.js';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function umami(env, path, params) {
  const id = env.UMAMI_WEBSITE_ID || 'f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa';
  const base = (env.UMAMI_API_URL || 'https://api.umami.is/v1').replace(/\/+$/, '');
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${base}/websites/${id}/${path}?${qs}`, {
    headers: { 'x-umami-api-key': env.UMAMI_API_KEY, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error('umami ' + path + ' ' + r.status);
  return r.json();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  /* Out of the URL. A query string travels into browser history, the service
     worker's Cache Storage, referrer headers and every proxy log along the
     way, so a secret placed there is a secret published. The header is read
     first; the query is still accepted so an older open dashboard tab keeps
     working, and the page has been changed to stop sending it. */
  const url = new URL(request.url);
  const token = request.headers.get('x-stats-token') || url.searchParams.get('token') || '';
  const authed = (!!env.STATS_TOKEN && token === env.STATS_TOKEN) || await hasSession(request, env);

  /* ---- Preferred: Umami Cloud (same numbers as the Umami dashboard) ---- */
  if (env.UMAMI_API_KEY) {
    if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);
    try {
      const now = Date.now();
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const tz = env.UMAMI_TZ || 'Asia/Baghdad';
      const wide = now - 365 * 86400000, s14 = now - 14 * 86400000, s30 = now - 30 * 86400000;
      const [overall, today, pv, mPaths, mCountries, mRef, mDev] = await Promise.all([
        umami(env, 'stats',     { startAt: wide,               endAt: now }),
        umami(env, 'stats',     { startAt: dayStart.getTime(), endAt: now }),
        umami(env, 'pageviews', { startAt: s14, endAt: now, unit: 'day', timezone: tz }),
        umami(env, 'metrics',   { startAt: s30, endAt: now, type: 'url',      limit: 10 }),
        umami(env, 'metrics',   { startAt: s30, endAt: now, type: 'country',  limit: 10 }),
        umami(env, 'metrics',   { startAt: s30, endAt: now, type: 'referrer', limit: 8 }),
        umami(env, 'metrics',   { startAt: s30, endAt: now, type: 'device',   limit: 6 }),
      ]);
      const val = (o, k) => (o && o[k] && typeof o[k].value === 'number') ? o[k].value
                          : (o && typeof o[k] === 'number' ? o[k] : 0);
      const series = ((pv && pv.pageviews) || []).map(p => ({ d: String(p.x).slice(0, 10), c: p.y }));
      const mapM = (arr, key) => (Array.isArray(arr) ? arr : []).map(m => ({ [key]: m.x, c: m.y }));
      return json({
        ok: true,
        views: val(overall, 'pageviews'), visitors: val(overall, 'visitors'),
        viewsToday: val(today, 'pageviews'), visitorsToday: val(today, 'visitors'),
        series,
        paths: mapM(mPaths, 'path'),
        countries: mapM(mCountries, 'country'),
        referrers: mapM(mRef, 'ref'),
        devices: mapM(mDev, 'device'),
        recent: []
      });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e).slice(0, 140) });
    }
  }

  /* ---- Fallback: custom Cloudflare D1 analytics (filled by /api/hit) ---- */
  if (!env.DB) return json({ ok: false, error: 'no-db' });
  if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);

  const DB = env.DB;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const todayTs = start.getTime();
  const since14 = Date.now() - 14 * 86400000;
  const q = (sql, ...b) => DB.prepare(sql).bind(...b);

  try {
    const views         = (await q('SELECT COUNT(*) c FROM hits').first()).c;
    const viewsToday    = (await q('SELECT COUNT(*) c FROM hits WHERE ts>=?', todayTs).first()).c;
    const visitors      = (await q('SELECT COUNT(DISTINCT vid) c FROM hits').first()).c;
    const visitorsToday = (await q('SELECT COUNT(DISTINCT vid) c FROM hits WHERE ts>=?', todayTs).first()).c;
    const series    = (await q("SELECT date(ts/1000,'unixepoch') d, COUNT(*) c FROM hits WHERE ts>=? GROUP BY d ORDER BY d", since14).all()).results;
    const paths     = (await q('SELECT path, COUNT(*) c FROM hits GROUP BY path ORDER BY c DESC LIMIT 10').all()).results;
    const countries = (await q("SELECT country, COUNT(*) c FROM hits WHERE country<>'' GROUP BY country ORDER BY c DESC LIMIT 10").all()).results;
    const referrers = (await q("SELECT ref, COUNT(*) c FROM hits WHERE ref<>'' GROUP BY ref ORDER BY c DESC LIMIT 8").all()).results;
    const devices   = (await q('SELECT device, COUNT(*) c FROM hits GROUP BY device ORDER BY c DESC').all()).results;
    const recent    = (await q('SELECT ts, path, country, device, ref FROM hits ORDER BY ts DESC LIMIT 15').all()).results;

    return json({ ok: true, views, viewsToday, visitors, visitorsToday,
                  series, paths, countries, referrers, devices, recent });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e).slice(0, 140) });
  }
}
