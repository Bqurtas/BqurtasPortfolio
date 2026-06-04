/* Private analytics read endpoint. Protected by a token you set in Cloudflare
   as the STATS_TOKEN environment variable (never stored in the source code).
   Returns aggregates for the Studio dashboard's Visitors tab. */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'no-db' });

  const token = new URL(request.url).searchParams.get('token') || '';
  if (!env.STATS_TOKEN || token !== env.STATS_TOKEN) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

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
