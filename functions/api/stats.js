/* Private analytics endpoint. Access requires a verified 2FA session and the
   x-stats-token header. Query-string credentials are intentionally rejected. */

import {
  hasSession,
  isSameOrigin,
  json,
  rateKey,
  secretEqual,
  sessionConfigured,
  takeRateLimit
} from './_session.js';

const DAY = 86_400_000;

async function authorized(request, env) {
  if (!sessionConfigured(env) || !env.STATS_TOKEN) return false;
  const [session, token] = await Promise.all([
    hasSession(request, env),
    secretEqual(request.headers.get('x-stats-token') || '', String(env.STATS_TOKEN))
  ]);
  return session && token;
}

function dateParts(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return values;
}

/* Convert local midnight in an IANA zone to its exact UTC epoch. Iterating
   also handles zones with daylight-saving offsets. */
function startOfZonedDay(timestamp, timeZone) {
  const local = dateParts(timestamp, timeZone);
  const target = Date.UTC(local.year, local.month - 1, local.day, 0, 0, 0);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const seen = dateParts(guess, timeZone);
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second);
    guess += target - seenAsUtc;
  }
  return guess;
}

async function umami(env, path, params) {
  const id = env.UMAMI_WEBSITE_ID || 'f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa';
  const base = String(env.UMAMI_API_URL || 'https://api.umami.is/v1').replace(/\/+$/, '');
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${base}/websites/${encodeURIComponent(id)}/${path}?${query}`, {
    headers: { 'x-umami-api-key': env.UMAMI_API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) throw new Error('upstream');
  return response.json();
}

async function fromUmami(env) {
  const now = Date.now();
  const timezone = env.UMAMI_TZ || 'Asia/Baghdad';
  const dayStart = startOfZonedDay(now, timezone);
  const wide = now - 400 * DAY;
  const start14 = now - 14 * DAY;
  const start30 = now - 30 * DAY;
  const [overall, today, pageviews, pathMetrics, countryMetrics, referrerMetrics, deviceMetrics] = await Promise.all([
    umami(env, 'stats', { startAt: wide, endAt: now }),
    umami(env, 'stats', { startAt: dayStart, endAt: now }),
    umami(env, 'pageviews', { startAt: start14, endAt: now, unit: 'day', timezone }),
    umami(env, 'metrics', { startAt: start30, endAt: now, type: 'url', limit: 10 }),
    umami(env, 'metrics', { startAt: start30, endAt: now, type: 'country', limit: 10 }),
    umami(env, 'metrics', { startAt: start30, endAt: now, type: 'referrer', limit: 8 }),
    umami(env, 'metrics', { startAt: start30, endAt: now, type: 'device', limit: 6 })
  ]);
  const value = (object, key) => {
    if (object && object[key] && typeof object[key].value === 'number') return object[key].value;
    return object && typeof object[key] === 'number' ? object[key] : 0;
  };
  const metrics = (items, key) => (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item.y === 'number')
    .map((item) => ({ [key]: String(item.x || '').slice(0, 160), c: item.y }));
  return {
    ok: true,
    views: value(overall, 'pageviews'),
    visitors: value(overall, 'visitors'),
    viewsToday: value(today, 'pageviews'),
    visitorsToday: value(today, 'visitors'),
    series: ((pageviews && pageviews.pageviews) || [])
      .filter((point) => point && typeof point.y === 'number')
      .map((point) => ({ d: String(point.x).slice(0, 10), c: point.y })),
    paths: metrics(pathMetrics, 'path'),
    countries: metrics(countryMetrics, 'country'),
    referrers: metrics(referrerMetrics, 'ref'),
    devices: metrics(deviceMetrics, 'device'),
    recent: []
  };
}

async function fromD1(env) {
  const DB = env.DB;
  const now = Date.now();
  const today = startOfZonedDay(now, 'Asia/Baghdad');
  const since14 = now - 14 * DAY;
  const query = (sql, ...bindings) => DB.prepare(sql).bind(...bindings);
  const [views, viewsToday, visitors, visitorsToday, series, paths, countries, referrers, devices, recent] = await Promise.all([
    query('SELECT COUNT(*) c FROM hits').first(),
    query('SELECT COUNT(*) c FROM hits WHERE ts>=?', today).first(),
    query('SELECT COUNT(DISTINCT vid) c FROM hits').first(),
    query('SELECT COUNT(DISTINCT vid) c FROM hits WHERE ts>=?', today).first(),
    query("SELECT date(ts/1000,'unixepoch','+3 hours') d, COUNT(*) c FROM hits WHERE ts>=? GROUP BY d ORDER BY d", since14).all(),
    query('SELECT path, COUNT(*) c FROM hits GROUP BY path ORDER BY c DESC LIMIT 10').all(),
    query("SELECT country, COUNT(*) c FROM hits WHERE country<>'' GROUP BY country ORDER BY c DESC LIMIT 10").all(),
    query("SELECT ref, COUNT(*) c FROM hits WHERE ref<>'' GROUP BY ref ORDER BY c DESC LIMIT 8").all(),
    query('SELECT device, COUNT(*) c FROM hits GROUP BY device ORDER BY c DESC LIMIT 6').all(),
    query('SELECT ts, path, country, device, ref FROM hits ORDER BY ts DESC LIMIT 15').all()
  ]);
  return {
    ok: true,
    views: Number(views.c || 0),
    viewsToday: Number(viewsToday.c || 0),
    visitors: Number(visitors.c || 0),
    visitorsToday: Number(visitorsToday.c || 0),
    series: series.results || [],
    paths: paths.results || [],
    countries: countries.results || [],
    referrers: referrers.results || [],
    devices: devices.results || [],
    recent: recent.results || []
  };
}

export async function onRequestGet({ request, env }) {
  if (!sessionConfigured(env) || !env.STATS_TOKEN) return json({ ok: false, error: 'not-configured' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

  const key = await rateKey(request, env, 'stats-read');
  const slot = await takeRateLimit(env, key, { limit: 60, windowMs: 60_000, durable: true });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });

  if (env.UMAMI_API_KEY) {
    try { return json(await fromUmami(env)); } catch (error) { /* use D1 below */ }
  }
  if (!env.DB) return json({ ok: false, error: env.UMAMI_API_KEY ? 'analytics-upstream-unavailable' : 'no-db' }, 503);
  try { return json(await fromD1(env)); } catch (error) {
    return json({ ok: false, error: 'analytics-unavailable' }, 503);
  }
}
