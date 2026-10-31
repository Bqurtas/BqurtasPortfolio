import { listLatest, listPublishedPosts } from './_cms.js';
import { COLLECTIONS, loadCatalog, mediaPath } from '../_gallery-catalog.js';

export const LATEST_WEEK = 7 * 24 * 60 * 60 * 1000;

/* A publication has one fixed expiry. Reading, reordering or rebuilding the
   site must never restart its week, and future/unknown dates are not news. */
export function freshLatestRows(rows, now = Date.now()) {
  return rows.filter(row => {
    const published = Date.parse(row?.created_at);
    return Number.isFinite(published) && published <= now && published > now - LATEST_WEEK;
  });
}

export async function latestFeed(env, origin, now = Date.now()) {
  const since = new Date(now - LATEST_WEEK).toISOString();
  const [catalog, pins, posts] = await Promise.all([
    loadCatalog(env, origin),
    listLatest(env.DB, { since }),
    listPublishedPosts(env.DB, { since }),
  ]);
  const works = [...catalog.byPath.values()].filter(work => !work.canonical).map(work => {
    const collection = COLLECTIONS[work.coll];
    return {
      coll: work.coll, index: work.index, cat: collection.cat,
      type: work.type, url: mediaPath(work.path), poster: work.poster,
      width: work.width, height: work.height, titlePrefix: collection.title,
      tag: collection.tag, created_at: work.date,
    };
  });
  return {
    version: 1,
    works: freshLatestRows(works, now).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    pins: freshLatestRows(pins, now),
    // The notification never needs the article body or owner-only metadata.
    posts: freshLatestRows(posts, now).map(post => ({
      id: post.id, title: post.title, tag: post.tag, cover: post.cover, created_at: post.created_at,
      i18n: Object.fromEntries(Object.entries(post.i18n || {}).map(([lang, value]) => [lang, { title: value?.title }])),
    })),
  };
}
