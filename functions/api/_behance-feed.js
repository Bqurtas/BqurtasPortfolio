/* =========================================================
   Barakat Qurtas — new projects from Behance

   The Behance room is a copy (assets/behance/projects.json). A project the
   owner publishes on Behance after that copy must still appear in the room at
   once. Behance offers two public, machine-readable doors for that, and only
   those are used here:
     - the profile's RSS feed (which projects exist, their link, date, cover);
     - its oEmbed endpoint (the project's title, correctly encoded: the feed
       turns characters outside Latin-1 into "?").
   Project pages themselves are not read: Behance does not open them to
   automated readers. A new project therefore arrives with its cover and title
   and opens on Behance until the next copy brings its pages here.
   ========================================================= */

export const BEHANCE_FEED_URL = 'https://www.behance.net/feeds/user?username=bqurtas';
export const BEHANCE_OEMBED = 'https://www.behance.net/services/oembed?url=';
const AGENT = 'bqurtas.com (+https://bqurtas.com)';
const TIMEOUT_MS = 8000;
const MAX_NEW = 8;

const GALLERY = /^https?:\/\/(?:www\.)?behance\.net\/gallery\/([1-9]\d{5,11})\/([A-Za-z0-9-]+)\/?$/;
/* Behance names a cover after its project: six hex digits, the project id,
   then a key. Only such files of the owner's own projects are ever served. */
export const COVER_FILE = /^([0-9a-f]{6})([1-9]\d{5,11})\.([A-Za-z0-9_=-]{4,96})\.(png|jpe?g|gif|webp)$/;
const COVER_IN_FEED = /https:\/\/mir-s3-cdn-cf\.behance\.net\/projects\/[a-z0-9_]+\/([0-9a-f]{6}[1-9]\d{5,11}\.[A-Za-z0-9_=-]{4,96}\.(?:png|jpe?g|gif|webp))/;

const unwrap = (value) => String(value || '')
  .replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .trim();
const tag = (xml, name) => {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return match ? unwrap(match[1]) : '';
};

/* The feed's items in order: id, slug, Behance link, ISO date, cover file. */
export function parseBehanceFeed(xml) {
  const items = [];
  for (const block of String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || []) {
    const link = tag(block, 'link');
    const match = GALLERY.exec(link);
    if (!match) continue;
    const [, id, slug] = match;
    const published = Date.parse(tag(block, 'pubDate'));
    const cover = COVER_IN_FEED.exec(block);
    if (!cover || COVER_FILE.exec(cover[1])?.[2] !== id) continue;
    items.push({
      id,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
      url: `https://www.behance.net/gallery/${id}/${slug}`,
      date: Number.isFinite(published) ? new Date(published).toISOString().slice(0, 10) : '',
      title: tag(block, 'title'),
      cover: cover[1],
    });
  }
  return items;
}

async function fetchWithin(url, ttl, kind) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': AGENT, Accept: kind },
      signal: controller.signal,
      cf: { cacheTtl: ttl, cacheEverything: true },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/* oEmbed answers "<project> - Barakat Qurtas"; the room shows the project. */
export function oembedTitle(data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const author = typeof data?.author_name === 'string' ? data.author_name.trim() : '';
  return author && title.endsWith(` - ${author}`) ? title.slice(0, -(author.length + 3)).trim() : title;
}

export async function readBehanceFeed() {
  const response = await fetchWithin(BEHANCE_FEED_URL, 900, 'application/rss+xml, application/xml');
  if (!response.ok) throw new Error(`feed ${response.status}`);
  return parseBehanceFeed(await response.text());
}

/* Projects in the feed that the copy does not hold yet, newest first. */
export async function freshBehanceProjects(knownIds) {
  const items = (await readBehanceFeed()).filter((item) => !knownIds.has(item.id)).slice(0, MAX_NEW);
  return Promise.all(items.map(async (item) => {
    let title = item.title;
    try {
      const response = await fetchWithin(BEHANCE_OEMBED + encodeURIComponent(item.url), 86400, 'application/json');
      if (response.ok) title = oembedTitle(await response.json()) || title;
    } catch (e) {}
    const cover = (size) => `/api/behance-cover?id=${item.id}&f=${encodeURIComponent(item.cover)}&s=${size}`;
    return {
      id: item.id, slug: item.slug, title: title || 'Behance', url: item.url, date: item.date,
      cover: { src: cover(808), small: cover(404), w: 808, h: 632 },
    };
  }));
}
