/* =========================================================
   Barakat Qurtas — main.js (v3)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- THEME (dark / light) — toggle switch ---------- */
  const themeBtns = [document.getElementById('themeToggle'), document.getElementById('themeToggleM')].filter(Boolean);
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('bq_theme', t); } catch(e){}
    themeBtns.forEach(b => b.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false'));
  };
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('bq_theme'); } catch(e){}
  applyTheme(savedTheme || 'light');
  themeBtns.forEach(btn => btn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }));

  /* ---------- LANGUAGE — hover menu in rail + click on mobile ---------- */
  const langCodeMap = { en: 'EN', ku: 'کو', kmr: 'Ku', ar: 'ع', fr: 'FR' };
  const langLabelMap = { en: 'English', ku: 'کوردیی سۆرانی', kmr: 'Kurmancî', ar: 'العربية', fr: 'Français' };

  const setLangBadge = (lang) => {
    const codeEl = document.getElementById('langCurrentCode');
    const codeMEl = document.getElementById('langCurrentCodeM');
    if (codeEl) codeEl.textContent = langCodeMap[lang] || 'EN';
    if (codeMEl) codeMEl.textContent = langCodeMap[lang] || 'EN';
    // mark active state in flyout
    document.querySelectorAll('.lang-opt').forEach(o => {
      o.classList.toggle('is-active', o.dataset.lang === lang);
    });
    document.querySelectorAll('.mobile-lang, .footer-lang').forEach(o => {
      o.classList.toggle('is-active', o.dataset.lang === lang);
    });
  };

  // Pick up the wrapped applyLang and extend it
  let currentLang = 'en';
  let routerReady = false;                       // URL syncing only once the router is live
  const URL_LANGS = ['ku', 'kmr', 'ar', 'fr'];   // en has no prefix
  const setDocTitle = () => {
    const d = window.BQ_DICT || {};
    const room = document.body.dataset.room || 'design';
    const t = d['meta.title.' + room];
    if (t) document.title = t;
  };
  const originalApplyLang = window.applyLang;
  window.applyLang = function(lang) {
    originalApplyLang(lang);
    currentLang = lang;
    setLangBadge(lang);
    setDocTitle();
    if (routerReady) syncURL(false);             // keep the /lang prefix in the address bar
    if (window.__bqRerenderChrome) window.__bqRerenderChrome();
    if (window.__bqRenderActiveHonor) window.__bqRenderActiveHonor();
  };

  // Bind all language option buttons (rail flyout, mobile, footer)
  document.querySelectorAll('[data-lang]').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      const l = opt.dataset.lang;
      window.applyLang(l);
    });
  });

  // Mobile language button cycles open the mobile menu
  const langToggleM = document.getElementById('langToggleM');
  langToggleM?.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.toggle('is-open');
  });

  // Initial language: ALWAYS English by default — only a /lang prefix in the
  // URL (a shared localized link) switches it. Switching in-session updates
  // the URL, so a reload keeps the chosen language without defaulting to it.
  const urlLang0 = location.pathname.replace(/^\/+/, '').split('/')[0];
  window.applyLang(URL_LANGS.includes(urlLang0) ? urlLang0 : 'en');

  /* ---------- ROUTER (room switcher + deep-links) ---------- */
  const rooms = document.querySelectorAll('.room');
  const routeLinks = document.querySelectorAll('[data-route]');
  const validRooms = ['design','blog','bio','contact'];

  let triggerReveals = () => {};
  let moveUnderline  = () => {};

  // Each room — and each Design tab — is its own shareable URL (real path),
  // optionally language-prefixed so a shared link carries its own cover:
  //   /design · /design/logo · /blog · /ku/blog · /ar/design/logo · /fr/bio
  // Legacy hash links (#blog) are still understood on first load.
  const parseRoute = () => {
    let raw = location.pathname.replace(/^\/+|\/+$/g, '');
    if (!raw && location.hash) raw = location.hash.replace(/^#/, '');
    let seg = raw.split('/');
    if (URL_LANGS.includes(seg[0])) seg = seg.slice(1);
    return { room: seg[0], tab: seg[1] };
  };
  const syncURL = (push) => {
    const room = document.body.dataset.room || 'design';
    const prefix = (currentLang && currentLang !== 'en') ? '/' + currentLang : '';
    let path;
    if (room === 'design') {
      path = (currentFilter && currentFilter !== 'all') ? prefix + '/design/' + currentFilter : (prefix || '/');
    } else {
      path = prefix + '/' + room;
    }
    if ((location.pathname.replace(/\/+$/, '') || '/') === path) return;
    try {
      if (push) history.pushState(null, '', path);
      else      history.replaceState(null, '', path);
    } catch(e){}
  };

  const showRoom = (id, push) => {
    rooms.forEach(r => r.classList.toggle('is-hidden', r.id !== id));
    document.querySelectorAll('.rail-link, .mobile-link').forEach(l => {
      l.classList.toggle('is-active', l.dataset.route === id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.body.dataset.room = id;
    document.querySelectorAll('.reveal').forEach(el => el.classList.remove('is-in'));
    requestAnimationFrame(() => triggerReveals());
    syncURL(push);
    setDocTitle();
    document.getElementById('mobileMenu')?.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  window.__bqShowRoom = showRoom;

  routeLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      const route = a.dataset.route;
      if (!route) return;
      // allow language buttons to keep their own behavior — they don't have data-route
      e.preventDefault();
      showRoom(route, true);
    });
  });

  // Browser back/forward + pasted deep-links
  window.addEventListener('popstate', () => {
    const { room, tab } = parseRoute();
    const r = validRooms.includes(room) ? room : 'design';
    if (document.body.dataset.room !== r) showRoom(r, false);
    if (r === 'design') {
      const want = tab || 'all';
      if (currentFilter !== want) {
        const t = document.querySelector(`.tab[data-filter="${want}"]`);
        if (t) activateTab(t, false);
      }
    }
  });

  /* ---------- MOBILE MENU (full-screen overlay) ---------- */
  const menuBtn = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    mobileMenu?.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setMenu(!mobileMenu?.classList.contains('is-open')));
  document.getElementById('mobileMenuClose')?.addEventListener('click', () => setMenu(false));

  /* ---------- TABS + PAGINATION + SECTION HEADER ---------- */
  const tabs = document.querySelectorAll('.tab');
  const PAGE_SIZE = 35;
  let currentFilter = 'all';
  let currentShown  = 0;

  const TAB_META = {
    all:      { title: 'All Work',        desc: 'The full catalogue — every discipline, one practice.',                  note: 'By Barakat Qurtas · Hewlêr, Kurdistan' },
    official: { title: 'Official',        desc: 'Editorial design for the Presidency of the Kurdistan Region.',          note: 'Kurdistan Region Presidency · 2021—Present' },
    book:     { title: 'Book Covers',     desc: 'Typography, illustration, and print composition.',                       note: 'Nawroz Press & independent publishers · 2014—Now' },
    image:    { title: 'Photography',     desc: 'Lightroom editing, composites, and editorial retouching.',               note: 'Erbil & Kurdistan Region · 2018—Now' },
    logo:     { title: 'Logos',           desc: 'Marks, wordmarks, and visual identities — a decade of drawn signs.',    note: '2014—2025 · Various clients' },
    posters:  { title: 'Posters',         desc: 'Cultural, political, and typographic poster series.',                   note: 'Series · Erbil & Kurdistan Region' },
    social:   { title: 'Social Media',    desc: 'Instagram grids, campaigns, and digital storytelling.',                 note: '2023—Now · Various brands' },
    events:   { title: 'Events',          desc: 'Ceremony materials, banners, and event identity design.',                note: 'Conferences & cultural events · KRG' },
    business: { title: 'Business Cards',  desc: 'Personal and client stationery — both sides of the conversation.',      note: '2024 · Print-ready' },
    invoices: { title: 'Invoices',        desc: 'Stationery systems — letterhead, invoice, and receipt.',                note: '2024 · Various clients' },
    video:    { title: 'Video',           desc: 'Documentary edits, motion reels, and protocol media coverage.',         note: '2019—Now · KRG official media' },
    other:    { title: 'Other Works',     desc: 'Miscellaneous — flex banners, type experiments, and notes.',            note: 'Always ongoing' },
  };

  const getTabMeta = () =>
    (window.TAB_META_I18N && window.TAB_META_I18N[currentLang]) ||
    (window.TAB_META_I18N && window.TAB_META_I18N.en) || TAB_META;

  const updateTabHeader = (filter, total) => {
    const tm    = getTabMeta();
    const meta  = tm[filter] || tm.all;
    const title = document.getElementById('tabHeaderTitle');
    const desc  = document.getElementById('tabHeaderDesc');
    const note  = document.getElementById('tabHeaderNote');
    const ghost = document.getElementById('tabHeaderGhost');
    if (!title) return;
    title.classList.add('anim-out');
    setTimeout(() => {
      title.textContent = meta.title;
      if (desc)  desc.textContent  = meta.desc;
      if (note)  note.textContent  = meta.note;
      if (ghost) ghost.textContent = total;
      title.classList.remove('anim-out');
      title.classList.add('anim-in');
    }, 160);
  };

  const updateLoadMore = (total) => {
    const wrap = document.getElementById('loadMoreWrap');
    const info = document.getElementById('loadMoreInfo');
    const fill = document.getElementById('loadMoreFill');
    const btn  = document.getElementById('loadMoreBtn');
    const btnT = document.getElementById('loadMoreBtnText');
    if (!wrap) return;
    const remaining = total - currentShown;
    const pct = total > 0 ? Math.round(currentShown / total * 100) : 100;
    wrap.style.display = total > 0 ? 'flex' : 'none';
    if (fill) fill.style.width = pct + '%';
    const d = window.BQ_DICT || {};
    const infoT = d['lm.info'] || '{shown} / {total} — {rem} remaining';
    const loadT = d['lm.load'] || 'Load {n} more';
    if (info) info.textContent = infoT.replace('{shown}', currentShown).replace('{total}', total).replace('{rem}', remaining);
    if (btn)  btn.style.display = remaining > 0 ? 'inline-flex' : 'none';
    if (btnT) btnT.textContent  = loadT.replace('{n}', Math.min(remaining, PAGE_SIZE));
    // Show-less / collapse appear once the viewer has loaded past the first batch
    const less = document.getElementById('loadLessBtn');
    const coll = document.getElementById('loadCollapseBtn');
    const canCollapse = currentShown > PAGE_SIZE;
    if (less) less.style.display = canCollapse ? 'inline-flex' : 'none';
    if (coll) coll.style.display = canCollapse ? 'inline-flex' : 'none';
  };

  /* Re-render the grid showing exactly `n` cards (used by show-less/collapse). */
  const renderUpTo = (n) => {
    if (!gridEl) return;
    buildColumns(colCountForWidth());
    const matching = matchingCards();
    const target = Math.max(0, Math.min(n, matching.length));
    matching.slice(0, target).forEach(e => placeCard(e.el));
    currentShown = target;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
  };
  const scrollToGridTop = () => {
    const head = document.getElementById('tabHeader') || gridEl;
    head?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.__bqShowFewer  = () => { renderUpTo(Math.max(PAGE_SIZE, currentShown - PAGE_SIZE)); scrollToGridTop(); };
  window.__bqCollapseAll = () => { renderUpTo(PAGE_SIZE); scrollToGridTop(); };

  /* ===== JS MASONRY =====
     Cards are placed into column containers; each new card goes to the
     currently shortest column. Existing cards never move, so "Load more"
     always appends BELOW — the viewer scrolls down, never back up. */
  const gridEl = document.getElementById('grid');
  let mCols = [];      // column DOM elements
  let mHeights = [];   // tracked pixel heights (estimate + correction)
  const CARD_EST = 340;

  const colCountForWidth = () => {
    const w = window.innerWidth;
    if (w <= 560)  return 2;
    if (w <= 820)  return 3;
    if (w <= 1100) return 4;
    return 6;
  };

  const buildColumns = (n) => {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    mCols = []; mHeights = [];
    for (let i = 0; i < n; i++) {
      const col = document.createElement('div');
      col.className = 'grid-col';
      gridEl.appendChild(col);
      mCols.push(col);
      mHeights.push(0);
    }
  };

  const placeCard = (card) => {
    const heights = mHeights, cols = mCols;       // capture current layout refs
    let i = 0;
    for (let k = 1; k < heights.length; k++) if (heights[k] < heights[i]) i = k;
    cols[i].appendChild(card);
    heights[i] += CARD_EST;

    const media = card.querySelector('img, video');
    const correct = () => {
      if (heights !== mHeights) return;           // layout was rebuilt — ignore
      heights[i] += (card.offsetHeight + 8) - CARD_EST;
    };
    if (media) {
      if (media.complete && media.naturalHeight) correct();
      else media.addEventListener('load', correct, { once: true });
      media.addEventListener('loadeddata', correct, { once: true });
    }

    /* reveal */
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = 'none';
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out)';
      card.style.opacity = '1';
      card.style.transform = 'none';
    });
  };

  const matchingCards = () =>
    (window.BQ_ALL_CARDS || []).filter(e => currentFilter === 'all' || e.cat === currentFilter);

  /* render the gallery. reset=true rebuilds columns (tab switch / resize). */
  window.__bqRenderGallery = (reset) => {
    if (!gridEl) return;
    if (reset) { buildColumns(colCountForWidth()); currentShown = 0; }
    const matching = matchingCards();
    const batch = matching.slice(currentShown, currentShown + PAGE_SIZE);
    batch.forEach(e => placeCard(e.el));
    currentShown += batch.length;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
  };

  // Re-translate the tab header + load-more in place when the language flips
  window.__bqRerenderChrome = () => {
    if (!gridEl) return;
    const total = matchingCards().length;
    updateTabHeader(currentFilter, total);
    updateLoadMore(total);
  };

  const activateTab = (tab, push) => {
    tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    currentFilter = tab.dataset.filter;
    window.__bqRenderGallery(true);
    if (push !== false) syncURL(!!push);
  };

  /* re-layout on width change (column count change) */
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!gridEl || !mCols.length) return;
      if (colCountForWidth() === mCols.length) return;
      const shown = currentShown;
      buildColumns(colCountForWidth());
      currentShown = 0;
      matchingCards().slice(0, shown).forEach(e => { placeCard(e.el); currentShown++; });
      updateLoadMore(matchingCards().length);
    }, 200);
  });

  /* Load more — appends to the bottom of the shortest columns */
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    window.__bqRenderGallery(false);
  });
  /* Show fewer (one batch) / collapse all the way back to the first batch */
  document.getElementById('loadLessBtn')?.addEventListener('click', () => window.__bqShowFewer());
  document.getElementById('loadCollapseBtn')?.addEventListener('click', () => window.__bqCollapseAll());

  tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab, true)));

  /* ---------- COUNT UP (statistics) ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.floor(eased * target);
      el.textContent = (v >= 1000 ? v.toLocaleString() : v) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- REVEAL on scroll ---------- */
  const markReveal = () => {
    /* .card visibility is handled entirely by activateTab pagination — excluded here */
    document.querySelectorAll('.blog-card, .tl-item, .bio-card, .honor, .lang-item, .orgs li, .service, .qc-card, .stat, .logo-mark, .logo-chip')
      .forEach(el => el.classList.add('reveal'));
  };
  markReveal();

  let io;
  triggerReveals = () => {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          if (e.target.classList.contains('stat')) {
            const numEl = e.target.querySelector('.stat-num');
            if (numEl && !numEl.dataset.counted) {
              numEl.dataset.counted = '1';
              animateCount(numEl);
            }
          }
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
  };

  // initial route — restore room AND the Design tab from the URL path/hash
  const { room: startRoomRaw, tab: startTab } = parseRoute();
  const startRoom = validRooms.includes(startRoomRaw) ? startRoomRaw : 'design';
  showRoom(startRoom);
  if (startRoom === 'design' && startTab) {
    const t0 = document.querySelector(`.tab[data-filter="${startTab}"]`);
    if (t0) activateTab(t0);
  }
  routerReady = true;   // from here on, language switches update the URL prefix
  triggerReveals();

  /* ---------- Expose helpers for gallery.js ---------- */
  window.__bqRefreshReveal = () => { triggerReveals(); };

  window.__bqInitLightbox = () => {
    if (document.getElementById('lbOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'lbOverlay';
    overlay.className = 'lb-overlay';
    overlay.innerHTML = `
      <div class="lb-img-wrap" id="lbWrap">
        <button class="lb-close" id="lbClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        <span class="lb-caption" id="lbCaption"></span>
      </div>
      <button class="lb-prev" id="lbPrev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="lb-next" id="lbNext" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
    `;
    document.body.appendChild(overlay);

    const wrap      = document.getElementById('lbWrap');
    const lbCaption = document.getElementById('lbCaption');
    let pool = [], cur = 0, lbMedia = null;

    const getPool = () => Array.from(document.querySelectorAll('#grid .card--photo:not(.is-hidden)'));

    const clearMedia = () => {
      if (lbMedia) {
        if (lbMedia.tagName === 'VIDEO') { lbMedia.pause(); lbMedia.src = ''; }
        lbMedia.remove();
        lbMedia = null;
      }
    };

    const show = (idx) => {
      pool = getPool();
      cur  = ((idx % pool.length) + pool.length) % pool.length;
      const card = pool[cur];
      const src  = card.dataset.full || '';
      const type = card.dataset.type || 'image';
      const title= card.dataset.title || '';

      clearMedia();

      if (type === 'video') {
        lbMedia = document.createElement('video');
        lbMedia.controls = true;
        lbMedia.autoplay  = true;
        lbMedia.src = src;
      } else {
        lbMedia = document.createElement('img');
        lbMedia.alt = title;
        lbMedia.style.opacity = '0';
        lbMedia.src = src;
        lbMedia.onload = () => { lbMedia.style.opacity = '1'; };
      }
      wrap.insertBefore(lbMedia, lbCaption);
      lbCaption.textContent = title;
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      clearMedia();
    };

    document.getElementById('lbClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.getElementById('lbPrev').addEventListener('click', () => show(cur - 1));
    document.getElementById('lbNext').addEventListener('click', () => show(cur + 1));
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('#grid .card--photo');
      if (!card) return;
      pool = getPool();
      const idx = pool.indexOf(card);
      show(idx >= 0 ? idx : 0);
    });

    /* Allow external callers (e.g. cert gallery) to open lightbox with a custom pool */
    window.__bqOpenLightboxPool = (items, startIdx) => {
      pool = items;
      cur  = ((startIdx % items.length) + items.length) % items.length;
      clearMedia();
      const item = pool[cur];
      lbMedia = document.createElement('img');
      lbMedia.alt = item.title || '';
      lbMedia.style.opacity = '0';
      lbMedia.src = item.full || '';
      lbMedia.onload = () => { lbMedia.style.opacity = '1'; };
      wrap.insertBefore(lbMedia, lbCaption);
      lbCaption.textContent = item.title || '';
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      /* override show for this pool so arrows navigate within it */
      const localShow = (i) => {
        cur = ((i % pool.length) + pool.length) % pool.length;
        clearMedia();
        const it = pool[cur];
        lbMedia = document.createElement('img');
        lbMedia.alt = it.title || '';
        lbMedia.style.opacity = '0';
        lbMedia.src = it.full || '';
        lbMedia.onload = () => { lbMedia.style.opacity = '1'; };
        wrap.insertBefore(lbMedia, lbCaption);
        lbCaption.textContent = it.title || '';
      };
      document.getElementById('lbPrev').onclick = () => localShow(cur - 1);
      document.getElementById('lbNext').onclick = () => localShow(cur + 1);
    };
  };

  /* ---------- INDEX LAYOUT (interactive hover preview) ---------- */
  /* highlight one word in the title with gold italic */
  const highlightTitle = (title) => {
    const words = title.split(' ');
    if (words.length < 2) return title;
    const i = Math.floor(words.length / 2);
    words[i] = `<span class="hl">${words[i]}</span>`;
    return words.join(' ');
  };

  const initIndex = (rootId, ghostId, render) => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const rows  = root.querySelectorAll('.index-row');
    const card  = root.querySelector('.index-card');
    const ghost = document.getElementById(ghostId);
    let swapTimer;

    const setPreview = (row) => {
      const d = row.dataset;
      card.classList.add('swapping');
      if (ghost) ghost.textContent = d.num;
      if (d.accent) card.style.background = d.accent;
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        render(d);
        card.classList.remove('swapping');
      }, 180);
    };
    const activate = (row) => {
      rows.forEach(r => r.classList.remove('is-active'));
      row.classList.add('is-active');
      setPreview(row);
    };
    rows.forEach(row => {
      row.addEventListener('mouseenter', () => activate(row));
      row.addEventListener('focus', () => activate(row));
      row.addEventListener('click', (e) => { e.preventDefault(); activate(row); });
    });
  };

  /* Blog index is rendered & paginated by enhance.js (window.__bqHighlightTitle reused there) */
  window.__bqHighlightTitle = highlightTitle;

  /* Honors index — language-aware preview card */
  const honorRender = (d) => {
    const dict = window.BQ_DICT || {};
    const tr = (window.HONORS_I18N && window.HONORS_I18N[currentLang] && window.HONORS_I18N[currentLang][d.num]) || null;
    const title = (tr && tr.title) || d.title;
    const sub   = (tr && tr.sub)   || d.sub;
    const tag   = (tr && tr.tag)   || d.tag;
    const loc   = (s) => (currentLang === 'ku' || currentLang === 'ar') ? String(s).replace(/[0-9]/g, x => '٠١٢٣٤٥٦٧٨٩'[x]) : String(s);
    const year  = d.date.split(' ').pop();
    const set = (id, v, html) => { const el = document.getElementById(id); if (el) { if (html) el.innerHTML = v; else el.textContent = v; } };
    set('hcVol',  (dict['hon.vol'] || 'AWARD №{num} · {year}').replace('{num}', loc(d.num)).replace('{year}', loc(year)));
    set('hcTitle', highlightTitle(title), true);
    set('hcSub',  sub);
    set('hcMeta', (dict['hon.issued'] || 'ISSUED BY {tag}').replace('{tag}', tag.toUpperCase()));
    set('hcBig',  `№ ${loc(d.num)}`);
    const ic = document.getElementById('hcIcon');
    if (ic && d.icon) ic.className = `fa-solid ${d.icon} index-card-icon`;
  };
  initIndex('honorsIndex', 'honorGhost', honorRender);
  const honorsRoot = document.getElementById('honorsIndex');
  window.__bqRenderActiveHonor = () => {
    if (!honorsRoot) return;
    const act = honorsRoot.querySelector('.index-row.is-active') || honorsRoot.querySelector('.index-row');
    if (act) honorRender(act.dataset);
  };
  window.__bqRenderActiveHonor();

  /* ---------- Pitch form ---------- */
  const form = document.getElementById('pitchForm');
  const status = document.getElementById('pitchStatus');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#pName').value.trim();
      const email = form.querySelector('#pEmail').value.trim();
      const type = form.querySelector('#pType').value;
      const message = form.querySelector('#pMessage').value.trim();
      if (!name || !email || !type || !message) {
        status.style.color = 'var(--ember)';
        status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please fill in name, email, project type, and message.';
        return;
      }
      const submissions = JSON.parse(localStorage.getItem('bq_pitches') || '[]');
      submissions.push({
        id: Date.now(),
        name, email, type, message,
        company: form.querySelector('#pCompany').value,
        phone:   form.querySelector('#pPhone').value,
        budget:  form.querySelector('#pBudget').value,
        timeline:form.querySelector('#pTimeline').value,
        hear:    form.querySelector('#pHear').value,
        nda:     form.querySelector('#pNDA').checked,
        at: new Date().toISOString()
      });
      try { localStorage.setItem('bq_pitches', JSON.stringify(submissions)); } catch(e){}

      const subject = encodeURIComponent(`Pitch — ${type} — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nCompany: ${form.querySelector('#pCompany').value}\nPhone: ${form.querySelector('#pPhone').value}\nProject type: ${type}\nBudget: ${form.querySelector('#pBudget').value}\nTimeline: ${form.querySelector('#pTimeline').value}\nHeard about: ${form.querySelector('#pHear').value}\nNDA: ${form.querySelector('#pNDA').checked ? 'Yes' : 'No'}\n\n---\n${message}`
      );
      window.location.href = `mailto:info@bqurtas.com?subject=${subject}&body=${body}`;

      status.style.color = 'var(--gold)';
      status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pitch prepared. Your mail client will open — or write directly to info@bqurtas.com.';
      form.reset();
    });
  }

  /* ---------- Custom Cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });
    const animateRing = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animateRing);
    };
    animateRing();
    document.body.addEventListener('mouseover', (e) => {
      /* Over gallery images: hide the custom cursor so the system zoom cursor
         stays clearly visible (it was getting lost over busy photos). */
      const overPhoto = e.target.closest('.card--photo, .cert-item');
      dot.style.opacity  = overPhoto ? '0' : '';
      ring.style.opacity = overPhoto ? '0' : '';

      if (e.target.closest('a, button, .tab, input, select, textarea, .qc-card, .blog-card, .service, .stat, .logo-mark, .logo-chip, .index-row')) {
        ring.classList.add('is-hover');
      } else {
        ring.classList.remove('is-hover');
      }
    });
  }
});
