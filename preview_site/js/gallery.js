/* =========================================================
   Barakat Qurtas — Dynamic Gallery
   Pulls images/videos from GitHub via jsDelivr CDN
   ========================================================= */

window.BQ_GALLERY = {

  CDN_BASE: 'https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main',

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
    business:    { folder: 'Businesscard',  prefix: 'Bcard',       ext: 'webp', count: 11,  cat: 'business',    tag: 'Business Card', icon: 'fa-id-card',        title: 'Business Card' },
    invoices:    { folder: 'Invoice',       prefix: 'Invoice',     ext: 'webp', count: 12,  cat: 'invoices',    tag: 'Invoice',       icon: 'fa-file-invoice',   title: 'Invoice' },
    image:       { folder: 'Photos',        prefix: 'Photo',       ext: 'webp', count: 147, cat: 'image',       tag: 'Photo',         icon: 'fa-camera',         title: 'Photo' },
    other:       { folder: 'Other',         prefix: 'Other',       ext: 'webp', count: 45,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Other' },
    certificate: { folder: 'Certificate',   prefix: 'Certificate', ext: 'webp', count: 16,  cat: 'certificate', tag: 'Certificate',   icon: 'fa-award',          title: 'Certificate' }, /* bio only */
    flex:        { folder: 'Flex',          prefix: 'Flex',        ext: 'webp', count: 13,  cat: 'other',       tag: 'Other',         icon: 'fa-ellipsis',       title: 'Flex' },
    video:       { folder: 'Videos',        prefix: 'Videos',      ext: 'mp4',  count: 30,  cat: 'video',       tag: 'Video',         icon: 'fa-video',          title: 'Video' },
  },

  url(coll, i) {
    const c = this.COLLECTIONS[coll];
    return `${this.CDN_BASE}/${c.folder}/${c.prefix}${i}.${c.ext}`;
  },

  items(coll) {
    const c   = this.COLLECTIONS[coll];
    const cat = c.cat || coll;
    const type = c.ext === 'mp4' ? 'video' : 'image';
    const out = [];
    for (let i = 1; i <= c.count; i++) {
      out.push({ coll, cat, index: i, type,
        url:   this.url(coll, i),
        title: `${c.title} ${String(i).padStart(2, '0')}`,
        tag: c.tag, icon: c.icon,
      });
    }
    return out;
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
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid');
  if (!grid) return;

  /* Remove loading spinner */
  const loader = document.getElementById('galleryLoading');
  if (loader) loader.remove();

  const buildCard = (item) => {
    const article = document.createElement('article');
    article.className = 'card card--photo';
    article.dataset.cat   = item.cat;
    article.dataset.idx   = item.index;
    article.dataset.full  = item.url;
    article.dataset.title = item.title;
    article.dataset.type  = item.type;

    const mediaHtml = item.type === 'video'
      ? `<video muted loop playsinline preload="none" src="${item.url}" title="${item.title}"></video>`
      : `<img loading="lazy" src="${item.url}" alt="${item.title}" />`;

    const playIcon = item.type === 'video' ? 'fa-play' : 'fa-magnifying-glass-plus';

    article.innerHTML = `
      <div class="card-art card-art--photo">
        ${mediaHtml}
        <div class="card-meta card-meta--ov">
          <span class="mono card-tag"><i class="fa-solid ${item.icon}"></i> ${item.tag}</span>
          <h3 class="card-title">${item.title}</h3>
          <span class="card-zoom-icon"><i class="fa-solid ${playIcon}"></i></span>
        </div>
      </div>`;

    /* drop the card if its file is missing (folders have sparse numbering) */
    const media = article.querySelector('img, video');
    media.addEventListener('error', () => article.remove(), { once: true });
    return article;
  };

  /* Build every card once into a shared array — main.js masonry handles
     placement, filtering, and pagination. certificate is bio-only. */
  const ORDER = [
    'general','official','book','image','logo','tickerlogo',
    'posters','social','events','business','invoices',
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
      div.className = 'cert-item';
      div.dataset.full  = item.url;
      div.dataset.title = item.title;
      div.dataset.type  = 'image';
      div.innerHTML = `
        <div class="cert-img-wrap">
          <img loading="lazy" src="${item.url}" alt="${item.title}" />
          <div class="cert-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        </div>
        <span class="mono cert-label">${item.title}</span>`;
      div.addEventListener('error', () => div.remove(), { once: true });
      certGrid.appendChild(div);
    });

    /* error fallback for cert images */
    certGrid.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => img.closest('.cert-item')?.remove());
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
