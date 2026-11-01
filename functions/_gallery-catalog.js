/* =========================================================
   Barakat Qurtas — server-side gallery catalogue
   Shared by the work pages (/design/<coll>/<n>), the same-origin media
   endpoint (/media/<Folder>/<file>) and the build-time image sitemap.

   The collection keys, folders, titles and data-cat values mirror
   COLLECTIONS in preview_site/js/gallery.js. tests/work-pages.test.mjs loads
   gallery.js and fails if the two ever drift, so a work page always carries
   the same name ("Book Cover 07") as the card a visitor clicked.

   The leading underscore keeps this a helper module: it exports no
   onRequest handler, so Pages never routes a URL to it.
   ========================================================= */

export const SITE = 'https://bqurtas.com';
export const PERSON_ID = SITE + '/#person';
export const AUTHOR = 'Barakat Qurtas';
export const PLACE = 'Erbil (Hewlêr), Kurdistan';

/* Real Design tabs (index.html data-filter values, minus "all"). */
export const TABS = ['logo', 'official', 'book', 'posters', 'social', 'events', 'stationery', 'image', 'video', 'other', 'certificate'];
export const TAB_LABEL = {
  logo: 'Logos', official: 'Official', book: 'Book Covers', posters: 'Posters', social: 'Social Media',
  events: 'Events', stationery: 'Stationery', image: 'Photography', video: 'Video', other: 'Other Works',
  certificate: 'Certificates'
};

/* folder / title / cat / tag: identical to gallery.js.
   tab:  the Design tab whose filter shows this collection ('' = only "All").
   noun: what one item is, for alt text and the page sentence.
   rel:  'by' for his own work, 'archive' for credentials he holds.
   ku / ar: the localized card title (window.GAL_I18N in i18n.js). */
export const COLLECTIONS = {
  general:     { folder: 'GeneralDesign', title: 'Design',        cat: 'general',     tag: 'Design',        tab: '',            noun: 'graphic design',             rel: 'by',      ku: 'دیزاین',          ar: 'تصميم' },
  book:        { folder: 'Book',          title: 'Book Cover',    cat: 'book',        tag: 'Book',          tab: 'book',        noun: 'book cover design',          rel: 'by',      ku: 'بەرگی کتێب',      ar: 'غلاف كتاب' },
  official:    { folder: 'Official',      title: 'Official',      cat: 'official',    tag: 'Official',      tab: 'official',    noun: 'official editorial design',  rel: 'by',      ku: 'فەرمی',           ar: 'رسمي' },
  posters:     { folder: 'Poster',        title: 'Poster',        cat: 'posters',     tag: 'Poster',        tab: 'posters',     noun: 'poster design',              rel: 'by',      ku: 'پۆستەر',          ar: 'ملصق' },
  social:      { folder: 'SocialMedia',   title: 'Social Media',  cat: 'social',      tag: 'Social',        tab: 'social',      noun: 'social media design',        rel: 'by',      ku: 'سۆشیال میدیا',    ar: 'وسائل التواصل' },
  logo:        { folder: 'LogoDesign',    title: 'Logo',          cat: 'logo',        tag: 'Logo',          tab: 'logo',        noun: 'logo design',                rel: 'by',      ku: 'لۆگۆ',            ar: 'شعار' },
  tickerlogo:  { folder: 'TickerLogo',    title: 'Ticker Logo',   cat: 'tickerlogo',  tag: 'Logo',          tab: 'logo',        noun: 'logo design',                rel: 'by',      ku: 'لۆگۆی تیکەر',     ar: 'شعار تيكر' },
  events:      { folder: 'EventandCon',   title: 'Event',         cat: 'events',      tag: 'Events',        tab: 'events',      noun: 'event design',               rel: 'by',      ku: 'بۆنە',            ar: 'فعالية' },
  business:    { folder: 'Businesscard',  title: 'Business Card', cat: 'stationery',  tag: 'Business Card', tab: 'stationery',  noun: 'business card design',       rel: 'by',      ku: 'کارتی بازرگانی',  ar: 'بطاقة عمل' },
  invoices:    { folder: 'Invoice',       title: 'Invoice',       cat: 'stationery',  tag: 'Invoice',       tab: 'stationery',  noun: 'invoice and stationery design', rel: 'by',   ku: 'پسووڵە',          ar: 'فاتورة' },
  image:       { folder: 'Photos',        title: 'Photo',         cat: 'image',       tag: 'Photo',         tab: 'image',       noun: 'photography',                rel: 'by',      ku: 'وێنە',            ar: 'صورة' },
  other:       { folder: 'Other',         title: 'Other',         cat: 'other',       tag: 'Other',         tab: 'other',       noun: 'graphic design',             rel: 'by',      ku: 'هیتر',            ar: 'أخرى' },
  certificate: { folder: 'Certificate',   title: 'Certificate',   cat: 'certificate', tag: 'Certificate',   tab: 'certificate', noun: 'professional certificate',   rel: 'archive', ku: 'بڕوانامە',        ar: 'شهادة' },
  flex:        { folder: 'Flex',          title: 'Flex',          cat: 'other',       tag: 'Other',         tab: 'other',       noun: 'flex banner design',         rel: 'by',      ku: 'فلێکس',           ar: 'فليكس' },
  video:       { folder: 'Videos',        title: 'Video',         cat: 'video',       tag: 'Video',         tab: 'video',       noun: 'motion and video work',      rel: 'by',      ku: 'ڤیدیۆ',           ar: 'فيديو' },
};

/* Sitemap / crawl order: the gallery's own ORDER, then the homepage-only
   ticker logos. */
export const ORDER = ['general', 'official', 'book', 'image', 'logo', 'posters', 'social', 'events',
  'business', 'invoices', 'flex', 'video', 'other', 'certificate', 'tickerlogo'];

/* Which copy of a duplicated image owns the page: every specific collection
   before the catch-all "general". */
export const CANONICAL_ORDER = [...ORDER.filter((key) => key !== 'general'), 'general'];

/* Repository images that are not gallery items but were published in the
   old image sitemap. They are the only non-manifest files /media serves;
   none is listed in the new sitemap, because no page renders them from a
   bqurtas.com URL (the client strip still loads its logos from jsDelivr). */
export const EXTRA_MEDIA = [
  ...Array.from({ length: 16 }, (_, i) => ({ path: `WorkWith/WorkLogo${i + 1}.webp`, page: '/' })),
  ...['AboutCover.webp', 'BlogCover.webp', 'Bqurtas1.webp', 'Bqurtas2.webp', 'ContactCover.webp',
    'CoverWeb.webp', 'NEW.webp', 'WebcoverKU.webp', 'websiteLogo&tab.webp']
    .map((file) => ({ path: `WebsitePortfolio/${file}`, page: '/bio' })),
  { path: 'Blog/blog1.webp', page: '/blog' },
];

export const MEDIA_TYPES = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', avif: 'image/avif',
  gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime'
};

const FILE_RE = /^[^\\/]+\.(webp|png|jpe?g|avif|gif|mp4|webm|mov)$/i;
const FOLDER_TO_KEY = Object.fromEntries(Object.entries(COLLECTIONS).map(([key, c]) => [c.folder, key]));

export const pad2 = (n) => String(n).padStart(2, '0');
export const displayTitle = (coll, index) => `${COLLECTIONS[coll].title} ${pad2(index)}`;
export const extensionOf = (path) => (String(path).match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
export const mediaType = (path) => MEDIA_TYPES[extensionOf(path)] || '';
export const isVideoPath = (path) => /^video\//.test(mediaType(path));
export const workPath = (coll, index) => `/design/${coll}/${index}`;
export const workUrl = (coll, index) => SITE + workPath(coll, index);
export const collectionPath = (coll) => (COLLECTIONS[coll].tab ? '/design/' + COLLECTIONS[coll].tab : '/design');
export const collectionLabel = (coll) => (COLLECTIONS[coll].tab ? TAB_LABEL[COLLECTIONS[coll].tab] : 'All Work');

/* /media/<Folder>/<file> — the file name is the only segment that may need
   escaping (websiteLogo&tab.webp). */
export function mediaPath(path) {
  const slash = path.indexOf('/');
  return '/media/' + path.slice(0, slash) + '/' + encodeURIComponent(path.slice(slash + 1));
}
export const mediaUrl = (path) => SITE + mediaPath(path);

/* Map manifest records to collections exactly as gallery.js loadManifest()
   does: images then videos, first occurrence wins, invalid geometry, nested
   paths and unknown folders are skipped. Explicit indices preserve URLs when
   a work is removed; older manifests retain their original folder positions. */
export function catalogFromManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.images) || !Array.isArray(manifest.videos)) {
    throw new Error('invalid gallery manifest');
  }
  const byColl = Object.fromEntries(Object.keys(COLLECTIONS).map((key) => [key, []]));
  const indices = Object.fromEntries(Object.keys(COLLECTIONS).map((key) => [key, new Set()]));
  const byPath = new Map();
  for (const record of [...manifest.images, ...manifest.videos]) {
    if (!record || typeof record.path !== 'string' || byPath.has(record.path)
      || !Number.isFinite(record.width) || record.width <= 0
      || !Number.isFinite(record.height) || record.height <= 0) continue;
    const slash = record.path.indexOf('/');
    if (slash < 0 || record.path.indexOf('/', slash + 1) >= 0) continue;
    const folder = record.path.slice(0, slash);
    const file = record.path.slice(slash + 1);
    const coll = FOLDER_TO_KEY[folder];
    if (!coll || !FILE_RE.test(file)) continue;
    const list = byColl[coll];
    const index = record.index === undefined ? list.length + 1 : record.index;
    if (!Number.isSafeInteger(index) || index < 1 || indices[coll].has(index)) continue;
    indices[coll].add(index);
    const item = {
      coll, index, path: record.path, folder, file,
      width: record.width, height: record.height,
      hash: typeof record.hash === 'string' && /^[0-9a-f]{16}$/.test(record.hash) ? record.hash : '',
      canonical: null,
      type: isVideoPath(record.path) ? 'video' : 'image',
      date: typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:]+(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(record.date) ? record.date : '',
      duration: Number.isFinite(record.duration) && record.duration > 0 ? record.duration : 0,
      poster: typeof record.poster === 'string' && /^\/assets\/thumbs\/[A-Za-z0-9]+\/[A-Za-z0-9_.-]+\.jpg$/.test(record.poster) ? record.poster : ''
    };
    list.push(item);
    byPath.set(record.path, item);
  }
  /* Byte-identical copies filed under two collections share one canonical
     work: the specific collection wins over the catch-all "Design", and
     within a collection the first copy wins. The other copy's page 301s to
     it and the sitemap lists the image once. */
  const seen = new Map();
  for (const coll of CANONICAL_ORDER) {
    for (const item of byColl[coll]) {
      if (!item.hash) continue;
      const first = seen.get(item.hash);
      if (first) item.canonical = first;
      else seen.set(item.hash, item);
    }
  }
  const extra = new Map(EXTRA_MEDIA.map((entry) => [entry.path, entry]));
  return { byColl, byPath, extra };
}

/* One manifest read per isolate (per ASSETS binding, so tests can swap it).
   A failed read is not remembered: the next request tries again. */
const memo = new WeakMap();
export function loadCatalog(env, origin) {
  const assets = env && env.ASSETS;
  if (!assets || typeof assets.fetch !== 'function') return Promise.reject(new Error('ASSETS binding missing'));
  if (memo.has(assets)) return memo.get(assets);
  const pending = (async () => {
    const response = await assets.fetch(new URL('/assets/gallery-manifest.json', origin || SITE));
    if (!response || !response.ok) throw new Error('gallery manifest unavailable');
    return catalogFromManifest(await response.json());
  })();
  memo.set(assets, pending);
  pending.catch(() => { if (memo.get(assets) === pending) memo.delete(assets); });
  return pending;
}

/* ISO 8601 duration for schema.org (PT1M5S). */
export function isoDuration(seconds) {
  const total = Math.max(1, Math.round(seconds));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return 'PT' + (h ? h + 'H' : '') + (m ? m + 'M' : '') + (s || (!h && !m) ? s + 'S' : '');
}

/* Human copy shared by the page, its JSON-LD and the sitemap. */
export function describe(item) {
  const c = COLLECTIONS[item.coll];
  const title = displayTitle(item.coll, item.index);
  const relation = c.rel === 'archive' ? 'from the archive of' : 'by';
  const article = /^[aeiou]/i.test(c.noun) ? 'an' : 'a';
  const phrase = c.noun === 'photography' ? 'a photograph' : `${article} ${c.noun}`;
  return {
    title,
    alt: `${title} — ${c.noun} ${relation} ${AUTHOR}, Kurdish graphic designer in ${PLACE}`,
    sentence: `${title} is ${phrase} ${relation} ${AUTHOR}, a Kurdish graphic designer based in ${PLACE} Region of Iraq.`,
    description: `${title}: ${c.noun} ${relation} ${AUTHOR}, Kurdish graphic designer in ${PLACE}. ${c.tab ? `See the full ${collectionLabel(item.coll)} collection` : 'See all of his work'} or start a project.`
  };
}
