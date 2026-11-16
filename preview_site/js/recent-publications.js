/* One publication can contain a whole series. Keep every member, give each
   format an entry of its own, and link back to the existing work/project.
   This module has no DOM or network side effects and shares the portfolio's
   canonical ownership rules. Dates describe publication, never creation. */

export const RECENT_COLLECTIONS = Object.freeze({
  general: { folder: 'GeneralDesign', title: 'Design', plural: 'Designs', cat: 'general' },
  book: { folder: 'Book', title: 'Book Cover', plural: 'Book covers', cat: 'book' },
  official: { folder: 'Official', title: 'Official', plural: 'Official work', cat: 'official' },
  posters: { folder: 'Poster', title: 'Poster', plural: 'Posters', cat: 'posters' },
  social: { folder: 'SocialMedia', title: 'Social Media', plural: 'Social media', cat: 'social' },
  logo: { folder: 'LogoDesign', title: 'Logo', plural: 'Logos', cat: 'logo' },
  tickerlogo: { folder: 'TickerLogo', title: 'Ticker Logo', plural: 'Ticker logos', cat: 'tickerlogo' },
  events: { folder: 'EventandCon', title: 'Event', plural: 'Events', cat: 'events' },
  business: { folder: 'Businesscard', title: 'Business Card', plural: 'Business cards', cat: 'stationery' },
  invoices: { folder: 'Invoice', title: 'Invoice', plural: 'Stationery', cat: 'stationery' },
  image: { folder: 'Photos', title: 'Photo', plural: 'Photography', cat: 'image' },
  other: { folder: 'Other', title: 'Other', plural: 'Other work', cat: 'other' },
  certificate: { folder: 'Certificate', title: 'Certificate', plural: 'Certificates', cat: 'certificate' },
  flex: { folder: 'Flex', title: 'Flex', plural: 'Banners', cat: 'other' },
  video: { folder: 'Videos', title: 'Video', plural: 'Films', cat: 'video' },
});

// Identical to functions/_gallery-catalog.js: a specific collection owns an
// image before General Design does. Ownership is resolved before date filters.
const CANONICAL_ORDER = ['official', 'book', 'image', 'logo', 'posters', 'social', 'events',
  'business', 'invoices', 'flex', 'video', 'other', 'certificate', 'tickerlogo', 'general'];
const FOLDERS = new Map(Object.entries(RECENT_COLLECTIONS).map(([coll, value]) => [value.folder, coll]));
const FILE = /^[^\\/]+\.(webp|png|jpe?g|avif|gif|mp4|webm|mov)$/i;
const HASH = /^[0-9a-f]{16}$/;
const PROJECT_ID = /^[1-9]\d{5,11}$/;
const clean = value => typeof value === 'string' || typeof value === 'number'
  ? String(value).replace(/\s+/g, ' ').trim() : '';

function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function publicationTime(value, dateOnly = false) {
  if (typeof value !== 'string' || !validDay(value.slice(0, 10))) return NaN;
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(value + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}

const newestFirst = (a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id, 'en');
const newestMemberFirst = (a, b) => b.timestamp - a.timestamp || a.index - b.index || a.id.localeCompare(b.id, 'en');

function publicationDay(formatter, timestamp) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function galleryMembers(manifest) {
  const byColl = new Map(Object.keys(RECENT_COLLECTIONS).map(key => [key, []]));
  const seenPaths = new Set(), indices = new Map();
  const records = [...(Array.isArray(manifest?.images) ? manifest.images : []),
    ...(Array.isArray(manifest?.videos) ? manifest.videos : [])];
  for (const record of records) {
    if (!record || typeof record.path !== 'string' || seenPaths.has(record.path)
        || !Number.isFinite(record.width) || record.width <= 0
        || !Number.isFinite(record.height) || record.height <= 0) continue;
    const parts = record.path.split('/');
    if (parts.length !== 2 || !FILE.test(parts[1])) continue;
    const coll = FOLDERS.get(parts[0]);
    if (!coll) continue;
    const list = byColl.get(coll), collection = RECENT_COLLECTIONS[coll];
    const index = record.index === undefined ? list.length + 1 : record.index;
    if (!indices.has(coll)) indices.set(coll, new Set());
    if (!Number.isSafeInteger(index) || index < 1 || indices.get(coll).has(index)) continue;
    seenPaths.add(record.path);
    indices.get(coll).add(index);
    const type = /\.(mp4|webm|mov)$/i.test(parts[1]) ? 'video' : 'image';
    const url = `/media/${parts[0]}/${encodeURIComponent(parts[1])}`;
    const expectedPoster = '/assets/thumbs/' + record.path.replace(/\.(mp4|webm|mov)$/i, '.jpg');
    const poster = type === 'video' && record.poster === expectedPoster ? record.poster : '';
    const timestamp = publicationTime(record.date);
    list.push({
      id: `work:${coll}:${index}`, coll, cat: collection.cat, index, type,
      href: `/design/${coll}/${index}`, src: type === 'video' ? poster : `/assets/thumbs/${parts[0]}/${encodeURIComponent(parts[1])}`,
      url, poster, width: record.width, height: record.height,
      title: `${collection.title} ${String(index).padStart(2, '0')}`,
      date: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '', timestamp,
      duration: Number.isFinite(record.duration) && record.duration > 0 ? record.duration : 0,
      hash: typeof record.hash === 'string' && HASH.test(record.hash) ? record.hash : '',
    });
  }
  const hashes = new Set(), members = [];
  for (const coll of CANONICAL_ORDER) {
    for (const member of byColl.get(coll)) {
      if (member.hash && hashes.has(member.hash)) continue;
      if (member.hash) hashes.add(member.hash);
      members.push(member);
    }
  }
  return members;
}

function behanceImage(value, id) {
  if (typeof value !== 'string') return '';
  const local = new RegExp(`^/assets/behance/${id}/[A-Za-z0-9_-]+\\.(webp|jpe?g|png|avif|gif)(?:\\?v=[0-9a-f]{12})?$`, 'i');
  if (local.test(value)) return value;
  // The existing Behance room shows a first-party cover for new RSS projects
  // until their full pages have been copied into the local catalogue.
  try {
    const url = new URL(value, 'https://bqurtas.com');
    if (value.startsWith('/api/behance-cover?') && url.pathname === '/api/behance-cover'
        && url.searchParams.get('id') === id
        && /^(404|808)$/.test(url.searchParams.get('s') || '')
        && /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp)$/i.test(url.searchParams.get('f') || '')) return value;
  } catch {}
  return '';
}

function projectHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /^(www\.)?behance\.net$/i.test(url.hostname) ? url.href : '';
  } catch { return ''; }
}

function caseStudy(raw, now, formatter) {
  const id = clean(raw?.id), timestamp = publicationTime(raw?.date, true);
  if (!PROJECT_ID.test(id) || !Number.isFinite(timestamp) || timestamp > now) return null;
  const slug = clean(raw.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const title = clean(raw.title) || 'Behance';
  const date = new Date(timestamp).toISOString();
  const images = [], seen = new Set();
  for (const image of Array.isArray(raw.images) ? raw.images : []) {
    const src = behanceImage(image?.src, id);
    if (!src || seen.has(src) || !Number.isFinite(image.w) || image.w <= 0
        || !Number.isFinite(image.h) || image.h <= 0) continue;
    seen.add(src);
    images.push({ src, width: image.w, height: image.h });
  }
  const cover = behanceImage(raw.cover?.src, id);
  const pageCount = images.length;
  const external = Boolean(raw.live) || !pageCount;
  const href = external ? projectHref(raw.url) : `/behance/${id}${slug ? '-' + slug : ''}`;
  if (!href || (!cover && !pageCount)) return null;
  if (!pageCount) images.push({ src: cover, width: raw.cover?.w || 808, height: raw.cover?.h || 632 });
  const members = images.map((image, index) => ({
    id: `behance:${id}:${index + 1}`, type: 'image', href, src: image.src, url: image.src,
    poster: '', width: image.width, height: image.height, title, coll: 'behance', cat: 'case-study',
    index: index + 1, date, timestamp,
  }));
  return {
    id: `behance:${id}`, source: 'behance', kind: 'case-study', coll: 'behance', cat: 'case-study',
    projectId: id, slug, title, description: (Array.isArray(raw.about) ? raw.about : []).map(clean).filter(Boolean).join(' '),
    tags: [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map(clean).filter(Boolean))],
    date, timestamp, day: publicationDay(formatter, timestamp), href, external,
    cover: cover || members[0].src,
    width: cover ? raw.cover.w || 808 : members[0].width,
    height: cover ? raw.cover.h || 632 : members[0].height,
    count: members.length, pageCount, members, preview: members[0],
  };
}

/**
 * Build the complete, newest-first publication index. Gallery uploads in the
 * same local publication day + collection form a series; a Behance project
 * remains a case study with all of its pages. No result/member limit applies.
 * `behance.projects` can combine the local copy and fresh RSS items (`live:true`);
 * put local projects first so their full pages take precedence for the same id.
 * The catalogue's global `synced` date never changes a project's chronology.
 */
export function buildRecentPublications(manifest, behance, { now = Date.now(), timeZone = 'Asia/Baghdad' } = {}) {
  const currentTime = Number(now);
  if (!Number.isFinite(currentTime)) throw new TypeError('Invalid publication clock');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const series = new Map();
  for (const member of galleryMembers(manifest)) {
    if (!Number.isFinite(member.timestamp) || member.timestamp > currentTime) continue;
    const day = publicationDay(formatter, member.timestamp);
    const id = `gallery:${day}:${member.coll}:${member.type}`;
    if (!series.has(id)) series.set(id, []);
    series.get(id).push(member);
  }
  const editions = [...series].map(([id, members]) => {
    members.sort(newestMemberFirst);
    const lead = members[0], collection = RECENT_COLLECTIONS[lead.coll];
    return {
      id, source: 'gallery', kind: lead.type, coll: lead.coll, cat: lead.cat,
      title: members.length === 1 ? lead.title : collection.plural,
      date: lead.date, timestamp: lead.timestamp, day: publicationDay(formatter, lead.timestamp),
      href: lead.href, external: false, cover: lead.src, width: lead.width, height: lead.height,
      count: members.length, members, preview: lead,
    };
  });
  const ids = new Set();
  for (const raw of Array.isArray(behance?.projects) ? behance.projects : []) {
    const project = caseStudy(raw, currentTime, formatter);
    if (!project || ids.has(project.projectId)) continue;
    ids.add(project.projectId);
    editions.push(project);
  }
  return editions.sort(newestFirst);
}

/** Select a view without removing any members from an edition. Balanced views
 * reserve one slot for the newest entry of each format, then fill by recency;
 * the returned entries always remain in their actual chronological order. */
export function selectRecentPublications(editions, { filter = 'all', limit = Infinity, balanced = true } = {}) {
  const sorted = (Array.isArray(editions) ? editions : []).filter(edition =>
    edition && Number.isFinite(edition.timestamp)
      && (filter === 'all' || edition.kind === filter || edition.cat === filter || edition.coll === filter)
  ).slice().sort(newestFirst);
  const maximum = limit === Infinity ? sorted.length : Math.max(0, Math.floor(Number(limit) || 0));
  if (sorted.length <= maximum) return sorted;
  if (!balanced || filter !== 'all') return sorted.slice(0, maximum);
  const representatives = new Map();
  for (const edition of sorted) {
    if (!representatives.has(edition.kind)) representatives.set(edition.kind, edition);
  }
  const chosen = new Set([...representatives.values()].sort(newestFirst).slice(0, maximum));
  for (const edition of sorted) {
    if (chosen.size >= maximum) break;
    chosen.add(edition);
  }
  return sorted.filter(edition => chosen.has(edition));
}
