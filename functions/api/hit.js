/* First-party, cookieless visit logging to D1.
   No raw IP or user agent is stored. A keyed, stable pseudonymous identifier
   supports meaningful unique counts inside the same bounded retention window. */

import {
  clientAddress,
  isSameOrigin,
  keyedDigest,
  noContent,
  readRequestBytes,
  sessionConfigured,
  takeRateLimit
} from './_session.js';
import { ensureAnalyticsStore } from './_analytics.js';
import { COLLECTIONS, TABS } from '../_gallery-catalog.js';
import { MEDIA_ARCHIVE_ROUTES } from '../_media-archive-routes.js';

const RETENTION_MS = 400 * 86_400_000;
const encoder = new TextEncoder();
const pruneTimes = new WeakMap();

function knownRoute(path) {
  const route = path.replace(/^\/(?:ku|kmr|ar|fr|tr|sv)(?=\/|$)/, '').replace(/\/$/, '') || '/';
  if (['/', '/design', '/blog', '/bio', '/contact'].includes(route)) return true;
  if (MEDIA_ARCHIVE_ROUTES.has(route + '/')) return true;
  if (/^\/blog\/[1-9]\d{0,17}$/.test(route)) return true;
  const match = /^\/design\/([a-z]+)(?:\/([1-9]\d{0,17}))?$/.exec(route);
  return !!match && (match[2] ? Object.hasOwn(COLLECTIONS, match[1])
    : Object.hasOwn(COLLECTIONS, match[1]) || TABS.includes(match[1]));
}

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
  try {
    const bytes = await readRequestBytes(request, 1_024);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const body = JSON.parse(raw || '{}');
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch (error) {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const done = () => noContent();
  if (!env.DB || !isSameOrigin(request)) return done();

  try {
    const userAgent = String(request.headers.get('User-Agent') || '').slice(0, 512);
    const ip = clientAddress(request);
    if (!ip || !userAgent || isBot(userAgent)) return done();

    let analyticsSalt = String(env.ANALYTICS_SALT || '');
    if (encoder.encode(analyticsSalt).byteLength < 32) {
      if (!sessionConfigured(env)) return done();
      // Derive a separate purpose-bound key; never use the session signing
      // value directly as a visitor identifier or write it to the database.
      analyticsSalt = await keyedDigest(env.SESSION_SECRET, 'bqurtas:analytics-key:v1');
    }

    const body = await readBeacon(request);
    if (!body) return done();
    const path = (String(body.p || '/').split(/[?#]/)[0] || '/');
    const language = String(body.l || '').toLowerCase();
    if (path.length > 160 || !knownRoute(path) || (language && !/^(?:en|ku|kmr|ar|fr|tr|sv)$/.test(language))) return done();

    const visitor = (await keyedDigest(analyticsSalt, `visitor|${ip}|${userAgent}`)).slice(0, 32);
    const slot = await takeRateLimit(env, `hit:${visitor}`, { limit: 30, windowMs: 60_000, durable: true });
    if (!slot.ok) return done();

    const countryValue = String((request.cf && request.cf.country) || request.headers.get('CF-IPCountry') || '').toUpperCase();
    const country = /^[A-Z]{2}$/.test(countryValue) ? countryValue : '';
    const device = /Mobi|Android|iPhone|iPod/i.test(userAgent) ? 'mobile'
      : (/iPad|Tablet/i.test(userAgent) ? 'tablet' : 'desktop');
    const now = Date.now();

    await ensureAnalyticsStore(env.DB);
    if (now - (pruneTimes.get(env.DB) || 0) > 6 * 60 * 60 * 1000) {
      await env.DB.prepare('DELETE FROM hits WHERE ts < ?').bind(now - RETENTION_MS).run();
      pruneTimes.set(env.DB, now);
    }

    await env.DB.prepare(
      'INSERT INTO hits (ts, path, ref, country, device, lang, vid) VALUES (?,?,?,?,?,?,?)'
    ).bind(now, path, hostname(body.r), country, device, language, visitor).run();
  } catch (error) {
    /* Analytics must never affect navigation, and no internal error is exposed. */
  }

  return done();
}
