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
    tickerlogo:  { folder: 'TickerLogo',    prefix: 'TickerLogo',  ext: 'webp', count: 13,  cat: 'logo',        tag: 'Logo',          icon: 'fa-pen-nib',        title: 'Ticker Logo' },
    events:      { folder: 'EventandCon',   prefix: 'Event',       ext: 'webp', count: 16,  cat: 'events',      tag: 'Events',        icon: 'fa-calendar-day',   title: 'Event' },
    business:    { folder: 'Businesscard',  prefix: 'Bcard',       ext: 'webp', count: 11,  cat: 'stationery',  tag: 'Business Card', icon: 'fa-id-card',        title: 'Business Card' },
    invoices:    { folder: 'Invoice',       prefix: 'Invoice',     ext: 'webp', count: 12,  cat: 'stationery',  tag: 'Invoice',       icon: 'fa-file-invoice',   title: 'Invoice' },
    ai:          { folder: 'AI',            prefix: 'AI',          ext: 'webp', count: 0,   cat: 'ai',          tag: 'AI',            icon: 'fa-microchip',      title: 'AI' },
    image:       { folder: 'Photos',        prefix: 'Photo',       ext: 'webp', count: 147, cat: 'image',       tag: 'Photo',         icon: 'fa-camera',         title: 'Photo' },
    other:       { folder: 'Other',         prefix: 'Other',       ext: 'webp', count: 45,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Other' },
    certificate: { folder: 'Certificate',   prefix: 'Certificate', ext: 'webp', count: 16,  cat: 'certificate', tag: 'Certificate',   icon: 'fa-award',          title: 'Certificate' }, /* bio only */
    flex:        { folder: 'Flex',          prefix: 'Flex',        ext: 'webp', count: 13,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Flex' },
    video:       { folder: 'Videos',        prefix: 'Videos',      ext: 'mp4',  count: 30,  cat: 'video',       tag: 'Video',         icon: 'fa-video',          title: 'Video' },
  },

  /* Direct CDN url for a collection + 1-based index. If a live folder
     manifest was loaded it maps the index to the real filename; otherwise
     it falls back to the static prefix+number scheme. */
  url(coll, i) {
    const c = this.COLLECTIONS[coll];
    if (c.files && c.files[i - 1] != null)
      return `${this.CDN_BASE}/${c.folder}/${encodeURIComponent(c.files[i - 1])}`;
    return `${this.CDN_BASE}/${c.folder}/${c.prefix}${i}.${c.ext}`;
  },

  /* raw.githubusercontent fallback for the same item — used when jsDelivr
     hasn't cached a brand-new file yet, so freshly dropped work still shows. */
  rawUrl(coll, i) {
    const c = this.COLLECTIONS[coll];
    if (c.files && c.files[i - 1] != null)
      return `${this.RAW_BASE}/${c.folder}/${encodeURIComponent(c.files[i - 1])}`;
    return `${this.RAW_BASE}/${c.folder}/${c.prefix}${i}.${c.ext}`;
  },

  items(coll) {
    const c   = this.COLLECTIONS[coll];
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
        title:  `${c.title} ${String(i).padStart(2, '0')}`,
        titlePrefix: c.title,
        tag: c.tag, icon: c.icon,
      });
    }
    return out;
  },

  /* ── Auto-discover real folder contents from GitHub ───────────────────
     ONE call to the Git Trees API lists the whole repo, so dropping any
     image/video into a folder makes it appear on the site with NO code
     change and NO required filename pattern. Result is cached briefly per
     session; on any failure (offline / API rate-limit) it silently keeps
     the static counts above, so the gallery can never break. */
  async loadManifest() {
    if (this._loaded) return this._ok;
    this._loaded = true;
    const KEY = 'bq_gallery_tree_v1', TTL = 5 * 60 * 1000;   // 5-min freshness
    let paths = null;
    try {
      const hit = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (hit && Array.isArray(hit.paths) && (Date.now() - hit.t) < TTL) paths = hit.paths;
    } catch (e) {}
    if (!paths) {
      try {
        const ctrl  = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(
          `https://api.github.com/repos/${this.REPO}/git/trees/${this.BRANCH}?recursive=1`,
          { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } });
        clearTimeout(timer);
        if (r.ok) {
          const j = await r.json();
          if (j && Array.isArray(j.tree))
            paths = j.tree.filter(n => n.type === 'blob').map(n => n.path);
          if (paths) { try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), paths })); } catch (e) {} }
        }
      } catch (e) {}
    }
    if (!paths) return (this._ok = false);

    const IMG = /\.(webp|jpe?g|png|gif|avif|svg)$/i;
    const VID = /\.(mp4|webm|mov)$/i;
    const byFolder = {};
    for (const p of paths) {
      const slash = p.indexOf('/');
      if (slash < 0) continue;
      const folder = p.slice(0, slash);
      const file   = p.slice(slash + 1);
      if (file.indexOf('/') >= 0) continue;            // direct children only
      if (!IMG.test(file) && !VID.test(file)) continue;
      (byFolder[folder] || (byFolder[folder] = [])).push(file);
    }
    const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    for (const k of Object.keys(this.COLLECTIONS)) {
      const c = this.COLLECTIONS[k], list = byFolder[c.folder];
      if (list && list.length) { c.files = list.sort(nat); c.count = c.files.length; }
    }
    return (this._ok = true);
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

  /* Auto-discover real folder contents from GitHub (silent fallback to the
     static counts if it fails) BEFORE building, so new work shows itself. */
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

  const buildCard = (item) => {
    const article = document.createElement('article');
    article.className = 'card card--photo';
    const dispTag   = galTag(item.coll, item.tag);
    const dispTitle = galTitle(item.coll, item.index, item.titlePrefix || item.tag);
    article.dataset.cat   = item.cat;
    article.dataset.coll  = item.coll;
    article.dataset.idx   = item.index;
    article.dataset.full  = item.url;
    article.dataset.title = dispTitle;
    article.dataset.type  = item.type;

    const mediaHtml = item.type === 'video'
      ? `<video muted loop playsinline preload="none" src="${item.url}" title="${dispTitle}"></video>`
      : `<img loading="lazy" src="${item.url}" alt="${dispTitle}" />`;

    const playIcon = item.type === 'video' ? 'fa-play' : 'fa-magnifying-glass-plus';

    article.innerHTML = `
      <div class="card-art card-art--photo">
        ${mediaHtml}
        <div class="card-meta card-meta--ov">
          <span class="mono card-tag"><i class="fa-solid ${item.icon}"></i> ${dispTag}</span>
          <h3 class="card-title">${dispTitle}</h3>
          <span class="card-zoom-icon"><i class="fa-solid ${playIcon}"></i></span>
        </div>
      </div>`;

    /* On error try raw.githubusercontent once (covers brand-new files that
       jsDelivr hasn't cached yet); only then drop the card. */
    const media = article.querySelector('img, video');
    media.addEventListener('error', () => {
      if (item.rawUrl && !media.dataset.fb) { media.dataset.fb = '1'; media.src = item.rawUrl; return; }
      article.remove();
    });
    return article;
  };

  /* Build every card once into a shared array — main.js masonry handles
     placement, filtering, and pagination. certificate is bio-only. */
  const ORDER = [
    'general','official','book','image','logo','tickerlogo',
    'posters','social','events','business','invoices','ai',
    'flex','video','other'
  ];
  window.BQ_ALL_CARDS = [];
  const catCounts = {};
  ORDER.forEach(coll => {
    window.BQ_GALLERY.items(coll).forEach(it => {
      window.BQ_ALL_CARDS.push({ el: buildCard(it), cat: it.cat });
      catCounts[it.cat] = (catCounts[it.cat] || 0) + 1;
    });
  });

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
          <img loading="lazy" src="${item.url}" data-raw="${item.rawUrl}" alt="${dispTitle}" />
          <div class="cert-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        </div>
        <span class="mono cert-label">${dispTitle}</span>`;
      div.addEventListener('error', () => div.remove(), { once: true });
      certGrid.appendChild(div);
    });

    /* error fallback for cert images: raw.githubusercontent once, then drop */
    certGrid.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
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
    if (vid && vid.paused) vid.play().catch(() => {});
  });
  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.card--photo');
    const vid  = card?.querySelector('video');
    if (vid && !vid.paused) { vid.pause(); vid.currentTime = 0; }
  });

  /* Tab counts */
  const total = window.BQ_ALL_CARDS.length;
  const setCount = (filter, n) => {
    const tab = document.querySelector(`.tab[data-filter="${filter}"]`);
    const el  = tab?.querySelector('.tab-count');
    if (el) el.textContent = n >= 100 ? n : String(n).padStart(2, '0');
  };
  setCount('all', total);
  Object.entries(catCounts).forEach(([cat, n]) => setCount(cat, n));

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
      if (tg) { const ic = tg.querySelector('i'); const cls = ic ? ic.className : ''; tg.innerHTML = `<i class="${cls}"></i> ${galTag(coll, '')}`; }
      const tt = card.querySelector('.card-title'); if (tt) tt.textContent = title;
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
         <img src="${src}" alt="" loading="lazy" />
       </div>`
    ).join('');
    /* remove broken images */
    marqueeTrack.querySelectorAll('img').forEach(img =>
      img.addEventListener('error', () => img.closest('.logo-chip')?.remove())
    );
  }

  /* ── TickerLogo: real images in Designed by hand grid ── */
  const logosGrid = document.querySelector('.logos-grid');
  if (logosGrid) {
    const CDN  = window.BQ_GALLERY.CDN_BASE;
    const idxs = [2,3,5,6,9,10,12,13];
    logosGrid.innerHTML = idxs.map(i =>
      `<div class="logo-mark logo-mark--img" data-full="${CDN}/TickerLogo/TickerLogo${i}.webp">
         <img src="${CDN}/TickerLogo/TickerLogo${i}.webp" alt="Logo ${i}" loading="lazy" />
       </div>`
    ).join('');
    logosGrid.querySelectorAll('img').forEach(img =>
      img.addEventListener('error', () => img.closest('.logo-mark')?.remove())
    );
    /* lightbox for ticker logos */
    logosGrid.addEventListener('click', e => {
      const mark = e.target.closest('.logo-mark--img');
      if (!mark || !window.__bqOpenLightboxPool) return;
      const all   = [...logosGrid.querySelectorAll('.logo-mark--img')];
      const pool  = all.map(m => ({ full: m.dataset.full, title: '', type: 'image' }));
      window.__bqOpenLightboxPool(pool, all.indexOf(mark));
    });
  }
});
