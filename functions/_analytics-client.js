import { VISITOR_PRIVACY_JS } from './_visitor-privacy.js';
import { COLLECTIONS, TABS } from './_gallery-catalog.js';
import { MEDIA_ARCHIVE_ROUTES } from './_media-archive-routes.js';
/* Shared consent-gated client for the application and standalone documents.
   scripts/build-assets.mjs writes the public analytics.js from this source. */
export function createAnalyticsClient(archiveRoutes = MEDIA_ARCHIVE_ROUTES) {
  return VISITOR_PRIVACY_JS + String.raw`/* First-party, cookieless visit counting, plus optional Umami Cloud pageviews. */
(function () {
  'use strict';
  // Preview and development visits must never enter production statistics.
  if (location.protocol !== 'https:' || location.hostname !== 'bqurtas.com') return;
  if (window.__bqFirstPartyAnalytics) return;
  window.__bqFirstPartyAnalytics = true;
  const collections = ${JSON.stringify(Object.keys(COLLECTIONS))};
  const tabs = ${JSON.stringify(TABS)};
  const archives = ${JSON.stringify([...archiveRoutes].sort())};
  const pending = new Set();
  let lastPath = '', first = true, timer;
  const permitted = () => window.__bqPrivacy?.choice() === 'allowed' &&
    ![navigator.doNotTrack,window.doNotTrack,navigator.msDoNotTrack].some(value => /^(1|yes)$/i.test(value || '')) && navigator.globalPrivacyControl !== true;
  function publicPath() {
    // Studio can open without changing the URL. Never inspect or transmit its
    // title, inputs, URL parameters, hashes, user identifiers or credentials.
    if (/^#studio/i.test(location.hash || '') || document.querySelector?.('#dash.is-open')) return '';
    const path = location.pathname;
    if (typeof path !== 'string' || path.length > 160) return '';
    const route = path.replace(/^\/(?:ku|kmr|ar|fr|tr|sv)(?=\/|$)/, '').replace(/\/$/, '') || '/';
    if (['/', '/design', '/blog', '/bio', '/contact'].includes(route) || archives.includes(route + '/') || /^\/blog\/[1-9]\d{0,17}$/.test(route)) return path;
    const match = /^\/design\/([a-z]+)(?:\/([1-9]\d{0,17}))?$/.exec(route);
    return match && (collections.includes(match[1]) || (!match[2] && tabs.includes(match[1]))) ? path : '';
  }
  function referrerOrigin() {
    try {
      const ref = new URL(document.referrer);
      return /^https?:$/.test(ref.protocol) ? ref.origin : '';
    } catch (e) { return ''; }
  }
  function stop() {
    clearTimeout(timer);
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  function umamiPageview(path, language) {
    if (!permitted() || typeof AbortController !== 'function') return;
    const controller = new AbortController();
    pending.add(controller);
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Official Cloud collection API; no third-party script, autotracking,
    // cookies, distinct IDs, document titles, referrers or custom event data.
    // The browser supplies its normal network address/User-Agent to Umami.
    const data = JSON.stringify({ type:'event', payload:{
      website:'f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa', hostname:'bqurtas.com', url:path, language
    } });
    const done = () => { clearTimeout(timeout); pending.delete(controller); };
    try {
      fetch('https://gateway.umami.is/api/send', {
        method:'POST', body:data, headers:{'Content-Type':'application/json'},
        mode:'cors', credentials:'omit', referrerPolicy:'no-referrer',
        redirect:'error', cache:'no-store', signal:controller.signal
      }).then(done, done);
    } catch (e) { done(); }
  }
  function hit() {
    if (!permitted()) { stop(); return; }
    const path = publicPath();
    if (!path || path === lastPath || document.visibilityState === 'hidden') return;
    lastPath = path;
    const candidate = document.documentElement.dataset?.lang || (document.documentElement.lang === 'ckb' ? 'ku' : document.documentElement.lang);
    const language = ['en','ku','kmr','ar','fr','tr','sv'].includes(candidate) ? candidate : 'en';
    const data = JSON.stringify({ p:path, r:first ? referrerOrigin() : '', l:language });
    first = false;
    try {
      if (!navigator.sendBeacon || !navigator.sendBeacon('/api/hit', data)) {
        fetch('/api/hit', { method:'POST', body:data, keepalive:true, credentials:'same-origin' }).catch(() => {});
      }
    } catch (e) {}
    umamiPageview(path, language);
  }
  function schedule() {
    clearTimeout(timer);
    if (!permitted()) { stop(); lastPath = ''; return; }
    timer = setTimeout(hit, 80);
  }
  // Journal readers update History directly instead of changing the room.
  // Preserve native return values/errors; path deduplication avoids counting
  // the router's accompanying bq:route event a second time.
  if (typeof history !== 'undefined') {
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name];
      if (typeof original !== 'function') continue;
      history[name] = function () { const result = original.apply(this, arguments); schedule(); return result; };
    }
  }
  document.addEventListener('bq:privacy', schedule);
  document.addEventListener('bq:route', schedule);
  document.addEventListener('bq:language', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();
})();
`;
}
export const ANALYTICS_CLIENT_JS = createAnalyticsClient();
