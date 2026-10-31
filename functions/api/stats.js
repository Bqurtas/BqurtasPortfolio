/* Private analytics endpoint. Access requires a verified 2FA session and the
   x-stats-token header. Query-string credentials are intentionally rejected. */

import {
  clearRateLimit,
  hasSession,
  isSameOrigin,
  json,
  rateKey,
  secretEqual,
  sessionConfigured,
  takeRateLimit
} from './_session.js';
import { ensureAnalyticsStore } from './_analytics.js';

const DAY = 86_400_000;

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

async function fromD1(env) {
  const DB = env.DB;
  await ensureAnalyticsStore(DB);
  const now = Date.now();
  const today = startOfZonedDay(now, 'Asia/Baghdad');
  const since14 = now - 14 * DAY;
  const query = (sql, ...bindings) => DB.prepare(sql).bind(...bindings);
  const [views, viewsToday, visitors, visitorsToday, series, paths, countries, referrers, devices, recent] = await Promise.all([
    query('SELECT COUNT(*) c FROM hits').first(),
    query('SELECT COUNT(*) c FROM hits WHERE ts>=?', today).first(),
    query("SELECT COUNT(DISTINCT vid) c FROM hits WHERE vid<>''").first(),
    query("SELECT COUNT(DISTINCT vid) c FROM hits WHERE ts>=? AND vid<>''", today).first(),
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
  if (!(await hasSession(request, env))) return json({ ok: false, error: 'session-required' }, 401);
  const token = request.headers.get('x-stats-token') || '';
  if (!token) return json({ ok: false, error: 'unauthorized' }, 401);

  /* Reserve a durable attempt before checking the private analytics token.
     Successful credentials clear this budget without resetting read usage.
     Use D1 directly, as a Rate Limiting binding cannot clear valid attempts. */
  const authKey = await rateKey(request, env, 'stats-auth');
  const authSlot = await takeRateLimit({ DB: env.DB }, authKey, { limit: 8, windowMs: 15 * 60_000, durable: true });
  if (authSlot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!authSlot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: authSlot.retryAfter }, 429, { 'Retry-After': String(authSlot.retryAfter) });
  if (!(await secretEqual(token, String(env.STATS_TOKEN)))) return json({ ok: false, error: 'unauthorized' }, 401);
  await clearRateLimit(env, authKey);

  const key = await rateKey(request, env, 'stats-read');
  const slot = await takeRateLimit(env, key, { limit: 60, windowMs: 60_000, durable: true });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });

  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  try { return json(await fromD1(env)); } catch (error) {
    return json({ ok: false, error: 'analytics-unavailable' }, 503);
  }
}
