/* =========================================================
   Barakat Qurtas — Dynamic Gallery
   Pulls images/videos from GitHub via jsDelivr CDN
   ========================================================= */

window.BQ_GALLERY = {

  CDN_BASE: 'https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main',
  RAW_BASE: 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main',
  REPO:     'Bqurtas/BqurtasPortfolio',
  BRANCH:   'main',
  _loaded:  false,
  _ok:      false,

  /* Each collection: folder, file prefix, extension, count,
     cat = data-cat used for tab filtering (defaults to key),
     tag = display label, icon = FA class, title = card heading */
  COLLECTIONS: {
    general:     { folder: 'GeneralDesign', prefix: 'GDesign',     ext: 'webp', count: 84,  cat: 'general',     tag: 'Design',        icon: 'fa-grip',           title: 'Design' },
    book:        { folder: 'Book',          prefix: 'BookCover',   ext: 'webp', count: 99,  cat: 'book',        tag: 'Book',          icon: 'fa-book',           title: 'Book Cover' },
    official:    { folder: 'Official',      prefix: 'Official',    ext: 'webp', count: 168, cat: 'official',    tag: 'Official',      icon: 'fa-landmark',       title: 'Official' },
    posters:     { folder: 'Poster',        prefix: 'Poster',      ext: 'webp', count: 18,  cat: 'posters',     tag: 'Poster',        icon: 'fa-image',          title: 'Poster' },
    social:      { folder: 'SocialMedia',   prefix: 'SMedia',      ext: 'webp', count: 19,  cat: 'social',      tag: 'Social',        icon: 'fa-hashtag',        title: 'Social Media' },
    logo:        { folder: 'LogoDesign',    prefix: 'Logo',        ext: 'webp', count: 28,  cat: 'logo',        tag: 'Logo',          icon: 'fa-pen-nib',        title: 'Logo' },
    tickerlogo:  { folder: 'TickerLogo',    prefix: 'TickerLogo',  ext: 'webp', count: 8,   cat: 'tickerlogo',  tag: 'Logo',          icon: 'fa-pen-nib',        title: 'Ticker Logo',
                   files: ['TickerLogo2.webp','TickerLogo3.webp','TickerLogo5.webp','TickerLogo6.webp','TickerLogo9.webp','TickerLogo10.webp','TickerLogo12.webp','TickerLogo13.webp'] },
    events:      { folder: 'EventandCon',   prefix: 'Event',       ext: 'webp', count: 16,  cat: 'events',      tag: 'Events',        icon: 'fa-calendar-day',   title: 'Event' },
    business:    { folder: 'Businesscard',  prefix: 'Bcard',       ext: 'webp', count: 11,  cat: 'stationery',  tag: 'Business Card', icon: 'fa-id-card',        title: 'Business Card' },
    invoices:    { folder: 'Invoice',       prefix: 'Invoice',     ext: 'webp', count: 12,  cat: 'stationery',  tag: 'Invoice',       icon: 'fa-file-invoice',   title: 'Invoice' },
    image:       { folder: 'Photos',        prefix: 'Photo',       ext: 'webp', count: 147, cat: 'image',       tag: 'Photo',         icon: 'fa-camera',         title: 'Photo' },
    other:       { folder: 'Other',         prefix: 'Other',       ext: 'webp', count: 45,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Other' },
    certificate: { folder: 'Certificate',   prefix: 'Certificate', ext: 'webp', count: 16,  cat: 'certificate', tag: 'Certificate',   icon: 'fa-award',          title: 'Certificate' },
    flex:        { folder: 'Flex',          prefix: 'Flex',        ext: 'webp', count: 13,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Flex' },
    video:       { folder: 'Videos',        prefix: 'Videos',      ext: 'mp4',  count: 30,  cat: 'video',       tag: 'Video',         icon: 'fa-video',          title: 'Video' },
  },

  /* Direct CDN url for a collection + 1-based index. If a live folder
     manifest was loaded it maps the index to the real filename; otherwise
     it falls back to the static prefix+number scheme. */
  url(coll, i) {
    const c = this.COLLECTIONS[coll];
    if (!c) return '';
    if (c.files && c.files[i - 1] != null)
      return `${this.CDN_BASE}/${c.folder}/${encodeURIComponent(c.files[i - 1])}`;
    return `${this.CDN_BASE}/${c.folder}/${c.prefix}${i}.${c.ext}`;
  },

  /* raw.githubusercontent fallback for the same item — used when jsDelivr
     hasn't cached a brand-new file yet, so freshly dropped work still shows. */
  rawUrl(coll, i) {
    const c = this.COLLECTIONS[coll];
    if (!c) return '';
    if (c.files && c.files[i - 1] != null)
      return `${this.RAW_BASE}/${c.folder}/${encodeURIComponent(c.files[i - 1])}`;
    return `${this.RAW_BASE}/${c.folder}/${c.prefix}${i}.${c.ext}`;
  },

  /* A lighter, on-the-fly resized WebP (via the free wsrv.nl image CDN) for
     gallery cards. The lightbox still uses the original file through data-full. */
  thumb(url, w) {
    /* Grid thumbnails are pre-generated FIRST-PARTY files under assets/thumbs/
       (320px WebP) — no third-party image proxy in the load path (a weserv.nl
       timeout was logging a console error and failing Best Practices). Any
       repo image without a local thumb falls back to weserv via the global
       error listener below. */
    const base = url.indexOf(this.RAW_BASE) === 0 ? this.RAW_BASE
               : (url.indexOf(this.CDN_BASE) === 0 ? this.CDN_BASE : null);
    if (base) return 'assets/thumbs/' + url.slice(base.length + 1);
    return 'https://images.weserv.nl/?url=' + url.replace(/^https?:\/\//, '') + '&w=' + w + '&output=webp&q=66';
  },

  dimsFromRatio(ratio, width) {
    const parts = String(ratio || '4 / 5').split('/');
    const w = parseFloat(parts[0]) || 4;
    const h = parseFloat(parts[1]) || 5;
    const outW = width || 820;
    return { width: outW, height: Math.max(1, Math.round(outW * h / w)) };
  },

  items(coll) {
    const c   = this.COLLECTIONS[coll];
    if (!c) return [];
    const cat = c.cat || coll;
    const n   = (c.files && c.files.length) ? c.files.length : c.count;
    const out = [];
    for (let i = 1; i <= n; i++) {
      const fname = c.files ? c.files[i - 1] : null;
      const type  = fname ? (/\.(mp4|webm|mov)$/i.test(fname) ? 'video' : 'image')
                          : (c.ext === 'mp4' ? 'video' : 'image');
      out.push({ coll, cat, index: i, type,
        url:    this.url(coll, i),
        rawUrl: this.rawUrl(coll, i),
        width:  c.dimensions && c.dimensions[fname || `${c.prefix}${i}.${c.ext}`]
                  ? c.dimensions[fname || `${c.prefix}${i}.${c.ext}`].width : 0,
        height: c.dimensions && c.dimensions[fname || `${c.prefix}${i}.${c.ext}`]
                  ? c.dimensions[fname || `${c.prefix}${i}.${c.ext}`].height : 0,
        title:  `${c.title} ${String(i).padStart(2, '0')}`,
        titlePrefix: c.title,
        tag: c.tag, icon: c.icon,
      });
    }
    return out;
  },

  /* ── First-party gallery manifest ─────────────────────────────────────
     The manifest is generated with the exact dimensions of every thumbnail
     and video. That lets the browser reserve each pin's final height before
     it loads, eliminating masonry jumps without an external GitHub API call. */
  async loadManifest() {
    if (this._loaded) return this._ok;
    this._loaded = true;
    try {
      const response = await fetch('assets/gallery-manifest.json?v=403', { cache: 'force-cache' });
      if (!response.ok) throw new Error('gallery manifest unavailable');
      const manifest = await response.json();
      const records = [...(manifest.images || []), ...(manifest.videos || [])];
      const byFolder = {};
      records.forEach((record) => {
        if (!record || !record.path || !record.width || !record.height) return;
        const slash = record.path.indexOf('/');
        if (slash < 0 || record.path.indexOf('/', slash + 1) >= 0) return;
        const folder = record.path.slice(0, slash);
        const file = record.path.slice(slash + 1);
        (byFolder[folder] || (byFolder[folder] = [])).push({
          file,
          width: record.width,
          height: record.height,
        });
      });
      for (const key of Object.keys(this.COLLECTIONS)) {
        const collection = this.COLLECTIONS[key];
        const list = byFolder[collection.folder];
        if (!list || !list.length) continue;
        collection.files = list.map((record) => record.file);
        collection.dimensions = Object.fromEntries(list.map((record) => [record.file, record]));
        collection.count = collection.files.length;
      }
      return (this._ok = true);
    } catch (e) {
      return (this._ok = false);
    }
  },

  all() {
    const list = [];
    for (const k of Object.keys(this.COLLECTIONS)) list.push(...this.items(k));
    return list;
  },
};

/* =========================================================
   Build cards inside #grid
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('grid');
  if (!grid) return;

  /* Auto-discover real folder contents before building cards. This keeps each
     48-card batch based on files that actually exist, instead of rendering stale
     static counts and then losing cards after image errors. */
  await window.BQ_GALLERY.loadManifest();

  /* Remove loading spinner */
  const loader = document.getElementById('galleryLoading');
  if (loader) loader.remove();

  /* ---- language-aware card labels (tag + title) ---- */
  const galLang = () => (document.documentElement.dataset.lang || 'en');
  const galDigits = (s) => (galLang() === 'ku' || galLang() === 'ar')
    ? String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(s);
  const galTag = (coll, fb) => {
    const t = window.GAL_I18N && window.GAL_I18N[galLang()] && window.GAL_I18N[galLang()][coll];
    if (t && t.tag) return t.tag;
    const c = window.BQ_GALLERY.COLLECTIONS[coll];
    return (c && c.tag) || fb || '';
  };
  const galTitle = (coll, i, fb) => {
    const t = window.GAL_I18N && window.GAL_I18N[galLang()] && window.GAL_I18N[galLang()][coll];
    const c = window.BQ_GALLERY.COLLECTIONS[coll];
    const pfx = (t && t.title) || (c && c.title) || fb || '';
    return `${pfx} ${galDigits(String(i).padStart(2, '0'))}`;
  };
  const galViewLabel = (title) => `${(window.BQ_DICT && window.BQ_DICT['a11y.view']) || 'View'} ${title}`;
  const ORDER = [
    'general','official','book','image','logo',
    'posters','social','events','business','invoices',
    'flex','video','other','certificate'
  ];

  /* Attach a video's own source as its card nears the viewport, so the first
     frame can paint as the cover. Falls back to hydrating everything at once
     where IntersectionObserver is missing. */
  const hydrateVideo = (vid) => {
    if (!vid || vid.src || !vid.dataset.src) return;
    vid.src = vid.dataset.src + '#t=0.1';
  };
  const videoWatcher = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          hydrateVideo(entry.target);
          obs.unobserve(entry.target);
        });
      }, /* A film fetches its moov atom and a media segment before it can paint
             a frame, and 400px of lead was not enough of a head start: cards
             arrived on screen as empty plates and filled a second or two later.
             Measured, every hydrated video does reach a frame — it just needs
             to start sooner. 1200px is a little over one screen of warning on
             a phone, which loads roughly two screens of films at a time rather
             than the whole category. */
         { rootMargin: '1200px 0px' })
    : null;

  const buildCard = (item) => {
    const article = document.createElement('article');
    // Design works (logos, book covers, stationery, etc.) are exported with
    // transparency — give them a clean white plate instead of the dark block
    // that otherwise shows through. Photos/posters/social are full-bleed, left dark.
    const PLATE_CATS = { book: 1, logo: 1, stationery: 1, events: 1, general: 1, other: 1, certificate: 1 };
    const plate = /\.png(\?|$)/i.test(item.url || '') || !!PLATE_CATS[item.cat];
    article.className = 'card card--photo card--pending-media' + (plate ? ' card--plate' : '');
    const fallbackRatio = item.type === 'video' ? '16 / 9' : '4 / 5';
    const dims = item.width && item.height
      ? { width: item.width, height: item.height }
      : window.BQ_GALLERY.dimsFromRatio(fallbackRatio, item.type === 'video' ? 1280 : 320);
    const cardRatio = `${dims.width} / ${dims.height}`;
    article.style.setProperty('--card-ratio', cardRatio);
    const dispTag   = galTag(item.coll, item.tag);
    const dispTitle = galTitle(item.coll, item.index, item.titlePrefix || item.tag);
    article.dataset.cat   = item.cat;
    article.dataset.coll  = item.coll;
    article.dataset.idx   = item.index;
    article.dataset.full  = item.url;
    article.dataset.title = dispTitle;
    article.dataset.type  = item.type;

    // Cards are small (<=280px) on every screen, so load a resized WebP for ALL
    // images at 320px. Videos and the
    // zoom lightbox (data-full) still use the ORIGINAL full file, so quality is
    // untouched where it shows big. Cuts multi-MB originals to small thumbnails.
    const imgSrc = (item.type !== 'video') ? window.BQ_GALLERY.thumb(item.url, 320) : item.url;
    /* No poster. Every video used to wear assets/covers/en-video.jpg — the
       social-share card for the /design/video route — so twelve different
       films showed the reader one identical picture, and on a phone, where
       there is no hover to trigger playback, that picture was all they ever
       saw. A film's own first frame is its cover. preload="metadata" plus the
       #t=0.1 media fragment is what makes the browser fetch enough to paint
       that frame; the source itself is attached only once the card nears the
       viewport, so a category of thirty films does not open thirty
       connections at once. */
    const mediaHtml = item.type === 'video'
      ? `<video muted loop playsinline preload="metadata" data-src="${item.url}" title="${dispTitle}" width="${dims.width}" height="${dims.height}"></video>`
      : `<img loading="lazy" decoding="async" fetchpriority="low" src="${imgSrc}" alt="${dispTitle}" width="${dims.width}" height="${dims.height}" />`;

    article.innerHTML = `
      <button class="card-open" type="button" aria-label="${galViewLabel(dispTitle)}">
        <span class="card-art card-art--photo">
          ${mediaHtml}
          <span class="card-hover-shade" aria-hidden="true"></span>
        </span>
      </button>
      <div class="card-caption">
        <h3 class="card-title">${dispTitle}</h3>
        <span class="card-tag">${dispTag}</span>
      </div>`;

    /* On error try raw.githubusercontent once (covers brand-new files that
       jsDelivr hasn't cached yet); only then drop the card. */
    const media = article.querySelector('img, video');
    const markReady = () => article.classList.add('card--media-ready');
    media.addEventListener('load', markReady);
    media.addEventListener('loadedmetadata', markReady);
    media.addEventListener('loadeddata', markReady);
    if ((media.tagName === 'IMG' && media.complete && media.naturalHeight) ||
        media.tagName === 'VIDEO') markReady();
    media.addEventListener('error', () => {
      // 1) resized phone copy failed → original full image (jsDelivr)
      if (media.src !== item.url && !media.dataset.orig) {
        media.dataset.orig = '1';
        media.src = item.url;
        return;
      }
      // 2) jsDelivr failed → raw.githubusercontent
      if (item.rawUrl && !media.dataset.fb) {
        media.dataset.fb = '1';
        media.src = item.rawUrl;
        return;
      }
      // 3) raw GitHub failed → Statically CDN
      if (!media.dataset.stat && item.coll) {
        media.dataset.stat = '1';
        const collInfo = window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS && window.BQ_GALLERY.COLLECTIONS[item.coll];
        const folder = (collInfo && collInfo.folder) || item.coll;
        const fname = collInfo && collInfo.files && collInfo.files[item.index - 1] ? collInfo.files[item.index - 1] : `${collInfo.prefix || item.coll}${item.index}.${collInfo.ext || 'webp'}`;
        media.src = `https://cdn.statically.io/gh/Bqurtas/BqurtasPortfolio/main/${folder}/${encodeURIComponent(fname)}`;
        return;
      }
      article.remove();
    });
    if (media.tagName === 'VIDEO') {
      if (videoWatcher) videoWatcher.observe(media);
      else hydrateVideo(media);
    }
    return article;
  };

  /* Build every card once into a shared array — main.js masonry handles
     placement, filtering, and pagination. */
  const fmtCount = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
  const computeGalleryCounts = () => {
    const cats = {};
    (window.BQ_ALL_CARDS || []).forEach(entry => {
      if (!entry || !entry.cat) return;
      cats[entry.cat] = (cats[entry.cat] || 0) + 1;
    });
    if (!Object.keys(cats).length) {
      Object.entries(window.BQ_GALLERY.COLLECTIONS || {}).forEach(([key, coll]) => {
        if (!coll) return;
        const cat = coll.cat || key;
        cats[cat] = (cats[cat] || 0) + ((coll.files && coll.files.length) || coll.count || 0);
      });
    }
    return { total: Object.values(cats).reduce((sum, n) => sum + n, 0), cats };
  };
  const syncGalleryCounts = () => {
    const counts = computeGalleryCounts();
    const setCount = (filter, n) => {
      document.querySelectorAll(`.tab[data-filter="${filter}"]`).forEach(tab => {
        tab.dataset.workCount = String(n);
        const el = tab.querySelector('.tab-count');
        if (el) el.textContent = fmtCount(n);
      });
    };
    setCount('all', counts.total);
    Object.entries(counts.cats).forEach(([cat, n]) => setCount(cat, n));
    try { window.dispatchEvent(new CustomEvent('bq:gallery-counts', { detail: counts })); } catch (e) {}
    return counts;
  };
  window.__bqGalleryCounts = computeGalleryCounts;
  window.__bqBuildGalleryCard = buildCard;
  const galleryEntries = () => {
    const entries = [];
    ORDER.forEach(coll => {
      window.BQ_GALLERY.items(coll).forEach(item => {
        entries.push({ el: null, item, cat: item.cat, type: item.type, coll: item.coll });
      });
    });
    return entries;
  };
  const buildGalleryCards = () => {
    window.BQ_ALL_CARDS = galleryEntries();
    return syncGalleryCounts();
  };
  /* Keep the full catalogue as light data records. Cards become DOM only when
     a visible batch needs them, which avoids hundreds of off-screen nodes and
     long tasks while preserving filters, counts and the complete catalogue. */
  (() => {
    window.BQ_ALL_CARDS = galleryEntries();
    syncGalleryCounts();
    try { window.dispatchEvent(new CustomEvent('bq:gallery-built')); } catch (e) {}
  })();
  window.__bqRefreshGalleryFromManifest = async () => {
    window.BQ_GALLERY._loaded = false;
    window.BQ_GALLERY._ok = false;
    await window.BQ_GALLERY.loadManifest();
    const counts = buildGalleryCards();
    if (window.__bqInitLightbox) window.__bqInitLightbox();
    if (window.__bqRenderGallery) window.__bqRenderGallery(true);
    if (window.__bqRelocalizeGallery) window.__bqRelocalizeGallery();
    return counts;
  };

  /* ── Certificate gallery in Biography room ── */
  const certGrid = document.getElementById('certGrid');
  if (certGrid) {
    document.getElementById('certLoading')?.remove();
    window.BQ_GALLERY.items('certificate').forEach(item => {
      const div = document.createElement('div');
      const dispTitle = galTitle('certificate', item.index, item.titlePrefix);
      div.className = 'cert-item';
      div.dataset.coll  = 'certificate';
      div.dataset.idx   = item.index;
      div.dataset.full  = item.url;
      div.dataset.title = dispTitle;
      div.dataset.type  = 'image';
      div.innerHTML = `
        <div class="cert-img-wrap">
          <img loading="lazy" decoding="async" width="${item.width || 640}" height="${item.height || 880}" src="${window.BQ_GALLERY.thumb(item.url, 320)}" data-full="${item.url}" data-raw="${item.rawUrl}" alt="${dispTitle}" />
          <div class="cert-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        </div>
        <span class="mono cert-label">${dispTitle}</span>`;
      div.addEventListener('error', () => div.remove(), { once: true });
      certGrid.appendChild(div);
    });

    /* error fallback for cert images: raw.githubusercontent once, then drop */
    certGrid.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        if (img.dataset.full && !img.dataset.orig) { img.dataset.orig = '1'; img.src = img.dataset.full; return; }
        const raw = img.dataset.raw;
        if (raw && !img.dataset.fb) { img.dataset.fb = '1'; img.src = raw; return; }
        img.closest('.cert-item')?.remove();
      });
    });

    /* open lightbox on cert click */
    certGrid.addEventListener('click', e => {
      const item = e.target.closest('.cert-item');
      if (!item) return;
      const items = [...certGrid.querySelectorAll('.cert-item')];
      const pool  = items.map(el => ({
        full: el.dataset.full, title: el.dataset.title, type: 'image'
      }));
      if (window.__bqOpenLightboxPool) window.__bqOpenLightboxPool(pool, items.indexOf(item));
    });
  }

  /* Play video on card hover (event delegation survives masonry re-layout) */
  grid.addEventListener('mouseover', e => {
    const card = e.target.closest('.card--photo');
    const vid  = card?.querySelector('video');
    if (vid && !vid.src && vid.dataset.src) {
      vid.src = vid.dataset.src;
      vid.load();
    }
    if (vid && vid.paused) vid.play().catch(() => {});
  });
  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.card--photo');
    const vid  = card?.querySelector('video');
    if (vid && !vid.paused) { vid.pause(); vid.currentTime = 0; }
  });

  /* Tab counts */
  syncGalleryCounts();

  /* Lightbox, then render the gallery via the masonry engine in main.js */
  if (window.__bqInitLightbox)  window.__bqInitLightbox();
  if (window.__bqRenderGallery) window.__bqRenderGallery(true);

  /* ---- relocalize every card + certificate label on language switch ---- */
  window.__bqRelocalizeGallery = () => {
    (window.BQ_ALL_CARDS || []).forEach(entry => {
      const card = entry.el; if (!card) return;
      const coll = card.dataset.coll; if (!coll) return;
      const title = galTitle(coll, card.dataset.idx, '');
      card.dataset.title = title;
      const tg = card.querySelector('.card-tag');
      if (tg) tg.textContent = galTag(coll, '');
      const tt = card.querySelector('.card-title'); if (tt) tt.textContent = title;
      const open = card.querySelector('.card-open'); if (open) open.setAttribute('aria-label', galViewLabel(title));
      const media = card.querySelector('img, video');
      if (media) { if (media.tagName === 'IMG') media.alt = title; else media.title = title; }
    });
    document.querySelectorAll('#certGrid .cert-item').forEach(div => {
      const title = galTitle('certificate', div.dataset.idx, 'Certificate');
      div.dataset.title = title;
      const lbl = div.querySelector('.cert-label'); if (lbl) lbl.textContent = title;
      const img = div.querySelector('img'); if (img) img.alt = title;
    });
  };
  window.__bqLangCb = window.__bqLangCb || [];
  window.__bqLangCb.push(() => window.__bqRelocalizeGallery());

  /* ── WorkWith: real images in marquee ── */
  const marqueeTrack = document.querySelector('.logo-marquee-track');
  if (marqueeTrack) {
    const CDN = window.BQ_GALLERY.CDN_BASE;
    const wLogos = Array.from({length:16}, (_,i) =>
      `${CDN}/WorkWith/WorkLogo${i+1}.webp`);
    const all = [...wLogos, ...wLogos]; // duplicate for seamless loop
    marqueeTrack.innerHTML = all.map(src =>
      `<div class="logo-chip logo-chip--img">
         <img src="${src}" alt="" loading="lazy" decoding="async" width="180" height="135" />
       </div>`
    ).join('');
    /* The local thumbnail bundle does not contain WorkWith; use the canonical
       CDN asset directly so the marquee never starts with a guaranteed 404. */
    marqueeTrack.querySelectorAll('img').forEach(img =>
      img.addEventListener('error', () => img.closest('.logo-chip')?.remove())
    );
  }

  /* ── TickerLogo: B/W marks in Designed by hand grid ── */
  const logosGrid = document.querySelector('.logos-grid');
  if (logosGrid) {
    const logos = (window.BQ_GALLERY.items('tickerlogo') || []).slice(0, 8);
    logosGrid.removeAttribute('aria-busy');
    logosGrid.removeAttribute('data-logos-empty');
    logosGrid.innerHTML = logos.map((item, idx) => {
      const src = item.url;
      return `<div class="logo-mark logo-mark--img logo-mark--ticker" data-full="${src}">
         <img src="${window.BQ_GALLERY.thumb(src, 180)}" data-full="${src}" data-raw="${item.rawUrl}" alt="Logo ${idx + 1}" loading="lazy" decoding="async" width="180" height="135" />
       </div>`
    }).join('');
    logosGrid.querySelectorAll('img').forEach(img =>
      img.addEventListener('error', () => {
        if (img.dataset.full && img.src !== img.dataset.full) { img.src = img.dataset.full; return; }
        if (img.dataset.raw && img.src !== img.dataset.raw) { img.src = img.dataset.raw; return; }
        img.closest('.logo-mark')?.remove();
      })
    );
    logosGrid.addEventListener('click', e => {
      const mark = e.target.closest('.logo-mark--img');
      if (!mark || !window.__bqOpenLightboxPool) return;
      const all   = [...logosGrid.querySelectorAll('.logo-mark--img')];
      const pool  = all.map(m => ({ full: m.dataset.full, title: '', type: 'image' }));
      window.__bqOpenLightboxPool(pool, all.indexOf(mark));
    });
  }
});


/* A repo image added after the last thumbnail build has no local thumb yet —
   swap the broken grid image to the weserv proxy once. */
document.addEventListener('error', function (ev) {
  var img = ev.target;
  if (!img || img.tagName !== 'IMG' || img.dataset.wsvTried) return;
  if ((img.getAttribute('src') || '').indexOf('assets/thumbs/') !== 0) return;
  var card = img.closest ? img.closest('article') : null;
  var full = card && card.dataset.full;
  if (!full) return;
  img.dataset.wsvTried = '1';
  img.src = 'https://images.weserv.nl/?url=' + full.replace(/^https?:\/\//, '') + '&w=320&output=webp&q=66';
}, true);
