/* =========================================================
   Barakat Qurtas — Cloudflare Pages Function
   Per-route Open Graph / Twitter covers for shareable deep-links.

   Static files (/, /assets/*, /css/*, /js/*) are served directly by
   Pages. This catch-all only runs for SPA routes that have no file —
   /design, /design/<tab>, /blog, /bio, /contact — where it serves the
   app shell (index.html) with the <title> + OG/Twitter meta rewritten
   so every room and every Design tab shares with its own cover.
   ========================================================= */

const SITE = 'https://www.bqurtas.com';

const ROOMS = {
  design:  { t: 'Selected Work — Barakat Qurtas', d: '1000+ works across brand identity, editorial, books, logos, posters & video — from Hewlêr, Kurdistan.', img: '/assets/cover.webp' },
  blog:    { t: 'The Journal — Barakat Qurtas',    d: 'Short notes on typography, place, and the slow craft of design.',                                   img: '/assets/covers/blog.jpg' },
  bio:     { t: 'Biography — Barakat Qurtas',      d: 'A decade of practice in Hewlêr — the story, the work, and the people behind it.',                     img: '/assets/covers/bio.jpg' },
  contact: { t: 'Contact — Barakat Qurtas',        d: 'Pitch a project in one careful letter. I reply to every serious enquiry within 48 hours.',           img: '/assets/covers/contact.jpg' },
};

const TABS = {
  official: { t: 'Official — Barakat Qurtas',       d: 'Editorial design for the Presidency of the Kurdistan Region.',          img: '/assets/covers/official.jpg' },
  book:     { t: 'Book Covers — Barakat Qurtas',    d: 'Typography, illustration, and print composition.',                      img: '/assets/covers/book.jpg' },
  image:    { t: 'Photography — Barakat Qurtas',    d: 'Lightroom editing, composites, and editorial retouching.',              img: '/assets/covers/image.jpg' },
  logo:     { t: 'Logos — Barakat Qurtas',          d: 'Marks, wordmarks, and visual identities — a decade of drawn signs.',    img: '/assets/covers/logo.jpg' },
  posters:  { t: 'Posters — Barakat Qurtas',        d: 'Cultural, political, and typographic poster series.',                   img: '/assets/covers/posters.jpg' },
  social:   { t: 'Social Media — Barakat Qurtas',   d: 'Instagram grids, campaigns, and digital storytelling.',                 img: '/assets/covers/social.jpg' },
  events:   { t: 'Events — Barakat Qurtas',         d: 'Ceremony materials, banners, and event identity design.',               img: '/assets/covers/events.jpg' },
  business: { t: 'Business Cards — Barakat Qurtas', d: 'Personal and client stationery — both sides of the conversation.',      img: '/assets/covers/business.jpg' },
  invoices: { t: 'Invoices — Barakat Qurtas',       d: 'Stationery systems — letterhead, invoice, and receipt.',                img: '/assets/covers/invoices.jpg' },
  video:    { t: 'Video — Barakat Qurtas',          d: 'Documentary edits, motion reels, and protocol media coverage.',         img: '/assets/covers/video.jpg' },
  other:    { t: 'Other Works — Barakat Qurtas',    d: 'Flex banners, type experiments, and notes.',                            img: '/assets/covers/other.jpg' },
};

function metaFor(pathname) {
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const room = seg[0] || 'design';
  const tab  = seg[1];
  if (room === 'design' && tab && TABS[tab]) {
    return { ...TABS[tab], url: `${SITE}/design/${tab}` };
  }
  if (ROOMS[room]) {
    return { ...ROOMS[room], url: room === 'design' ? `${SITE}/design` : `${SITE}/${room}` };
  }
  return { ...ROOMS.design, url: `${SITE}/` };
}

const setContent = (value) => ({ element(el) { el.setAttribute('content', value); } });
const setHref    = (value) => ({ element(el) { el.setAttribute('href', value); } });
const setText    = (value) => ({ element(el) { el.setInnerContent(value); } });

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const known = ['design', 'blog', 'bio', 'contact'];

  // Anything that isn't a known SPA route falls through to normal handling
  // (static assets, the on-brand 404, etc.).
  if (!known.includes(seg[0])) return next();

  // Without the static-assets binding we can't rewrite — let Pages serve
  // the file (client-side routing still resolves the room).
  if (!env || !env.ASSETS) return next();

  const m   = metaFor(url.pathname);
  const img = `${SITE}${m.img}`;
  const imgType = m.img.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

  try {
    // Pull the app shell and rewrite its head for this route.
    const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
    return new HTMLRewriter()
      .on('title',                            setText(m.t))
      .on('meta[name="description"]',         setContent(m.d))
      .on('meta[property="og:title"]',        setContent(m.t))
      .on('meta[property="og:description"]',  setContent(m.d))
      .on('meta[property="og:image"]',        setContent(img))
      .on('meta[property="og:image:type"]',   setContent(imgType))
      .on('meta[property="og:image:alt"]',    setContent(m.t))
      .on('meta[property="og:url"]',          setContent(m.url))
      .on('meta[name="twitter:title"]',       setContent(m.t))
      .on('meta[name="twitter:description"]', setContent(m.d))
      .on('meta[name="twitter:image"]',       setContent(img))
      .on('link[rel="canonical"]',            setHref(m.url))
      .transform(shell);
  } catch (e) {
    // Last resort: serve the unmodified shell so the SPA still loads.
    try { return await env.ASSETS.fetch(new URL('/index.html', url.origin)); }
    catch (_) { return next(); }
  }
}
