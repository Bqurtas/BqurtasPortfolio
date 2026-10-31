/* The tiny notification feed starts with the page, independently of the
   intent-loaded Studio/Journal bundle. No public GitHub history calls. */
(function latestFeed() {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const CACHE_KEY = 'bq_latest_feed_v1';
  const REFRESH = 5 * 60 * 1000;
  let data = { version: 1, works: [], pins: [], posts: [] };
  let loading = null, expiryTimer = 0, refreshTimer = 0;
  const valid = value => value?.version === 1
    && ['works', 'pins', 'posts'].every(key => Array.isArray(value[key]) && value[key].length <= 1000);
  const fresh = row => {
    const published = Date.parse(row?.created_at), now = Date.now();
    return Number.isFinite(published) && published <= now && published > now - WEEK;
  };
  const snapshot = () => ({
    works: data.works.filter(fresh), pins: data.pins.filter(fresh), posts: data.posts.filter(fresh),
  });
  const publish = () => {
    const current = snapshot(), rows = [...current.works, ...current.pins, ...current.posts];
    for (const id of ['railLatestBadge', 'railLatestBadgeM']) {
      const badge = document.getElementById(id);
      if (badge) badge.hidden = rows.length === 0;
    }
    clearTimeout(expiryTimer);
    if (rows.length) {
      const expires = Math.min(...rows.map(row => Date.parse(row.created_at) + WEEK));
      expiryTimer = setTimeout(publish, Math.max(1, Math.min(expires - Date.now(), 86400000)));
    }
    window.dispatchEvent(new Event('bq:latest'));
  };
  const refresh = () => {
    if (loading) return loading;
    clearTimeout(refreshTimer);
    loading = fetch('/api/latest?feed=1', {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000),
    }).then(response => {
      if (!response.ok) throw new Error('Latest unavailable');
      return response.json();
    }).then(value => {
      if (!valid(value)) throw new Error('Invalid Latest feed');
      data = value;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
      publish();
    }).catch(() => {
      // Retain only still-current notices offline; never extend their expiry.
      publish();
    }).finally(() => {
      loading = null;
      refreshTimer = setTimeout(() => { if (!document.hidden) refresh(); }, REFRESH);
    });
    return loading;
  };
  window.__bqLatestFeed = { snapshot, refresh };
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (valid(saved)) data = saved;
  } catch {}
  publish();
  refresh();
  const resume = () => { if (!document.hidden) { publish(); refresh(); } };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
}());
