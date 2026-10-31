import { listLatest } from './_cms.js';
import { json } from './_session.js';
import { freshLatestRows, latestFeed, LATEST_WEEK } from './_latest-feed.js';
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url), params = url.searchParams;
  try {
    if (params.get('feed') === '1') return json(await latestFeed(env, url.origin));
    const requested = Date.parse(params.get('since'));
    const since = new Date(Math.max(Date.now() - LATEST_WEEK, Number.isFinite(requested) ? requested : 0)).toISOString();
    return json(freshLatestRows(await listLatest(env.DB, { since, limit: params.has('limit') ? params.get('limit') : undefined })));
  }
  catch { return json({ ok: false, error: 'content-unavailable' }, 503); }
}
