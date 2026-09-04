/* First-party, cookieless visit logging to D1.
   No raw IP or user agent is stored. A keyed, stable pseudonymous identifier
   supports meaningful unique counts inside the same bounded retention window. */

import {
  clientAddress,
  isSameOrigin,
  keyedDigest,
  noContent,
  takeRateLimit
} from './_session.js';

const RETENTION_MS = 400 * 86_400_000;
const ROUTE_OK = /^\/(?:(?:ku|kmr|ar|fr|tr|sv)(?:\/|$))?(?:|design(?:\/[a-z0-9-]{1,48})?|blog(?:\/[1-9]\d{0,17})?|bio|contact)\/?$/i;
const encoder = new TextEncoder();
let lastPrune = 0;

function hostname(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.hostname.replace(/^www\./, '').toLowerCase().slice(0, 100);
  } catch (error) {
    return '';
  }
}

function isBot(userAgent) {
  return /bot|crawl|spider|slurp|bing|yandex|preview|monitor|lighthouse|headless|curl|wget|python|axios|facebookexternal|whatsapp|telegram/i.test(userAgent);
}

async function readBeacon(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > 1_024) return null;
  const raw = await request.text();
  if (raw.length > 1_024) return null;
  try {
    const body = JSON.parse(raw || '{}');
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch (error) {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const done = () => noContent();
  const analyticsSalt = String(env.ANALYTICS_SALT || '');
  if (!env.DB || encoder.encode(analyticsSalt).byteLength < 32 || !isSameOrigin(request)) return done();

  try {
    const userAgent = String(request.headers.get('User-Agent') || '').slice(0, 512);
    const ip = clientAddress(request);
    if (!ip || !userAgent || isBot(userAgent)) return done();

    const body = await readBeacon(request);
    if (!body) return done();
    const path = (String(body.p || '/').split('?')[0] || '/').slice(0, 160);
    const language = String(body.l || '').toLowerCase();
    if (!ROUTE_OK.test(path) || (language && !/^(?:en|ku|kmr|ar|fr|tr|sv)$/.test(language))) return done();

    const visitor = (await keyedDigest(analyticsSalt, `visitor|${ip}|${userAgent}`)).slice(0, 32);
    const slot = await takeRateLimit(env, `hit:${visitor}`, { limit: 30, windowMs: 60_000, durable: true });
    if (!slot.ok) return done();

    const countryValue = String((request.cf && request.cf.country) || request.headers.get('CF-IPCountry') || '').toUpperCase();
    const country = /^[A-Z]{2}$/.test(countryValue) ? countryValue : '';
    const device = /Mobi|Android|iPhone|iPod/i.test(userAgent) ? 'mobile'
      : (/iPad|Tablet/i.test(userAgent) ? 'tablet' : 'desktop');
    const now = Date.now();

    if (now - lastPrune > 6 * 60 * 60 * 1000) {
      await env.DB.prepare('DELETE FROM hits WHERE ts < ?').bind(now - RETENTION_MS).run();
      lastPrune = now;
    }

    await env.DB.prepare(
      'INSERT INTO hits (ts, path, ref, country, device, lang, vid) VALUES (?,?,?,?,?,?,?)'
    ).bind(now, path, hostname(body.r), country, device, language, visitor).run();
  } catch (error) {
    /* Analytics must never affect navigation, and no internal error is exposed. */
  }

  return done();
}
