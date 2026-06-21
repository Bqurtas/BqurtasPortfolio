/* =========================================================
   Barakat Qurtas — main.js (v3)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- THEME (dark / light) — toggle switch ---------- */
  const themeBtns = [document.getElementById('themeToggle'), document.getElementById('themeToggleM')].filter(Boolean);
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('bq_theme2', t); } catch(e){}
    themeBtns.forEach(b => b.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false'));
  };
  // Default is LIGHT now (a new key so an old saved 'dark' pref doesn't override it).
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('bq_theme2'); } catch(e){}
  applyTheme(savedTheme || 'light');
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
  const originalApplyLang = window.applyLang;
  window.applyLang = function(lang) {
    originalApplyLang(lang);
    currentLang = lang;
    setLangBadge(lang);
    setDocTitle();
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
    // a deep blog-post URL (/blog/<slug>) is owned by the reader — leave it intact on passive syncs
    if (room === 'blog' && !push && /\/blog\/[^/]+/.test(location.pathname)) return;
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
    document.body.classList.remove('menu-open');   // body.menu-open force-hides .to-top — if it lingers, the button never comes back
    document.body.style.overflow = '';
    if (window.__bqToggleCta) window.__bqToggleCta();
    requestAnimationFrame(() => { if (window.__bqOnScroll) window.__bqOnScroll(); });   // refresh the back-to-top button on every room change
  };
  window.__bqShowRoom = showRoom;

  /* Scroll-spy on the home / design page — the address bar reflects the section in view:
       hero (top)            → base   ( / or /<lang> )
       Panjamor studio       → /panjamor
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
    const note = document.querySelector('.section.bio-teaser');
    const y = window.scrollY;
    // only once the viewer actually reaches the Design Room — not during the hero/Panjamor
    const inDesign = work ? (y + window.innerHeight * 0.5) >= __absTop(work) : y > window.innerHeight * 0.55;
    const beforeNote = !note || (__absTop(note) - y) > window.innerHeight * 0.65;
    designCta.classList.toggle('is-shown', inDesign && beforeNote);
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
      const pen  = document.getElementById('pencemorHero');       // Panjamor studio
      const work = document.querySelector('.section.work');       // "01 — Design Room" + grid
      const note = document.querySelector('.section.bio-teaser'); // "A short note" → back to simple
      const y = window.scrollY + window.innerHeight * 0.38;       // a touch below the fold
      let path = base;
      if (note && y >= __absTop(note)) {
        path = base;                                              // closing note → footer: plain link
      } else if (work && y >= __absTop(work)) {
        path = (currentFilter && currentFilter !== 'all') ? prefix + '/design/' + currentFilter : prefix + '/design';
      } else if (pen && y >= __absTop(pen)) {
        path = prefix + '/panjamor';
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
    if (room === 'panjamor' || room === 'pencemor') {
      requestAnimationFrame(() => document.getElementById('pencemorHero')?.scrollIntoView({ behavior: 'auto', block: 'start' }));
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
  const PAGE_SIZE = 40;
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
    stationery: { title: 'Stationery',    desc: 'Business cards, letterheads, invoices, and receipts.',                  note: '' },
    ai:         { title: 'AI',            desc: 'AI-assisted posters, video, and experiments.',                          note: '' },
    video:    { title: 'Video',           desc: 'Documentary edits, motion reels, and protocol media coverage.',         note: '2019—Now · KRG official media' },
    other:    { title: 'Other Works',     desc: 'Miscellaneous — flex banners, type experiments, and notes.',            note: 'Always ongoing' },
  };

  const getTabMeta = () =>
    (window.TAB_META_I18N && window.TAB_META_I18N[currentLang]) ||
    (window.TAB_META_I18N && window.TAB_META_I18N.en) || TAB_META;

  const WORKS_WORD = { en: 'works', ku: 'کار', kmr: 'kar', ar: 'عمل', fr: 'œuvres', tr: 'iş', sv: 'verk' };
  const updateTabHeader = (filter, total) => {
    const tm    = getTabMeta();
    const meta  = tm[filter] || TAB_META[filter] || tm.all;   // ai/stationery may only exist in the base TAB_META
    const title = document.getElementById('tabHeaderTitle');
    const desc  = document.getElementById('tabHeaderDesc');
    const note  = document.getElementById('tabHeaderNote');
    const ghost = document.getElementById('tabHeaderGhost');
    if (!title) return;
    title.classList.add('anim-out');
    setTimeout(() => {
      title.textContent = meta.title;
      // keep it clean — just the tab name + the count of works (no long blurb), even when zero
      if (desc)  desc.textContent  = total + ' ' + (WORKS_WORD[currentLang] || WORKS_WORD.en);
      if (note)  note.textContent  = '';
      if (ghost) ghost.dataset.ghost = total;
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

  /* The deck re-shuffles on every page load and tab switch — that stays.
     The gallery shows exactly one batch (PAGE_SIZE = 40) at a time; the reader
     taps "Load more" to reveal the next 40. No auto-infinite-scroll — the works
     never all load at once, and nothing swaps under the reader as they scroll. */

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
  if (startRoomRaw === 'panjamor' || startRoomRaw === 'pencemor') {
    // a shared /panjamor link lands on the studio section
    setTimeout(() => document.getElementById('pencemorHero')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 60);
  } else if (startRoomRaw === 'design') {
    // a shared /design link lands on the Design Room section, not the hero
    // (otherwise the scroll-spy would immediately reset the URL back to "/")
    setTimeout(() => document.querySelector('.section.work')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 80);
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

      // Reliable delivery: paste a free Web3Forms access key (web3forms.com, tied
      // to info@bqurtas.com) below and every pitch is auto-emailed to you. Until
      // then it falls back to opening a prefilled mail in the visitor's mail app.
      const WEB3FORMS_KEY = '6396c177-b988-43d0-ac42-5c398151cde9'; // delivers each pitch to info@bqurtas.com
      const fields = {
        company:      form.querySelector('#pCompany').value,
        phone:        form.querySelector('#pPhone').value,
        project_type: type,
        budget:       form.querySelector('#pBudget').value,
        timeline:     form.querySelector('#pTimeline').value,
        heard_about:  form.querySelector('#pHear').value,
        nda:          form.querySelector('#pNDA').checked ? 'Yes' : 'No'
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
            : '<i class="fa-solid fa-circle-exclamation"></i> Could not send — please write directly to info@bqurtas.com.';
          if (d.success) form.reset();
        }).catch(() => {
          status.style.color = 'var(--ember)';
          status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Could not send — please write directly to info@bqurtas.com.';
        });
      } else {
        const subject = encodeURIComponent(`Pitch — ${type} — ${name}`);
        const body = encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\nCompany: ${fields.company}\nPhone: ${fields.phone}\nProject type: ${type}\nBudget: ${fields.budget}\nTimeline: ${fields.timeline}\nHeard about: ${fields.heard_about}\nNDA: ${fields.nda}\n\n---\n${message}`
        );
        window.location.href = `mailto:info@bqurtas.com?subject=${subject}&body=${body}`;
        status.style.color = 'var(--gold)';
        status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pitch prepared. Your mail client will open — or write directly to info@bqurtas.com.';
        form.reset();
      }
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
      const overCard = e.target.closest('.card');        // gallery work cards → an "Open" disc
      const overZoom = e.target.closest('.cert-item');   // certificates keep the system zoom cursor
      const overLink = e.target.closest('a, button, .tab, input, select, textarea, .qc-card, .blog-card, .service, .stat, .logo-mark, .logo-chip, .index-row');
      ring.classList.toggle('is-open',  !!overCard && !overZoom);
      ring.classList.toggle('is-hover', !overCard && !!overLink);
      dot.style.opacity  = (overCard || overZoom) ? '0' : '';
      ring.style.opacity = overZoom ? '0' : '';
    });
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
