/* First-party, cookieless visit counting. Content and visitor data stay in D1. */
(function () {
  'use strict';
  if (!/^https?:$/.test(location.protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ||
      navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  if (window.__bqFirstPartyAnalytics) return;
  window.__bqFirstPartyAnalytics = true;
  let lastPath = '', first = true, timer;
  function hit() {
    const path = location.pathname;
    if (path === lastPath || document.visibilityState === 'hidden') return;
    lastPath = path;
    const language = document.documentElement.dataset?.lang || (document.documentElement.lang === 'ckb' ? 'ku' : document.documentElement.lang) || 'en';
    const data = JSON.stringify({ p:path, r:first ? document.referrer : '', l:language });
    first = false;
    try {
      if (!navigator.sendBeacon || !navigator.sendBeacon('/api/hit', data)) {
        fetch('/api/hit', { method:'POST', body:data, keepalive:true, credentials:'same-origin' }).catch(() => {});
      }
    } catch (e) {}
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(hit, 80); }
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
  document.addEventListener('bq:route', schedule);
  document.addEventListener('bq:language', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('popstate', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();
})();
