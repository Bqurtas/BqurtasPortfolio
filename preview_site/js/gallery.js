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
  _manifestPromise: null,

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

  /* Gallery cards use local thumbnails; the lightbox keeps the original. */
  thumb(url, w) {
    /* A missing local thumbnail falls back to its canonical original through
       the element's single, bounded error handler. */
    const base = url.indexOf(this.RAW_BASE) === 0 ? this.RAW_BASE
               : (url.indexOf(this.CDN_BASE) === 0 ? this.CDN_BASE : null);
    if (base) return 'assets/thumbs/' + url.slice(base.length + 1);
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, '')) + '&w=' + (Number(w) || 320) + '&output=webp&q=66';
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
    const n   = Array.isArray(c.files) ? c.files.length : c.count;
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
  async loadManifest({ force = false } = {}) {
    // Concurrent callers must wait for the same manifest, not build from the
    // static catalogue while the first request is still in flight.
    if (this._manifestPromise) return this._manifestPromise;
    if (this._loaded && !force) return this._ok;
    this._manifestPromise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
      const response = await fetch('assets/gallery-manifest.json?v=403', {
        cache: force ? 'reload' : 'no-cache', signal: controller.signal,
      });
      if (!response.ok) throw new Error('gallery manifest unavailable');
      const manifest = await response.json();
      if (!Array.isArray(manifest.images) || !Array.isArray(manifest.videos)) {
        throw new Error('invalid gallery manifest');
      }
      const records = [...manifest.images, ...manifest.videos];
      const byFolder = Object.create(null);
      const knownFolders = new Set(Object.values(this.COLLECTIONS).map(c => c.folder));
      const seen = new Set();
      records.forEach((record) => {
        if (!record || typeof record.path !== 'string' || seen.has(record.path) ||
            !Number.isFinite(record.width) || record.width <= 0 ||
            !Number.isFinite(record.height) || record.height <= 0) return;
        const slash = record.path.indexOf('/');
        if (slash < 0 || record.path.indexOf('/', slash + 1) >= 0) return;
        const folder = record.path.slice(0, slash);
        const file = record.path.slice(slash + 1);
        if (!knownFolders.has(folder) || !/^[^\\/]+\.(webp|png|jpe?g|avif|gif|mp4|webm|mov)$/i.test(file)) return;
        seen.add(record.path);
        (byFolder[folder] || (byFolder[folder] = [])).push({
          file,
          width: record.width,
          height: record.height,
        });
      });
      if (records.length && !seen.size) throw new Error('gallery manifest has no valid media');
      for (const key of Object.keys(this.COLLECTIONS)) {
        const collection = this.COLLECTIONS[key];
        const list = byFolder[collection.folder] || [];
        collection.files = list.map((record) => record.file);
        collection.dimensions = Object.fromEntries(list.map((record) => [record.file, record]));
        collection.count = collection.files.length;
      }
      this._loaded = true;
      return (this._ok = true);
      } catch (e) {
        // Keep a previously loaded catalogue usable during a transient outage.
        return this._ok;
      } finally {
        clearTimeout(timeout);
      }
    })();
    try { return await this._manifestPromise; }
    finally { this._manifestPromise = null; }
  },

  /* Every fallback is attempted at most once. One owner per media element
     avoids capture/bubble error handlers fighting over the next URL. */
  bindMediaFallback(media, sources, onExhausted) {
    const attempted = new Set();
    const normalize = (src) => {
      try { const url = new URL(src, document.baseURI); url.hash = ''; return url.href; }
      catch (e) { return String(src || '').split('#')[0]; }
    };
    const advance = () => {
      attempted.add(normalize(media.currentSrc || media.src));
      const next = sources.find(src => src && !attempted.has(normalize(src)));
      if (next) {
        attempted.add(normalize(next));
        media.src = next;
      } else if (!media.dataset.mediaExhausted) {
        media.dataset.mediaExhausted = 'true';
        onExhausted?.();
      }
    };
    media.addEventListener('error', advance);
    return () => media.removeEventListener('error', advance);
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
  const unavailableLabel = () => ({
    ku: 'پێشبینین بەردەست نییە', ar: 'المعاينة غير متاحة', kmr: 'Pêşdîtin ne berdest e',
    fr: 'Aperçu indisponible', tr: 'Önizleme kullanılamıyor', sv: 'Förhandsvisning saknas',
  }[galLang()] || 'Preview unavailable');
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
          if (!entry.isIntersecting) { entry.target.pause(); return; }
          hydrateVideo(entry.target);
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
          ${item.type === 'video' ? '<span class="card-video-badge" aria-hidden="true"><i class="fa-solid fa-play"></i></span>' : ''}
          <span class="card-hover-shade" aria-hidden="true"></span>
        </span>
      </button>
      <div class="card-caption">
        <h3 class="card-title">${dispTitle}</h3>
        <span class="card-tag">${dispTag}</span>
      </div>`;

    /* Preserve the catalogue and masonry position even if a CDN is down. */
    const media = article.querySelector('img, video');
    const markReady = () => article.classList.add('card--media-ready');
    media.addEventListener('load', markReady);
    media.addEventListener('loadeddata', markReady);
    if (media.tagName === 'IMG' && media.complete && media.naturalHeight) markReady();
    window.BQ_GALLERY.bindMediaFallback(media, [item.url, item.rawUrl], () => {
      article.classList.add('card--media-error');
      article.classList.remove('card--media-ready');
      if (videoWatcher && media.tagName === 'VIDEO') videoWatcher.unobserve(media);
      const status = document.createElement('span');
      status.className = 'card-media-status';
      status.textContent = unavailableLabel();
      article.querySelector('.card-art').appendChild(status);
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
    Object.entries(window.BQ_GALLERY.COLLECTIONS || {}).forEach(([key, coll]) => {
      if (coll) cats[coll.cat || key] = 0;
    });
    if (Array.isArray(window.BQ_ALL_CARDS)) {
      window.BQ_ALL_CARDS.forEach(entry => {
        if (!entry || !entry.cat) return;
        cats[entry.cat] = (cats[entry.cat] || 0) + 1;
      });
    } else {
      Object.entries(window.BQ_GALLERY.COLLECTIONS || {}).forEach(([key, coll]) => {
        if (coll) cats[coll.cat || key] += Array.isArray(coll.files) ? coll.files.length : (coll.count || 0);
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
    await window.BQ_GALLERY.loadManifest({ force: true });
    (window.BQ_ALL_CARDS || []).forEach(entry => entry.el?.querySelector('video')?.pause());
    videoWatcher?.disconnect();
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
      const div = document.createElement('button');
      const dispTitle = galTitle('certificate', item.index, item.titlePrefix);
      div.type = 'button';
      div.className = 'cert-item';
      div.dataset.coll  = 'certificate';
      div.dataset.idx   = item.index;
      div.dataset.full  = item.url;
      div.dataset.title = dispTitle;
      div.dataset.type  = 'image';
      div.setAttribute('aria-label', galViewLabel(dispTitle));
      div.innerHTML = `
        <span class="cert-img-wrap">
          <img loading="lazy" decoding="async" width="${item.width || 640}" height="${item.height || 880}" src="${window.BQ_GALLERY.thumb(item.url, 320)}" data-full="${item.url}" data-raw="${item.rawUrl}" alt="${dispTitle}" />
          <span class="cert-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
        </span>
        <span class="mono cert-label">${dispTitle}</span>`;
      certGrid.appendChild(div);
    });

    /* error fallback for cert images: raw.githubusercontent once, then drop */
    certGrid.querySelectorAll('img').forEach(img => {
      window.BQ_GALLERY.bindMediaFallback(img, [img.dataset.full, img.dataset.raw], () => {
        img.closest('.cert-item')?.remove();
      });
    });

    /* open lightbox on cert click */
    certGrid.addEventListener('click', e => {
      const item = e.target.closest('.cert-item');
      if (!item) return;
      const items = [...certGrid.querySelectorAll('.cert-item')];
      const pool  = items.map(el => ({
        full: el.dataset.full, title: el.dataset.title, type: 'image', sourceEl: el,
      }));
      if (window.__bqOpenLightboxPool) window.__bqOpenLightboxPool(pool, items.indexOf(item));
    });
  }

  /* Play video on card hover (event delegation survives masonry re-layout) */
  const hoverMotion = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  grid.addEventListener('mouseover', e => {
    if (!hoverMotion.matches || navigator.connection?.saveData) return;
    const card = e.target.closest('.card--photo');
    if (!card || card.contains(e.relatedTarget)) return;
    const vid  = card?.querySelector('video');
    if (!vid || vid.dataset.mediaExhausted) return;
    hydrateVideo(vid);
    if (vid.paused) vid.play().catch(() => {});
  });
  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.card--photo');
    if (!card || card.contains(e.relatedTarget)) return;
    const vid  = card?.querySelector('video');
    if (vid) vid.pause();
  });
  const pausePreviews = () => (window.BQ_ALL_CARDS || []).forEach(entry => entry.el?.querySelector('video')?.pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausePreviews(); });
  document.addEventListener('bq:route', pausePreviews);
  document.addEventListener('bq:lightbox-open', pausePreviews);
  hoverMotion.addEventListener?.('change', () => { if (!hoverMotion.matches) pausePreviews(); });

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
      const status = card.querySelector('.card-media-status');
      if (status) status.textContent = unavailableLabel();
    });
    document.querySelectorAll('#certGrid .cert-item').forEach(div => {
      const title = galTitle('certificate', div.dataset.idx, 'Certificate');
      div.dataset.title = title;
      const lbl = div.querySelector('.cert-label'); if (lbl) lbl.textContent = title;
      const img = div.querySelector('img'); if (img) img.alt = title;
      div.setAttribute('aria-label', galViewLabel(title));
    });
    document.querySelectorAll('.logos-grid .logo-mark--ticker').forEach(mark => {
      const title = galTitle('tickerlogo', mark.dataset.idx, 'Ticker Logo');
      mark.dataset.title = title;
      mark.setAttribute('aria-label', galViewLabel(title));
      const img = mark.querySelector('img'); if (img) img.alt = title;
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
      /* Same localized name the cards get, so the label, the alt text and the
         lightbox caption all read in the visitor's language — and so the
         relocalize pass below can find and update them on a language switch. */
      const title = galTitle('tickerlogo', idx + 1, 'Ticker Logo');
      return `<button type="button" class="logo-mark logo-mark--img logo-mark--ticker" data-full="${src}" data-coll="tickerlogo" data-idx="${idx + 1}" data-title="${title}" aria-label="${galViewLabel(title)}">
         <img src="${window.BQ_GALLERY.thumb(src, 180)}" data-full="${src}" data-raw="${item.rawUrl}" alt="${title}" loading="lazy" decoding="async" width="180" height="135" />
       </button>`
    }).join('');
    logosGrid.querySelectorAll('img').forEach(img =>
      window.BQ_GALLERY.bindMediaFallback(img, [img.dataset.full, img.dataset.raw], () => {
        img.closest('.logo-mark')?.remove();
      })
    );
    logosGrid.addEventListener('click', e => {
      const mark = e.target.closest('.logo-mark--img');
      if (!mark || !window.__bqOpenLightboxPool) return;
      const all   = [...logosGrid.querySelectorAll('.logo-mark--img')];
      const pool  = all.map(m => ({ full: m.dataset.full, title: m.dataset.title || '', type: 'image', sourceEl: m }));
      window.__bqOpenLightboxPool(pool, all.indexOf(mark));
    });
  }
});
