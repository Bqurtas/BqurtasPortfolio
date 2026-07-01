/* =========================================================
   Barakat Qurtas — main.js (v3)
   ========================================================= */

/* ---------- CSP-safe inline styling ----------
   The CSP has no 'unsafe-inline' in style-src, so HTML `style="…"` attributes
   are not used anywhere. Elements that need per-element styling carry a
   `data-css="prop:val;prop2:val2"` attribute instead, applied here via the
   CSSOM (element.style.setProperty) — which CSP does NOT gate. Runs once for the
   parsed DOM and watches for dynamically-rendered nodes (dashboard charts, work
   cards, brand board, blog reader). */
(function () {
  const applyCss = (el) => {
    const spec = el.getAttribute('data-css');
    if (!spec) return;
    spec.split(';').forEach((decl) => {
      const i = decl.indexOf(':');
      if (i < 0) return;
      const prop = decl.slice(0, i).trim();
      const val = decl.slice(i + 1).trim();
      if (prop) { try { el.style.setProperty(prop, val); } catch (e) {} }
    });
  };
  const scan = (node) => {
    if (!node || node.nodeType !== 1) return;
    if (node.hasAttribute('data-css')) applyCss(node);
    if (node.querySelectorAll) node.querySelectorAll('[data-css]').forEach(applyCss);
  };
  scan(document.documentElement);
  try {
    new MutationObserver((muts) => {
      muts.forEach((m) => m.addedNodes.forEach(scan));
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- THEME (dark / light) — toggle switch ---------- */
  const themeBtns = [document.getElementById('themeToggle'), document.getElementById('themeToggleM')].filter(Boolean);
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('bq_theme3', t); } catch(e){}
    themeBtns.forEach(b => b.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false'));
  };
  // Default is DARK now (a fresh key so an old saved 'light' pref doesn't override it).
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('bq_theme3'); } catch(e){}
  applyTheme(savedTheme || 'dark');
  themeBtns.forEach(btn => btn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }));

  /* ---------- LANGUAGE — hover menu in rail + click on mobile ---------- */
  const langCodeMap = { en: 'EN', ku: 'کو', kmr: 'Ku', ar: 'ع', fr: 'FR', tr: 'TR', sv: 'SV' };
  const langLabelMap = { en: 'English', ku: 'کوردیی سۆرانی', kmr: 'Kurmancî', ar: 'العربية', fr: 'Français', tr: 'Türkçe', sv: 'Svenska' };

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
  const URL_LANGS = ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];   // en has no prefix
  const setDocTitle = () => {
    const d = window.BQ_DICT || {};
    const room = document.body.dataset.room || 'design';
    const t = d['meta.title.' + room];
    if (t) document.title = t;
  };
  const roomLabelKeys = {
    design: 'nav.design',
    work: 'nav.work',
    brandboard: 'nav.brandboard',
    blog: 'nav.blog',
    bio: 'nav.bio',
    contact: 'nav.contact',
    panjamor: 'nav.panjamor'
  };
  const roomLabelFallbacks = {
    design: 'Design',
    work: 'Selected Work',
    brandboard: 'The Brand Board',
    blog: 'The Journal',
    bio: 'The Designer',
    contact: "Let's talk.",
    panjamor: 'Panjamor'
  };
  const setRoomChrome = (room) => {
    const key = roomLabelKeys[room] || roomLabelKeys.design;
    const label = (window.BQ_DICT && window.BQ_DICT[key]) || roomLabelFallbacks[room] || roomLabelFallbacks.design;
    const roomName = document.getElementById('railRoomName');
    if (roomName) {
      roomName.dataset.i18n = key;
      roomName.textContent = label;
    }
    document.documentElement.style.setProperty('--room-index', String(Math.max(0, Object.keys(roomLabelKeys).indexOf(room))));
  };
  const originalApplyLang = window.applyLang;
  window.applyLang = function(lang) {
    originalApplyLang(lang);
    currentLang = lang;
    setLangBadge(lang);
    setDocTitle();
    setRoomChrome(document.body.dataset.room || 'design');
    if (routerReady) { syncURL(false); try { if (window.umami) umami.track(); } catch (e) {} }   // Umami: count each language URL (replaceState isn't auto-tracked)
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
    const m = document.getElementById('mobileMenu');
    m?.classList.toggle('is-open');
    const nowOpen = !!m && m.classList.contains('is-open');
    document.body.classList.toggle('menu-open', nowOpen);   // keep body in sync — it hides .to-top
    if (nowOpen && window.__bqExclusive) window.__bqExclusive('menu');
  });

  // Initial language: ALWAYS English by default — only a /lang prefix in the
  // URL (a shared localized link) switches it. Switching in-session updates
  // the URL, so a reload keeps the chosen language without defaulting to it.
  const urlLang0 = location.pathname.replace(/^\/+/, '').split('/')[0];
  window.applyLang(URL_LANGS.includes(urlLang0) ? urlLang0 : 'en');

  /* ---------- ROUTER (room switcher + deep-links) ---------- */
  const rooms = document.querySelectorAll('.room');
  const routeLinks = document.querySelectorAll('[data-route]');
  const validRooms = ['design','work','brandboard','blog','bio','contact','panjamor'];

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
    // deep post/case URLs are owned by their readers — leave them intact on passive syncs
    if (!push && ((room === 'blog' && /\/blog\/[^/]+/.test(location.pathname)) || (room === 'work' && /\/work\/[^/]+/.test(location.pathname)))) return;
    if ((location.pathname.replace(/\/+$/, '') || '/') === path) return;
    try {
      if (push) history.pushState(null, '', path);
      else      history.replaceState(null, '', path);
    } catch(e){}
  };

  const showRoom = (id, push) => {
    rooms.forEach(r => r.classList.toggle('is-hidden', r.id !== id));
    document.querySelectorAll('.rail-link, .mobile-link, .mm-link').forEach(l => {
      l.classList.toggle('is-active', l.dataset.route === id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.body.dataset.room = id;
    setRoomChrome(id);
    document.querySelectorAll('.reveal').forEach(el => el.classList.remove('is-in'));
    requestAnimationFrame(() => triggerReveals());
    syncURL(push);
    setDocTitle();
    document.getElementById('mobileMenu')?.classList.remove('is-open');
    document.body.classList.remove('menu-open');   // body.menu-open force-hides .to-top — if it lingers, the button never comes back
    document.body.style.overflow = '';
    if (window.__bqToggleCta) window.__bqToggleCta();
    requestAnimationFrame(() => { if (window.__bqOnScroll) window.__bqOnScroll(); });   // refresh the back-to-top button on every room change
  };
  window.__bqShowRoom = showRoom;

  let roomTransitionTimer = null;
  const shouldDelayRoomSwapForCurtain = (id) => {
    if (!routerReady || !id || id === document.body.dataset.room) return false;
    if (!document.querySelector('.lux-transition')) return false;
    try {
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return true;
    }
  };
  const showRoomAfterTransitionCurtain = (id, push) => {
    if (roomTransitionTimer) return;
    if (!shouldDelayRoomSwapForCurtain(id)) {
      showRoom(id, push);
      return;
    }
    const curtainStarted = (typeof window.__bqPlayRoomCurtain === 'function') ? window.__bqPlayRoomCurtain(id) : true;
    if (!curtainStarted) {
      showRoom(id, push);
      return;
    }
    clearTimeout(roomTransitionTimer);
    document.body.classList.add('room-transition-pending');
    const coverMs = Number(window.__bqRouteCurtainCoverMs) || 680;
    roomTransitionTimer = setTimeout(() => {
      document.body.classList.remove('room-transition-pending');
      showRoom(id, push);
      roomTransitionTimer = null;
    }, coverMs);
  };
  window.__bqGoRoom = showRoomAfterTransitionCurtain;
  window.__bqShowRoomWithCurtain = showRoomAfterTransitionCurtain;

  /* Scroll-spy on the home / design page — the address bar reflects the section in view:
       hero (top)            → base   ( / or /<lang> )
       "Design Room" + works → /design   ( /design/<tab> when a tab is active )
       closing note → footer → base again (simple link)
     Each becomes a real shareable link (with its own cover). Other rooms keep their URL.
     Works for every language and section. */
  let __urlResetT;
  const __absTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  /* floating "let's work together" CTA — visible while browsing the Design room,
     hidden at the hero and once you reach the closing "A short note" section */
  const designCta = document.getElementById('designCta');
  const toggleCta = () => {
    if (!designCta) return;
    if (document.body.dataset.room !== 'design') { designCta.classList.remove('is-shown'); return; }
    const work = document.querySelector('.section.work');     // the "01 — Design Room" section
    const note = document.querySelector('.practice-note');
    const services = document.querySelector('.service-showcase');
    const y = window.scrollY;
    // only once the viewer actually reaches the Design Room — not during the hero/Panjamor
    const inDesign = work ? (y + window.innerHeight * 0.5) >= __absTop(work) : y > window.innerHeight * 0.55;
    const ctaEnd = services || note;
    const beforeEnd = !ctaEnd || (__absTop(ctaEnd) - y) > window.innerHeight * 0.65;
    designCta.classList.toggle('is-shown', inDesign && beforeEnd);
  };
  window.__bqToggleCta = toggleCta;
  window.addEventListener('scroll', () => {
    toggleCta();
    if (document.body.dataset.room !== 'design') return;
    clearTimeout(__urlResetT);
    __urlResetT = setTimeout(() => {
      if (document.body.dataset.room !== 'design') return;
      const prefix = (currentLang && currentLang !== 'en') ? '/' + currentLang : '';
      const base = prefix || '/';
      const work = document.querySelector('.section.work');       // "01 — Design Room" + grid
      const note = document.querySelector('.practice-note'); // "A short note" → back to simple
      const postWork = document.querySelector('.service-showcase') || note;
      const y = window.scrollY + window.innerHeight * 0.38;       // a touch below the fold
      let path = base;
      if (postWork && y >= __absTop(postWork)) {
        path = base;                                              // below portfolio → plain home link
      } else if (work && y >= __absTop(work)) {
        path = prefix + '/design';                                // portfolio section → /design, even when a tab is active
      }
      const cur  = (location.pathname.replace(/\/+$/, '') || '/');
      const want = (path.replace(/\/+$/, '') || '/');
      if (cur !== want) { try { history.replaceState(null, '', path); } catch (e) {} }
    }, 180);
  }, { passive: true });

  routeLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      const route = a.dataset.route;
      if (!route) return;
      // allow language buttons to keep their own behavior — they don't have data-route
      e.preventDefault();
      if (window.__bqCloseReader) window.__bqCloseReader();   // leaving via the rail closes an open post
      if (window.__bqCloseWorkCase) window.__bqCloseWorkCase();   // leaving via the rail closes an open case study
      showRoomAfterTransitionCurtain(route, true);
    });
  });

  // Browser back/forward + pasted deep-links
  window.addEventListener('popstate', () => {
    const { room, tab } = parseRoute();
    const normalizedRoom = room === 'pencemor' ? 'panjamor' : room;
    const r = validRooms.includes(normalizedRoom) ? normalizedRoom : 'design';
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
    if (open && window.__bqExclusive) window.__bqExclusive('menu');   // opening the menu closes chat/Latest/popovers
    mobileMenu?.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  window.__bqPanels = window.__bqPanels || {};
  window.__bqPanels.menu = () => setMenu(false);
  menuBtn?.addEventListener('click', () => setMenu(!mobileMenu?.classList.contains('is-open')));
  document.getElementById('railMenu')?.addEventListener('click', () => setMenu(!mobileMenu?.classList.contains('is-open')));
  document.getElementById('mobileMenuClose')?.addEventListener('click', () => setMenu(false));
  mobileMenu?.addEventListener('click', (e) => { if (e.target === mobileMenu) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  mobileMenu?.querySelectorAll('.mm-link, .mm-touch, .mm-logo').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  document.querySelector('[data-footer-top]')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Drag the sheet (grab the handle / top) downward to dismiss it. */
  const sheet = mobileMenu?.querySelector('.mobile-sheet');
  if (sheet) {
    let startY = null, dy = 0, dragging = false;
    const onDown = (y) => { if (sheet.scrollTop > 4) return; startY = y; dy = 0; dragging = true; sheet.style.transition = 'none'; };
    const onMove = (y) => {
      if (!dragging || startY === null) return;
      dy = y - startY;
      if (dy < 0) dy = 0;                       // only downward
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false; startY = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 90) setMenu(false);              // far enough → close
    };
    sheet.addEventListener('touchstart', (e) => onDown(e.touches[0].clientY), { passive: true });
    sheet.addEventListener('touchmove',  (e) => { onMove(e.touches[0].clientY); }, { passive: true });
    sheet.addEventListener('touchend', onUp);
    // pointer (trackpad / mouse) drag too
    sheet.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') onDown(e.clientY); });
    window.addEventListener('pointermove', (e) => { if (dragging && e.pointerType !== 'touch') onMove(e.clientY); });
    window.addEventListener('pointerup', () => { if (dragging) onUp(); });
  }

  /* ---------- MOBILE BOTTOM-BAR POPUPS (language · socials) ----------
     Every floating panel (chat · Latest · menu · these popovers) is EXCLUSIVE:
     opening one closes all the others, through a tiny shared registry. */
  window.__bqPanels = window.__bqPanels || {};
  window.__bqExclusive = window.__bqExclusive || ((except) => {
    Object.keys(window.__bqPanels).forEach((k) => { if (k !== except) { try { window.__bqPanels[k](); } catch (e) {} } });
  });
  const langPop = document.getElementById('langPop');
  const socialPop = document.getElementById('socialPop');
  const closePops = (except) => {
    if (langPop && except !== 'lang') langPop.classList.remove('is-open');
    if (socialPop && except !== 'social') socialPop.classList.remove('is-open');
  };
  window.__bqPanels.lang = () => langPop && langPop.classList.remove('is-open');
  window.__bqPanels.social = () => socialPop && socialPop.classList.remove('is-open');
  document.getElementById('langPopBtn')?.addEventListener('click', (e) => {
    e.stopPropagation(); window.__bqExclusive('lang'); langPop?.classList.toggle('is-open');
  });
  document.getElementById('socialPopBtn')?.addEventListener('click', (e) => {
    e.stopPropagation(); window.__bqExclusive('social'); socialPop?.classList.toggle('is-open');
  });
  langPop?.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => langPop.classList.remove('is-open')));
  document.addEventListener('click', (e) => { if (!e.target.closest('.mobilebar-pop-wrap')) closePops(); });

  /* share THIS page (current room/tab link) — native sheet on mobile, copy on desktop */
  document.querySelectorAll('.share-page-btn').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    const url = location.origin + location.pathname;
    const title = document.title;
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); b.classList.add('is-copied'); setTimeout(() => b.classList.remove('is-copied'), 1500); } catch (err) {}
  }));

  /* ---------- TABS + PAGINATION + SECTION HEADER ---------- */
  const tabs = document.querySelectorAll('.tab');
  const PAGE_SIZE = 58;
  let currentFilter = 'all';
  let currentShown  = 0;
  let correctScrollAfterGallery = false;

  const TAB_META = {
    all:      { title: 'All Work',        desc: 'The full catalogue — every discipline, one practice.',                  note: 'By Barakat Qurtas · Hewlêr, Kurdistan' },
    official: { title: 'Official',        desc: 'Editorial design for the Presidency of the Kurdistan Region.',          note: 'Kurdistan Region Presidency · 2021—Present' },
    book:     { title: 'Book Covers',     desc: 'Typography, illustration, and print composition.',                       note: 'Nawroz Press & independent publishers · 2014—Now' },
    image:    { title: 'Photography',     desc: 'Lightroom editing, composites, and editorial retouching.',               note: 'Erbil & Kurdistan Region · 2018—Now' },
    logo:     { title: 'Logos',           desc: 'Marks, wordmarks, and visual identities — a decade of drawn signs.',    note: '2014—2025 · Various clients' },
    posters:  { title: 'Posters',         desc: 'Cultural, political, and typographic poster series.',                   note: 'Series · Erbil & Kurdistan Region' },
    social:   { title: 'Social Media',    desc: 'Instagram grids, campaigns, and digital storytelling.',                 note: '2023—Now · Various brands' },
    events:   { title: 'Events',          desc: 'Ceremony materials, banners, and event identity design.',                note: 'Conferences & cultural events · KRG' },
    stationery: { title: 'Stationery',    desc: 'Business cards, letterheads, invoices, and receipts.',                  note: '' },
    ai:         { title: 'AI',            desc: 'AI-assisted posters, video, and experiments.',                          note: '' },
    video:    { title: 'Video',           desc: 'Documentary edits, motion reels, and protocol media coverage.',         note: '2019—Now · KRG official media' },
    other:    { title: 'Other Works',     desc: 'Miscellaneous — flex banners, type experiments, and notes.',            note: 'Always ongoing' },
  };

  const getTabMeta = () =>
    (window.TAB_META_I18N && window.TAB_META_I18N[currentLang]) ||
    (window.TAB_META_I18N && window.TAB_META_I18N.en) || TAB_META;

  const WORKS_WORD = { en: 'works', ku: 'کار', kmr: 'kar', ar: 'عمل', fr: 'œuvres', tr: 'iş', sv: 'verk' };
  const fallbackTabTotal = (filter) => {
    try {
      const live = window.__bqGalleryCounts && window.__bqGalleryCounts();
      if (live) return filter === 'all' ? (live.total || 0) : ((live.cats && live.cats[filter]) || 0);
    } catch (e) {}
    const collections = window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS;
    if (!collections) return 0;
    return Object.entries(collections).reduce((sum, [key, coll]) => {
      if (!coll || key === 'certificate') return sum;
      const cat = coll.cat || key;
      if (filter !== 'all' && cat !== filter) return sum;
      return sum + ((coll.files && coll.files.length) || coll.count || 0);
    }, 0);
  };
  const updateTabHeader = (filter, total) => {
    const tm    = getTabMeta();
    const meta  = tm[filter] || TAB_META[filter] || tm.all;   // ai/stationery may only exist in the base TAB_META
    const title = document.getElementById('tabHeaderTitle');
    const desc  = document.getElementById('tabHeaderDesc');
    const note  = document.getElementById('tabHeaderNote');
    const ghost = document.getElementById('tabHeaderGhost');
    if (!title) return;
    const shownTotal = (total == null) ? fallbackTabTotal(filter) : total;
    const count = shownTotal + ' ' + (WORKS_WORD[currentLang] || WORKS_WORD.en);
    title.textContent = meta.title;
    if (desc)  desc.textContent  = count;
    if (note)  note.textContent  = '';
    if (ghost) ghost.dataset.ghost = shownTotal;
    title.classList.remove('anim-out');
    title.classList.add('anim-in');
    clearTimeout(updateTabHeader._t);
    updateTabHeader._t = setTimeout(() => {
      title.classList.remove('anim-in');
    }, 420);
  };
  const animateTabHeader = () => {
    const title = document.getElementById('tabHeaderTitle');
    if (!title) return;
    title.classList.remove('anim-in', 'anim-out');
    void title.offsetWidth;
    setTimeout(() => {
      title.classList.add('anim-in');
    }, 20);
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
    wrap.classList.toggle('is-pending', total <= 0);
    wrap.setAttribute('aria-hidden', total > 0 ? 'false' : 'true');
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
    matching.slice(0, target).forEach((e, idx) => placeCard(e.el, idx));
    currentShown = target;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
  };
  const scrollToGridTop = (behavior = 'smooth') => {
    const head = document.getElementById('tabHeader') || gridEl;
    if (!head) return;
    const topbar = document.querySelector('.rail');
    const topbarH = topbar && getComputedStyle(topbar).position === 'fixed'
      ? topbar.getBoundingClientRect().height
      : 0;
    const stickyTabs = window.innerWidth <= 820 ? document.querySelector('.section.work > .tabs-wrap') : null;
    const stickyTabsH = stickyTabs && getComputedStyle(stickyTabs).position === 'sticky'
      ? stickyTabs.getBoundingClientRect().height
      : 0;
    const gap = window.innerWidth <= 820 ? 24 : 18;
    const y = head.getBoundingClientRect().top + window.scrollY - topbarH - stickyTabsH - gap;
    window.scrollTo({ top: Math.max(0, y), behavior });
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

  let portfolioRevealObserver = null;
  const prepPortfolioReveal = (card, colIndex, media, rank) => {
    if (!card) return;
    card.classList.remove('portfolio-in');
    card.classList.add('portfolio-scroll-card');
    card.style.setProperty('--portfolio-delay', '0ms');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      requestAnimationFrame(() => card.classList.add('portfolio-in'));
      return;
    }

    const observeCard = () => {
      if (!card.isConnected) return;
      if (!portfolioRevealObserver) {
        portfolioRevealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('portfolio-in');
            portfolioRevealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.01, rootMargin: '0px 0px 18% 0px' });
      }
      portfolioRevealObserver.observe(card);
    };

    requestAnimationFrame(observeCard);
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

  const placeCard = (card, rank) => {
    const heights = mHeights, cols = mCols;       // capture current layout refs
    let i = 0;
    for (let k = 1; k < heights.length; k++) if (heights[k] < heights[i]) i = k;
    const media = card.querySelector('img, video');
    if (media && media.tagName === 'IMG') {
      if (rank < PAGE_SIZE) {
        media.loading = rank < 22 ? 'eager' : 'lazy';
        media.fetchPriority = rank < 14 ? 'high' : 'auto';
      } else {
        media.loading = 'lazy';
        media.fetchPriority = 'low';
      }
    }
    cols[i].appendChild(card);
    heights[i] += CARD_EST;

    prepPortfolioReveal(card, i, media, rank);
    const correct = () => {
      if (heights !== mHeights) return;           // layout was rebuilt — ignore
      heights[i] += (card.offsetHeight + 8) - CARD_EST;
    };
    if (media) {
      if (media.complete && media.naturalHeight) correct();
      else media.addEventListener('load', correct, { once: true });
      media.addEventListener('loadeddata', correct, { once: true });
    }

    /* visual reveal is handled by .portfolio-scroll-card when the card enters view */
  };

  const matchingCards = () => {
    const list = (window.BQ_ALL_CARDS || []).filter(e => currentFilter === 'all' || e.cat === currentFilter);
    if (currentFilter !== 'all') return list;
    const stills = [], videos = [];
    list.forEach(e => (e.type === 'video' ? videos : stills).push(e));
    return stills.concat(videos);
  };

  const COMING_SOON = {
    en:  { t: 'Coming soon', s: 'AI-assisted posters and video — landing here shortly.' },
    ku:  { t: 'بەم زووانە', s: 'پۆستەر و ڤیدیۆی بە یارمەتی AI — بەم زووانە لێرە دەردەکەون.' },
    kmr: { t: 'Bi lez tê', s: 'Poster û vîdyoyên bi alîkariya AI — di demek nêz de li vir.' },
    ar:  { t: 'قريباً', s: 'ملصقات وفيديو بمساعدة الذكاء الاصطناعي — قريباً هنا.' },
    fr:  { t: 'Bientôt', s: 'Affiches et vidéos assistées par IA — bientôt ici.' },
    tr:  { t: 'Yakında', s: 'AI destekli afişler ve video — çok yakında burada.' },
    sv:  { t: 'Kommer snart', s: 'AI-stödda affischer och video — landar här snart.' },
  };
  /* shuffle the master deck so every visit / tab-switch surfaces a fresh set of
     works at the top; the order then stays stable all the way through Load-more. */
  const shuffleAllCards = () => {
    const a = window.BQ_ALL_CARDS;
    if (!Array.isArray(a)) return;
    for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  };
  /* render the gallery. reset=true rebuilds columns (tab switch / resize). */
  window.__bqRenderGallery = (reset) => {
    if (!gridEl) return;
    if (reset) { shuffleAllCards(); buildColumns(colCountForWidth()); currentShown = 0; }
    const matching = matchingCards();
    if (currentFilter === 'ai' && matching.length === 0) {   // AI tab, no works yet → coming soon
      gridEl.innerHTML = '';
      const cs = document.createElement('div');
      cs.className = 'tab-coming-soon';
      const t = COMING_SOON[currentLang] || COMING_SOON.en;
      cs.innerHTML = '<i class="fa-solid fa-microchip"></i><h3></h3><p></p>';
      cs.querySelector('h3').textContent = t.t; cs.querySelector('p').textContent = t.s;
      gridEl.appendChild(cs);
      updateTabHeader(currentFilter, 0);
      updateLoadMore(0);
      return;
    }
    const batch = matching.slice(currentShown, currentShown + PAGE_SIZE);
    batch.forEach((e, idx) => placeCard(e.el, currentShown + idx));
    currentShown += batch.length;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
    if (reset && correctScrollAfterGallery) {
      correctScrollAfterGallery = false;
      setTimeout(() => scrollToGridTop('auto'), 40);
      setTimeout(() => scrollToGridTop('auto'), 260);
      setTimeout(() => scrollToGridTop('auto'), 700);
    }
  };

  // Re-translate the tab header + load-more in place when the language flips
  window.__bqRerenderChrome = () => {
    if (!gridEl) return;
    const total = matchingCards().length;
    updateTabHeader(currentFilter, total);
    updateLoadMore(total);
  };

  const setActiveTab = (tab) => {
    if (!tab) return;
    tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    currentFilter = tab.dataset.filter;
    window.__bqRenderGallery(true);
    animateTabHeader();
  };

  const activateTab = (tab, push) => {
    correctScrollAfterGallery = !Array.isArray(window.BQ_ALL_CARDS) || !window.BQ_ALL_CARDS.length;
    setActiveTab(tab);
    if (push !== false) syncURL(!!push);
    requestAnimationFrame(() => scrollToGridTop(push === false ? 'auto' : 'smooth'));
    setTimeout(() => scrollToGridTop('auto'), 120);
    setTimeout(() => scrollToGridTop('auto'), 320);
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
      matchingCards().slice(0, shown).forEach((e, idx) => { placeCard(e.el, idx); currentShown++; });
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

  /* The deck re-shuffles on every page load and tab switch — that stays.
     The gallery shows exactly one batch (PAGE_SIZE = 58) at a time; the reader
     taps "Load more" to reveal the next batch. No auto-infinite-scroll — the works
     never all load at once, and nothing swaps under the reader as they scroll. */

  window.__bqResetToHomeHero = () => {
    try { window.__bqCloseReader && window.__bqCloseReader(); } catch (e) {}
    try { window.__bqCloseWorkCase && window.__bqCloseWorkCase(); } catch (e) {}
    const all = document.querySelector('.tab[data-filter="all"]');
    if (all && currentFilter !== 'all') setActiveTab(all);
    showRoom('design', false);
    const prefix = (currentLang && currentLang !== 'en') ? '/' + currentLang : '';
    try { history.replaceState(null, '', prefix || '/'); } catch (e) {}
    const hardTop = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const scroller = document.scrollingElement || document.documentElement;
        if (scroller) scroller.scrollTop = 0;
      } catch (e) {}
      if (window.__bqOnScroll) window.__bqOnScroll();
    };
    hardTop();
    requestAnimationFrame(hardTop);
    setTimeout(hardTop, 80);
    setTimeout(hardTop, 280);
  };

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
    document.querySelectorAll('.blog-card, .tl-item, .bio-card, .honor, .lang-item, .orgs li, .service, .qc-card, .stat, .logo-mark, .logo-chip, .studio-card, .studio-step, .studio-proof-item, .pj-cta-section')
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
  const normalizedStartRoom = startRoomRaw === 'pencemor' ? 'panjamor' : startRoomRaw;
  const startRoom = validRooms.includes(normalizedStartRoom) ? normalizedStartRoom : 'design';
  showRoom(startRoom);
  if (startRoom === 'design' && startTab) {
    const t0 = document.querySelector(`.tab[data-filter="${startTab}"]`);
    if (t0) activateTab(t0);
  }
  if (normalizedStartRoom === 'design') {
    // a shared /design link lands on the Design Room section, not the hero.
    // A tab link (/design/events) lands on that tab's own title/count header.
    setTimeout(() => {
      if (startTab) scrollToGridTop('auto');
      else document.querySelector('.section.work')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
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
      // Safe readers: optional brief fields may be hidden or absent in older cached markup.
      const val = (sel) => { const el = form.querySelector(sel); return el ? el.value.trim() : ''; };
      const chk = (sel) => { const el = form.querySelector(sel); return !!(el && el.checked); };
      const name = val('#pName');
      const email = val('#pEmail');
      const message = val('#pMessage');
      const type = val('#pType') || 'Project enquiry';   // optional now
      if (!name || !email || !message) {
        status.style.color = 'var(--ember)';
        status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please add your name, email and a short message.';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.style.color = 'var(--ember)';
        status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter a valid email address.';
        return;
      }
      const submissions = JSON.parse(localStorage.getItem('bq_pitches') || '[]');
      submissions.push({
        id: Date.now(),
        name, email, type, message,
        company: val('#pCompany'),
        phone:   val('#pPhone'),
        budget:  val('#pBudget'),
        timeline:val('#pTimeline'),
        hear:    val('#pHear'),
        references: val('#pRefs'),
        nda:     chk('#pNDA'),
        at: new Date().toISOString()
      });
      try { localStorage.setItem('bq_pitches', JSON.stringify(submissions)); } catch(e){}

      // Reliable delivery: paste a free Web3Forms access key (web3forms.com, tied
      // to hello@bqurtas.com) below and every pitch is auto-emailed to you. Until
      // then it falls back to opening a prefilled mail in the visitor's mail app.
      const WEB3FORMS_KEY = 'cd575d52-8847-4286-af53-efa296c04686'; // delivers each pitch to hello@bqurtas.com
      const fields = {
        company:      val('#pCompany'),
        phone:        val('#pPhone'),
        project_type: type,
        budget:       val('#pBudget'),
        timeline:     val('#pTimeline'),
        heard_about:  val('#pHear'),
        references:   val('#pRefs'),
        nda:          chk('#pNDA') ? 'Yes' : 'No'
      };

      if (WEB3FORMS_KEY) {
        status.style.color = 'var(--gold)';
        status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: `New pitch — ${type} — ${name}`, name, email, message, ...fields })
        }).then(r => r.json()).then(d => {
          status.style.color = d.success ? 'var(--gold)' : 'var(--ember)';
          status.innerHTML = d.success
            ? '<i class="fa-solid fa-circle-check"></i> Thank you — your pitch has been sent. I reply within 48 hours.'
            : '<i class="fa-solid fa-circle-exclamation"></i> Could not send — please write directly to hello@bqurtas.com.';
          if (d.success) form.reset();
        }).catch(() => {
          status.style.color = 'var(--ember)';
          status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Could not send — please write directly to hello@bqurtas.com.';
        });
      } else {
        const subject = encodeURIComponent(`Pitch — ${type} — ${name}`);
        const body = encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\nCompany: ${fields.company}\nPhone: ${fields.phone}\nProject type: ${type}\nBudget: ${fields.budget}\nTimeline: ${fields.timeline}\nReferences: ${fields.references}\nHeard about: ${fields.heard_about}\nNDA: ${fields.nda}\n\n---\n${message}`
        );
        window.location.href = `mailto:hello@bqurtas.com?subject=${subject}&body=${body}`;
        status.style.color = 'var(--gold)';
        status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pitch prepared. Your mail client will open — or write directly to hello@bqurtas.com.';
        form.reset();
      }
    });
  }

  /* Keep the original name-card hover reliable without changing its design. */
  const railLogoProfile = document.getElementById('railLogo');
  const hoverProfileCard = document.getElementById('profileCard');
  if (railLogoProfile && hoverProfileCard) {
    let profileHoverTimer = null;
    const showProfileCard = () => {
      clearTimeout(profileHoverTimer);
      hoverProfileCard.classList.add('is-shown');
      hoverProfileCard.setAttribute('aria-hidden', 'false');
    };
    const hideProfileCard = () => {
      clearTimeout(profileHoverTimer);
      profileHoverTimer = setTimeout(() => {
        hoverProfileCard.classList.remove('is-shown');
        hoverProfileCard.setAttribute('aria-hidden', 'true');
      }, 260);
    };
    railLogoProfile.addEventListener('mouseenter', showProfileCard);
    railLogoProfile.addEventListener('mouseover', showProfileCard);
    railLogoProfile.addEventListener('focusin', showProfileCard);
    railLogoProfile.addEventListener('mouseleave', hideProfileCard);
    railLogoProfile.addEventListener('focusout', hideProfileCard);
    hoverProfileCard.addEventListener('mouseenter', showProfileCard);
    hoverProfileCard.addEventListener('mouseleave', hideProfileCard);
  }

  /* ---------- Custom Cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    const ringLabel = ring.querySelector('.cursor-ring-label');
    const cursorText = (key, fallback) => (window.BQ_DICT && window.BQ_DICT['cursor.' + key]) || fallback;
    let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    let magnet = null;
    let cursorTarget = null;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
      syncCursorTarget(e.target);
    });
    const animateRing = () => {
      const hasOpen = ring.classList.contains('is-open');
      const hasMagnet = ring.classList.contains('is-magnet');
      const hasHover = ring.classList.contains('is-hover');
      const gapY = hasOpen ? 16 : hasMagnet ? 12 : hasHover ? 11 : 0;
      const gapX = hasOpen ? 1 : 0;
      let tx = mx, ty = my;
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        if (r.width) {                 // a soft magnetic pull toward the control's centre
          tx = mx + (r.left + r.width / 2 - mx) * 0.32;
          ty = my + (r.top + r.height / 2 - my) * 0.32;
        }
      }
      tx += gapX;
      ty += gapY;
      const ease = hasOpen ? 0.13 : hasMagnet ? 0.17 : 0.2;
      rx += (tx - rx) * ease;
      ry += (ty - ry) * ease;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animateRing);
    };
    animateRing();
    const MAGNET = '.rail-link, .rail-tool, .rail-chat, .theme-btn, .social-current, ' +
                   '.lang-current, .lang-opt, .social-opt, .footer-top-btn, ' +
                   '.mobile-menu-close, .to-top, .profile-card-btn, .reader-top';
    function syncCursorTarget(target) {
      if (!target || target === cursorTarget || !target.closest) return;
      cursorTarget = target;
      const overCard = target.closest(
        '.card, .service-trigger, .feature-card, .blog-card, .qc-card, .index-row, ' +
        '.footer-cta-btn, .footer-room-nav a, .mm-link, .tab, .software-chip, ' +
        '#bio .bio-block, .bio-doc-btn, .work-card, .service-cta, .software-link, ' +
        '.pencemor-hero-btn, .pj-room-btn, .studio-card, .studio-step, .pitch-submit, .footer-email, .profile-card-btn'
      );
      const overMagnet = target.closest(MAGNET);
      const overZoom = target.closest('.cert-item');   // certificates keep the system zoom cursor
      const overHide = target.closest('#railLogo, .rail-logo, .profile-card');  // no custom-cursor shape over the wordmark / profile card
      const overMenuBtn = target.closest('#railMenu, .rail-menu, #menuToggle, .menu-toggle-btn');  // hamburger: NO cursor ring over it (the circle read as clutter)
      const overLink = target.closest('a, button, .tab, input, select, textarea, .service, .stat, .logo-mark, .logo-chip, .index-row');
      magnet = (!overCard && overMagnet && !overHide) ? overMagnet : null;
      ring.classList.toggle('is-open',   !!overCard && !overZoom);
      ring.classList.toggle('is-magnet', !overCard && !!overMagnet && !overMenuBtn);
      ring.classList.toggle('is-hover',  !overCard && !overMagnet && !!overLink && !overMenuBtn);
      if (ringLabel && overCard) {
        let action = 'open';
        if (overCard.matches('.card--photo, .work-card, .blog-card, .tab')) action = 'view';
        else if (overCard.matches('.software-chip, .software-link')) action = 'tool';
        else if (overCard.matches('.footer-cta-btn, .pj-room-btn')) action = 'talk';
        else if (overCard.matches('.pitch-submit, .footer-email')) action = 'send';
        else if (overCard.matches('.mm-link, .footer-room-nav a, .service-cta, .pencemor-hero-btn')) action = 'go';
        else if (overCard.matches('.service-trigger, .feature-card, .qc-card, #bio .bio-block, .studio-card, .studio-step')) action = 'open';
        else if (overCard.matches('.index-row')) action = 'preview';
        const label = cursorText(action, action.charAt(0).toUpperCase() + action.slice(1));
        ringLabel.textContent = label;
        ring.dataset.cursorAction = action;
      } else if (ringLabel) {
        ringLabel.textContent = cursorText('open', 'Open');
        delete ring.dataset.cursorAction;
      }
      dot.style.opacity  = (overCard || overZoom || overHide) ? '0' : '';
      ring.style.opacity = (overZoom || overHide || overMenuBtn) ? '0' : '';   // hide the ring circle over the hamburger
    }
    document.body.addEventListener('mouseover', (e) => syncCursorTarget(e.target));
    document.addEventListener('mousedown', () => ring.classList.add('is-press'));
    document.addEventListener('mouseup',   () => ring.classList.remove('is-press'));
  }
});

/* =========================================================
   Light content protection — deters casual right-click, image
   drag/save, and the common "inspect" shortcuts. This is a
   deterrent only: client-side code can never fully stop a
   determined visitor (browser menu, devtools, view-source via
   URL, network tab all remain). It just raises the bar.
   ========================================================= */
(function protect() {
  // Block right-click context menu (the "Save image as…" entry).
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // Block dragging images out to the desktop.
  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });
  // Block the usual devtools / view-source / save shortcuts.
  document.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if (k === 'f12') { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && (k === 'u' || k === 's')) { e.preventDefault(); return; }
  });
})();

/* =========================================================
   COOKIE NOTICE — calm, dismissible, self-closing after 30s
   ========================================================= */
(function cookieNotice() {
  const card = document.getElementById('cookieCard');
  if (!card) return;
  const ok = document.getElementById('cookieOk');
  let accepted = false;
  try { accepted = !!localStorage.getItem('bq_cookie_ok'); } catch (e) {}
  if (accepted) return;                               // already accepted — never show again

  let autoT = null;
  const hide = (persist) => {
    clearTimeout(autoT);
    card.classList.remove('is-shown');
    card.setAttribute('aria-hidden', 'true');
    // only "Got it" makes it permanent — a 30s auto-close does NOT, so the visitor
    // still gets the chance to accept on the next page load
    if (persist) { try { localStorage.setItem('bq_cookie_ok', '1'); } catch (e) {} }
  };
  const show = () => {
    card.classList.add('is-shown');
    card.setAttribute('aria-hidden', 'false');
    autoT = setTimeout(() => hide(false), 30000);     // 30s of no interaction → close itself (temporarily)
  };

  ok && ok.addEventListener('click', () => hide(true));
  /* show a moment after load so it doesn't fight the splash */
  setTimeout(show, 1400);
})();

/* =========================================================
   AI pill — tap to reveal "Shaping the future" (reliable on
   touch, where :focus on a <span> is flaky on iOS)
   ========================================================= */
(function aiPill() {
  var pill = document.querySelector('.hero-services-ai');
  if (!pill) return;
  // TAP / CLICK toggles on EVERY device — the reliable primary path (works on a
  // phone tap whether or not the browser falsely reports hover capability).
  pill.addEventListener('click', function (e) { e.stopPropagation(); pill.classList.toggle('is-open'); });
  document.addEventListener('click', function (e) { if (!pill.contains(e.target)) pill.classList.remove('is-open'); });
  // Desktop bonus: also reveal while the real mouse hovers.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    pill.addEventListener('mouseenter', function () { pill.classList.add('is-open'); });
    pill.addEventListener('mouseleave', function () { pill.classList.remove('is-open'); });
  }
})();

/* =========================================================
   Scroll cues — tap "SCROLL" (hero) or the room-hero cue to
   glide down past the hero to the content below it
   ========================================================= */
(function scrollCues() {
  const glide = (cue) => {
    const hero = cue.closest('.hero, .room-hero, .pencemor-hero');
    const top = hero ? Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - 2)
                     : window.scrollY + window.innerHeight * 0.9;
    window.__bqNoSnap = true;                       // don't let the hero-snap fight this deliberate scroll-down
    window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => { window.__bqNoSnap = false; }, 900);
  };
  document.querySelectorAll('.hero-meta--br, .hero-scrolldown, .room-hero-scroll').forEach((cue) => {
    cue.style.cursor = 'pointer';
    cue.setAttribute('role', 'button');
    cue.setAttribute('tabindex', '0');
    cue.removeAttribute('aria-hidden');
    cue.addEventListener('click', () => glide(cue));
    cue.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glide(cue); } });
  });
})();

/* ---- Hero (dark) — gentle cursor parallax on the portrait + light nav over it ---- */
(function () {
  const hero = document.querySelector('.hero');
  const portrait = document.getElementById('heroPortrait');
  if (portrait) {
    setTimeout(() => portrait.classList.add('is-in'), 850);
    if (window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let raf = 0;
      window.addEventListener('mousemove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mx = (e.clientX / window.innerWidth - 0.5) * 22;
          const my = (e.clientY / window.innerHeight - 0.5) * 22;
          portrait.style.setProperty('--mx', mx.toFixed(1) + 'px');
          portrait.style.setProperty('--my', my.toFixed(1) + 'px');
        });
      }, { passive: true });
    }
  }
  if (hero) {
    const updNav = () => {
      // hero is a dark island only inside the Design room; light nav while its
      // bottom is still well within the viewport.
      const onDesign = (document.body.dataset.room || 'design') === 'design';
      const r = hero.getBoundingClientRect();
      document.body.classList.toggle('nav-on-dark', onDesign && r.bottom > 140);
    };
    updNav();
    window.addEventListener('scroll', updNav, { passive: true });
    window.addEventListener('resize', updNav);
    window.addEventListener('hashchange', () => setTimeout(updNav, 60));
    window.addEventListener('popstate', () => setTimeout(updNav, 60));
    document.addEventListener('click', (e) => { if (e.target.closest('[data-route]')) setTimeout(updNav, 90); });
  }
})();
