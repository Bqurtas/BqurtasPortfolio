/* =========================================================
   Barakat Qurtas — one page per work
   https://bqurtas.com/design/<collection>/<n>

   The gallery is a JavaScript reel: a crawler fetching /design/book saw at
   most the first batch of cards, and every original was hosted on GitHub.
   Each work now has a small, server-rendered page whose main content is that
   one image (or film), served from bqurtas.com/media, with its own title,
   alt text, ImageObject / VideoObject data and links to its neighbours. That
   is the page Google Images and video search can credit to Barakat Qurtas.

   No application JavaScript, no external requests: one inline nonce'd style
   block, one inline nonce'd script (the page guard, functions/_page-guard.js),
   the locally hosted Noto Kufi Arabic face, and the media itself.
   ========================================================= */

import {
  SITE, PERSON_ID, AUTHOR, COLLECTIONS, collectionLabel, collectionPath, describe, displayTitle,
  isoDuration, loadCatalog, mediaPath, mediaType, mediaUrl, pad2, workPath, workUrl
} from './_gallery-catalog.js';
import { KUFI_FACES } from './_font-faces.js';
import { PAGE_GUARD_JS } from './_page-guard.js';

const LANG_PREFIXES = ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];
const SIBLINGS = 12;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const easternDigits = (value) => String(value).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const jsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/* Classify a path shaped like a work page.
   null                      -> not a work URL; the caller carries on
   { status: 404 }           -> a work-shaped URL that can never exist
   { redirect: '/design/…' } -> a language-prefixed or trailing-slash variant
   { coll, index }           -> canonical; the index is range-checked later */
export function parseWorkPath(pathname) {
  const match = /^\/(?:([a-z]+)\/)?design\/([a-z]+)\/([^/]+)(\/?)$/.exec(String(pathname || ''));
  if (!match) return null;
  const [, lang, coll, number, slash] = match;
  if (lang && !LANG_PREFIXES.includes(lang)) return null;
  if (!Object.prototype.hasOwnProperty.call(COLLECTIONS, coll)) return null;
  // No leading zeros, no signs, a sane ceiling: /design/book/07 is not /design/book/7.
  if (!/^[1-9]\d{0,4}$/.test(number)) return { status: 404 };
  if (lang || slash) return { redirect: workPath(coll, Number(number)) };
  return { coll, index: Number(number) };
}

function siblingsOf(list, index) {
  const at = Math.max(0, list.findIndex((item) => item.index === index));
  const start = Math.max(0, Math.min(at - SIBLINGS / 2, list.length - SIBLINGS - 1));
  return list.slice(start, start + SIBLINGS + 1).filter((item) => item.index !== index).slice(0, SIBLINGS);
}

function fmtDuration(seconds) {
  const total = Math.max(1, Math.round(seconds));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function structuredData(item, copy, canon, list) {
  const c = COLLECTIONS[item.coll];
  const media = mediaUrl(item.path);
  const person = { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR, url: SITE + '/' };
  const px = (value) => ({ '@type': 'QuantitativeValue', value, unitCode: 'E37' });
  const crumbs = [['Home', SITE + '/'], ['Design', SITE + '/design']];
  if (c.tab) crumbs.push([collectionLabel(item.coll), SITE + collectionPath(item.coll)]);
  crumbs.push([copy.title, canon]);
  const common = {
    '@id': canon + '#media',
    name: copy.title,
    description: copy.sentence,
    contentUrl: media,
    width: px(item.width),
    height: px(item.height),
    encodingFormat: mediaType(item.path),
    /* Certificates are awarded to him by others: they are about him, not
       authored or licensable by him. */
    ...(c.rel === 'archive'
      ? { about: { '@id': PERSON_ID } }
      : {
          creator: person,
          copyrightHolder: { '@id': PERSON_ID },
          creditText: AUTHOR,
          copyrightNotice: `© ${AUTHOR}`,
          acquireLicensePage: SITE + '/contact'
        }),
    isPartOf: { '@id': canon }
  };
  const node = item.type === 'video'
    ? {
        '@type': 'VideoObject', ...common,
        ...(item.poster ? { thumbnailUrl: [SITE + item.poster] } : {}),
        ...(item.date ? { uploadDate: item.date } : {}),
        ...(item.duration ? { duration: isoDuration(item.duration) } : {}),
        inLanguage: 'en'
      }
    : { '@type': 'ImageObject', ...common, url: media, caption: copy.alt, representativeOfPage: true };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemPage', '@id': canon, url: canon, name: copy.title + ' — ' + AUTHOR,
        description: copy.description, inLanguage: 'en',
        isPartOf: { '@id': SITE + '/#website' },
        about: { '@id': PERSON_ID },
        breadcrumb: { '@id': canon + '#breadcrumb' },
        ...(item.type === 'video' ? { video: { '@id': canon + '#media' } } : { primaryImageOfPage: { '@id': canon + '#media' } })
      },
      node,
      {
        '@type': 'BreadcrumbList', '@id': canon + '#breadcrumb',
        itemListElement: crumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url }))
      }
    ]
  };
}

const STYLE = `
${KUFI_FACES}
:root{--bed:#0b0b0c;--paper:#f3f3f3;--plate:#fff;--ink:#141414;--ink-2:#2c2c2c;--muted:#6a6a6a;--line:rgba(20,20,20,.12);--bed-ink:#f3f3f3;--bed-muted:rgba(243,243,243,.58);--sans:'Noto Kufi Arabic',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--mono:ui-monospace,'SFMono-Regular','SF Mono',Menlo,Consolas,'Liberation Mono',monospace;color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--bed);color:var(--ink);font:400 16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden}
a{color:inherit;text-decoration:none}
a:focus-visible{outline:2px solid currentColor;outline-offset:3px;border-radius:8px}
.mono{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase}
.skip{position:absolute;left:12px;top:-60px;z-index:9;padding:10px 16px;border-radius:999px;background:var(--paper);color:var(--ink)}
.skip:focus{top:12px}
.bed{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;gap:clamp(10px,1.6vw,18px);padding:clamp(10px,1.6vw,18px);max-width:1520px;margin:0 auto}
.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 18px;padding:6px clamp(6px,1.4vw,14px);color:var(--bed-ink)}
.brand{display:flex;flex-direction:column;gap:2px;line-height:1.2}
.brand b{font-size:17px;font-weight:600;letter-spacing:-.01em}
.brand span{color:var(--bed-muted)}
.top nav{display:flex;flex-wrap:wrap;gap:6px}
.top nav a{padding:9px 14px;border:1px solid rgba(243,243,243,.18);border-radius:999px;color:var(--bed-ink);transition:background .2s,color .2s}
.top nav a:hover{background:var(--bed-ink);color:var(--ink)}
.sheet{flex:1;background:var(--paper);border-radius:28px;padding:clamp(18px,4vw,56px);min-width:0}
.crumbs ol{display:flex;flex-wrap:wrap;gap:6px 10px;margin:0;padding:0;list-style:none;color:var(--muted)}
.crumbs li{display:flex;gap:10px;min-width:0}
.crumbs li+li::before{content:'/';opacity:.45}
.crumbs a:hover{color:var(--ink)}
.crumbs [aria-current]{color:var(--ink)}
.work{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:clamp(24px,4.4vw,72px);align-items:start;margin-top:clamp(18px,3vw,40px)}
.plate{margin:0;min-width:0}
.plate-frame{background:var(--plate);border-radius:20px;padding:clamp(10px,2.2vw,28px);box-shadow:0 1px 2px rgba(0,0,0,.05),0 30px 70px -36px rgba(0,0,0,.42)}
.plate img,.plate video{display:block;width:100%;height:auto;max-height:min(78vh,1180px);object-fit:contain;border-radius:6px;background:var(--plate)}
.plate video{background:#000}
.plate img,.plate video{-webkit-touch-callout:none;-webkit-user-drag:none;-webkit-user-select:none;user-select:none}
.plate figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;margin-top:14px;padding:0 4px;color:var(--muted)}
.meta{min-width:0;position:sticky;top:24px}
.eyebrow{margin:0 0 14px;color:var(--muted)}
h1{margin:0;font-size:clamp(34px,5.2vw,68px);line-height:1.02;font-weight:600;letter-spacing:-.025em;overflow-wrap:anywhere}
.lede{margin:clamp(16px,2vw,24px) 0 0;max-width:46ch;color:var(--ink-2);font-size:17px}
.local{margin:18px 0 0;padding-top:16px;border-top:1px solid var(--line);display:grid;gap:8px}
.local p{margin:0;color:var(--ink-2);font-size:15.5px;line-height:1.9}
.facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 18px;margin:24px 0 0;padding:18px 0 0;border-top:1px solid var(--line)}
.facts dt{color:var(--muted);padding-top:3px}
.facts dd{margin:0;font-size:15px;overflow-wrap:anywhere}
.facts dd a{border-bottom:1px solid var(--line)}
.facts dd a:hover{border-color:var(--ink)}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:46px;padding:12px 20px;border:1px solid var(--ink);border-radius:999px;text-align:center;transition:background .2s,color .2s}
.btn--ink{background:var(--ink);color:var(--paper)}
.btn--ink:hover{background:transparent;color:var(--ink)}
.btn:not(.btn--ink):hover{background:var(--ink);color:var(--paper)}
.pager{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:28px;padding-top:18px;border-top:1px solid var(--line)}
.pager a{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(20,20,20,.04);min-width:0;transition:background .2s}
.pager a:hover{background:rgba(20,20,20,.09)}
.pager a span{color:var(--muted)}
.pager a b{font-weight:600;font-size:15px;overflow-wrap:anywhere}
.pager .next{grid-column:2;text-align:end}
.more{margin-top:clamp(36px,5vw,72px);padding-top:clamp(20px,2.4vw,28px);border-top:1px solid var(--line)}
.more h2{margin:0 0 16px;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.chips a{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;font-size:14px;transition:border-color .2s,background .2s}
.chips a:hover{border-color:var(--ink);background:var(--plate)}
.chips .all{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.chips .all:hover{background:var(--ink-2)}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 18px;padding:6px clamp(6px,1.4vw,14px) 10px;color:var(--bed-muted)}
.foot a:hover{color:var(--bed-ink)}
.foot nav{display:flex;flex-wrap:wrap;gap:6px 16px}
@media (max-width:900px){.work{grid-template-columns:minmax(0,1fr)}.meta{position:static}.plate img,.plate video{max-height:none}}
@media (max-width:480px){.sheet{border-radius:22px}.plate-frame{border-radius:16px}.btn{flex:1 1 100%}.pager{grid-template-columns:1fr}.pager .next{grid-column:auto}.facts{grid-template-columns:minmax(0,1fr);gap:2px 0}.facts dd{margin-bottom:10px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

export function renderWorkPage({ item, list, nonce }) {
  const c = COLLECTIONS[item.coll];
  const copy = describe(item);
  const canon = workUrl(item.coll, item.index);
  const media = mediaUrl(item.path);
  /* The body loads media root-relative so Pages preview hosts pass the
     page's own img-src/media-src 'self'; canonical, Open Graph and JSON-LD
     keep the absolute bqurtas.com URLs. */
  const mediaSrc = mediaPath(item.path);
  const label = collectionLabel(item.coll);
  const collectionHref = collectionPath(item.coll);
  const isVideo = item.type === 'video';
  const poster = isVideo && item.poster ? SITE + item.poster : '';
  const shareImage = isVideo ? poster : media;
  const kuNumber = easternDigits(pad2(item.index));
  const ku = c.rel === 'archive'
    ? `${c.ku} ${kuNumber} — لە ئەرشیفی بەرەکات قورتاس، دیزاینەری گرافیکی کورد لە هەولێر، هەرێمی کوردستان.`
    : `${c.ku} ${kuNumber} — کارێکی بەرەکات قورتاس، دیزاینەری گرافیکی کورد لە هەولێر، هەرێمی کوردستان.`;
  const ar = c.rel === 'archive'
    ? `${c.ar} ${kuNumber} — من أرشيف بركات قرطاس، مصمم جرافيك كردي في أربيل، إقليم كردستان.`
    : `${c.ar} ${kuNumber} — من أعمال بركات قرطاس، مصمم جرافيك كردي في أربيل، إقليم كردستان.`;
  // Duplicate copies redirect, so the pager and sibling list skip them.
  const own = list.filter((entry) => !entry.canonical);
  const at = own.indexOf(item);
  const prev = at > 0 ? own[at - 1] : null;
  const next = at >= 0 && at < own.length - 1 ? own[at + 1] : null;
  const pageTitle = `${copy.title} — ${AUTHOR}, Graphic Designer in Erbil`;
  const format = isVideo
    ? `${item.width} × ${item.height} px · MP4${item.duration ? ' · ' + fmtDuration(item.duration) : ''}`
    : `${item.width} × ${item.height} px · ${(item.path.split('.').pop() || '').toUpperCase()}`;

  const mediaHtml = isVideo
    ? `<video controls controlslist="nodownload" playsinline preload="metadata"${item.poster ? ` poster="${esc(item.poster)}"` : ''} width="${item.width}" height="${item.height}" aria-label="${esc(copy.alt)}">
          <source src="${esc(mediaSrc)}" type="video/mp4">
          <a href="${esc(mediaSrc)}">${esc(copy.title)} (MP4)</a>
        </video>`
    : `<img src="${esc(mediaSrc)}" width="${item.width}" height="${item.height}" alt="${esc(copy.alt)}" loading="eager" decoding="async" fetchpriority="high">`;

  const og = [
    ['og:type', isVideo ? 'video.other' : 'website'],
    ['og:site_name', AUTHOR],
    ['og:locale', 'en_US'],
    ['og:title', pageTitle],
    ['og:description', copy.description],
    ['og:url', canon],
    ...(shareImage ? [
      ['og:image', shareImage],
      ...(isVideo ? [['og:image:type', 'image/jpeg']] : [
        ['og:image:width', String(item.width)],
        ['og:image:height', String(item.height)],
        ['og:image:type', mediaType(item.path)]
      ]),
      ['og:image:alt', copy.alt]
    ] : []),
    ...(isVideo ? [
      ['og:video', media], ['og:video:type', 'video/mp4'],
      ['og:video:width', String(item.width)], ['og:video:height', String(item.height)]
    ] : [])
  ].map(([property, content]) => `<meta property="${property}" content="${esc(content)}">`).join('\n');

  const twitter = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', pageTitle],
    ['twitter:description', copy.description],
    ...(shareImage ? [['twitter:image', shareImage], ['twitter:image:alt', copy.alt]] : [])
  ].map(([name, content]) => `<meta name="${name}" content="${esc(content)}">`).join('\n');

  const crumbs = [`<li><a href="/">Home</a></li>`, `<li><a href="/design">Design</a></li>`];
  if (c.tab) crumbs.push(`<li><a href="${esc(collectionHref)}">${esc(label)}</a></li>`);
  crumbs.push(`<li aria-current="page">${esc(copy.title)}</li>`);

  const siblings = siblingsOf(own, item.index).map((s) =>
    `<li><a href="${esc(workPath(s.coll, s.index))}">${esc(displayTitle(s.coll, s.index))}</a></li>`).join('');
  const year = new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(copy.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="author" content="${esc(AUTHOR)}">
<meta name="theme-color" content="#0b0b0c">
<link rel="canonical" href="${esc(canon)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
${og}
${twitter}
<style nonce="${esc(nonce)}">${STYLE}</style>
<script nonce="${esc(nonce)}">${PAGE_GUARD_JS}</script>
<script type="application/ld+json">${jsonLd(structuredData(item, copy, canon, list))}</script>
</head>
<body>
<a class="skip mono" href="#work">Skip to the work</a>
<div class="bed">
  <header class="top">
    <a class="brand" href="/"><b>${esc(AUTHOR)}</b><span class="mono">Graphic designer · Erbil (Hewlêr)</span></a>
    <nav class="mono" aria-label="Site"><a href="/design">Work</a><a href="/bio">About</a><a href="/contact">Contact</a></nav>
  </header>
  <main class="sheet" id="work">
    <nav class="crumbs mono" aria-label="Breadcrumb"><ol>${crumbs.join('')}</ol></nav>
    <article class="work">
      <figure class="plate">
        <div class="plate-frame">
        ${mediaHtml}
        </div>
        <figcaption class="mono"><span>${esc(copy.title)} — ${esc(AUTHOR)}</span><span>${esc(format)}</span></figcaption>
      </figure>
      <div class="meta">
        <p class="eyebrow mono">No. ${esc(pad2(item.index))} of ${esc(pad2(list.length))} · ${esc(c.title)}</p>
        <h1>${esc(copy.title)}</h1>
        <p class="lede">${esc(copy.sentence)}</p>
        <div class="local">
          <p lang="ckb" dir="rtl">${esc(ku)}</p>
          <p lang="ar" dir="rtl">${esc(ar)}</p>
        </div>
        <dl class="facts">
          <dt class="mono">${c.rel === 'archive' ? 'Holder' : 'Designer'}</dt><dd><a href="/bio">${esc(AUTHOR)}</a></dd>
          <dt class="mono">Based in</dt><dd>Erbil (Hewlêr), Kurdistan Region of Iraq</dd>
          <dt class="mono">Collection</dt><dd><a href="${esc(collectionHref)}">${esc(label)}</a></dd>
          <dt class="mono">Format</dt><dd>${esc(format)}</dd>
        </dl>
        <div class="actions mono">
          <a class="btn btn--ink" href="/contact">Start a project <span aria-hidden="true">→</span></a>
          <a class="btn" href="${esc(collectionHref)}">${c.tab ? `View the ${esc(label)} collection` : 'View all work'}</a>
        </div>
        ${prev || next ? `<nav class="pager" aria-label="Previous and next ${esc(c.title)} works">
          ${prev ? `<a class="prev" href="${esc(workPath(prev.coll, prev.index))}"><span class="mono">← Previous</span><b>${esc(displayTitle(prev.coll, prev.index))}</b></a>` : ''}
          ${next ? `<a class="next" href="${esc(workPath(next.coll, next.index))}"><span class="mono">Next →</span><b>${esc(displayTitle(next.coll, next.index))}</b></a>` : ''}
        </nav>` : ''}
      </div>
    </article>
    ${siblings ? `<section class="more" aria-labelledby="more-title">
      <h2 class="mono" id="more-title">More ${esc(c.title)} works · ${esc(String(list.length))}</h2>
      <ol class="chips">${siblings}<li><a class="all mono" href="${esc(collectionHref)}">View collection <span aria-hidden="true">→</span></a></li></ol>
    </section>` : ''}
  </main>
  <footer class="foot mono">
    <span>© 2014–${year} ${esc(AUTHOR)} · Hewlêr, Kurdistan</span>
    <nav aria-label="Footer"><a href="/">Home</a><a href="/design">All work</a><a href="/contact">Start a project</a></nav>
  </footer>
</div>
</body>
</html>
`;
}

/* helpers: { notFound(), unavailable(), securityHeaders(), next() } from the
   catch-all, so the 404/503 pages and document headers stay identical. */
export async function serveWorkPage(request, url, env, route, helpers) {
  if (!env || !env.ASSETS) return helpers.next();
  let catalog;
  try { catalog = await loadCatalog(env, url.origin); }
  catch (e) { return helpers.unavailable(); }
  const list = catalog.byColl[route.coll] || [];
  const item = list[route.index - 1];
  if (!item) return helpers.notFound();
  /* The same artwork filed under a second collection: send the visitor (and
     Google) to the one canonical page for that image. */
  if (item.canonical) {
    const target = new URL(workPath(item.canonical.coll, item.canonical.index), url.origin);
    return Response.redirect(target.toString(), 301);
  }

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = [
    "default-src 'none'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'self'",
    "form-action 'self'", "img-src 'self' data:", "media-src 'self'", "font-src 'self'",
    "style-src 'nonce-" + nonce + "'", "script-src 'nonce-" + nonce + "'", 'upgrade-insecure-requests'
  ].join('; ');
  const headers = new Headers({
    ...helpers.securityHeaders(),
    'Content-Type': 'text/html; charset=UTF-8',
    'Content-Language': 'en',
    'Content-Security-Policy': csp,
    'Cache-Control': 'no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': SITE
  });
  const body = request.method === 'HEAD' ? null : renderWorkPage({ item, list, nonce });
  return new Response(body, { status: 200, headers });
}
