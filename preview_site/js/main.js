/* =========================================================
   Barakat Qurtas — main.js (v3)
   ========================================================= */

/* Page guard — right-click, dragging artwork out, and the DevTools /
   view-source / save-page shortcuts stay closed on the site. Source and
   rationale: functions/_page-guard.js (keep this copy verbatim). */
(() => {
  if (window.__bqPageGuard) return;
  window.__bqPageGuard = true;
  const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
  const MEDIA = 'img, video, picture';
  const DEVTOOLS = ['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyE'];
  const nav = window.navigator || {};
  const mac = /Mac|iPhone|iPad|iPod/.test(nav.platform || nav.userAgent || '');
  const touch = window.matchMedia ? window.matchMedia('(pointer: coarse)') : { matches: false };
  const within = (event, selector) => event.target && event.target.closest ? event.target.closest(selector) : null;
  document.addEventListener('contextmenu', (event) => {
    const field = within(event, FIELD);
    if (field && (event.pointerType === 'touch' || touch.matches || field.closest('#dash'))) return;
    event.preventDefault();
  }, true);
  // A card drags as its link, and that drag carries the image inside it.
  document.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (within(event, MEDIA) || (target && target.querySelector && target.querySelector(MEDIA))) event.preventDefault();
  }, true);
  window.addEventListener('keydown', (event) => {
    const code = event.code || '';
    // Cmd on a Mac, Ctrl elsewhere. Alt stays out of the Ctrl rules: AltGr
    // arrives as Ctrl+Alt and types letters on many layouts.
    const command = mac ? event.metaKey : event.ctrlKey;
    if (code === 'F12' || event.key === 'F12'
      || (command && event.shiftKey && !event.altKey && DEVTOOLS.includes(code))
      || (mac && event.metaKey && event.altKey && (DEVTOOLS.includes(code) || code === 'KeyU'))
      || (command && !event.shiftKey && !event.altKey && (code === 'KeyU' || code === 'KeyS'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();

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

/* Width and height are independent: a wide, shallow window needs the same
   proportional reduction as a narrow one. Keep the value numeric for CSS and
   the gallery's physical-pixel scroll mapper. No work runs on scroll. */
(function viewportContentScale() {
  /* svh follows window resizing and orientation, while staying fixed as a
     phone's address bar opens/closes. Using innerHeight alone would resize
     the entire reel in the middle of a native swipe. The hidden probe lives
     outside the transformed page stage and never participates in flow. */
  const probe = document.createElement('span');
  probe.className = 'bq-viewport-measure';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;inset:0 auto auto 0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;contain:strict;';
  (document.body || document.documentElement).appendChild(probe);
  const update = () => {
    const height = probe.getBoundingClientRect().height || window.innerHeight || 720;
    const scale = Math.max(.5, Math.min(1, height / 720));
    if (window.__bqViewportScale === scale) return;
    window.__bqViewportScale = scale;
    document.documentElement.style.setProperty('--bq-viewport-scale', String(scale));
  };
  update();
  window.addEventListener('resize', update, { passive: true });
})();

/* Mobile browser bars emit viewport resize events throughout a swipe. Refit
   the paper deck once the height settles, rather than running every chapter's
   synchronous fitting search between touch frames. Width/orientation changes
   still reflow immediately, and content observers share the same short gate. */
(function viewportLayoutScheduler() {
  const callbacks = new Set();
  const pending = new Set();
  const touch = window.matchMedia('(hover: none), (pointer: coarse)');
  let width = window.innerWidth, height = window.__bqPaperViewport?.height || window.innerHeight;
  let settling = false, timer = 0;
  const flush = () => {
    clearTimeout(timer);
    timer = 0;
    settling = false;
    const work = new Set([...callbacks, ...pending]);
    pending.clear();
    work.forEach(callback => callback());
  };
  const resize = () => {
    const nextWidth = window.innerWidth;
    const nextHeight = window.__bqPaperViewport?.height || window.innerHeight;
    // The early frame bridge ignores pinch/keyboard changes but also reports
    // toolbar frames where Safari has not updated innerHeight yet.
    if (nextWidth === width && nextHeight === height) return;
    const widthChanged = nextWidth !== width;
    width = nextWidth;
    height = nextHeight;
    if (touch.matches && !widthChanged) {
      settling = true;
      clearTimeout(timer);
      timer = setTimeout(flush, 120);
    } else flush();
  };
  window.__bqViewportLayout = {
    subscribe(callback) { callbacks.add(callback); },
    defer(callback) {
      if (!settling) return false;
      pending.add(callback);
      return true;
    },
  };
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('bq:frame-resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', flush, { passive: true });
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- THEME (dark / light) — toggle switch ---------- */
  const themeBtns = [document.getElementById('themeToggle'), document.getElementById('themeToggleM')].filter(Boolean);
  const applyTheme = (t) => {
    const root = document.documentElement;
    root.dataset.theme = t;
    root.style.colorScheme = t;
    try { localStorage.setItem('bq_theme3', t); } catch(e){}
    themeBtns.forEach(b => b.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false'));
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0f0f10' : '#fbfbfa');
    const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (apple) apple.setAttribute('content', t === 'dark' ? 'black-translucent' : 'default');
  };
  window.__bqApplyTheme = applyTheme;
  const isCompact = () => window.matchMedia('(max-width: 1024px)').matches;
  window.__bqIsCompact = isCompact;
  // Light is the site default (matches the bq_light_v1 migration that runs
  // inline in index.html before first paint).
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('bq_theme3'); } catch(e){}
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
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
    const langLabel = (langCodeMap[lang] || 'EN') + ' — ' + (langLabelMap[lang] || 'Language');
    const langPopBtn = document.getElementById('langPopBtn');
    if (langPopBtn) langPopBtn.setAttribute('aria-label', langLabel);
    const langCurrentBtn = document.getElementById('langCurrentBtn');
    if (langCurrentBtn) langCurrentBtn.setAttribute('aria-label', langLabel);
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
    panjamor: 'nav.panjamor',
    blog: 'nav.blog',
    work: 'nav.work',
    brandboard: 'nav.brandboard',
    bio: 'nav.bio',
    contact: 'nav.contact'
  };
  const roomLabelFallbacks = {
    design: 'Design',
    panjamor: 'Panjamor',
    blog: 'The Journal',
    work: 'Selected Work',
    brandboard: 'The Brand Board',
    bio: 'The Designer',
    contact: "Let's talk."
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
    const appliedLang = originalApplyLang(lang);
    /* Keep URL, badge and announcements aligned with the language that is
       actually on screen. A requested dictionary can still be loading. */
    const resolvedLang = appliedLang || document.documentElement.dataset.lang || 'en';
    currentLang = resolvedLang;
    setLangBadge(resolvedLang);
    setDocTitle();
    setRoomChrome(document.body.dataset.room || 'design');
    document.dispatchEvent(new CustomEvent('bq:language', { detail: { lang: resolvedLang } }));
    if (window.__bqRelocalizeGallery) window.__bqRelocalizeGallery();
    if (routerReady) syncURL(false);
    if (window.__bqRerenderChrome) window.__bqRerenderChrome();
    if (window.__bqRenderActiveHonor) window.__bqRenderActiveHonor();
    return resolvedLang;
  };

  /* Bind the language buttons — and ONLY those.
     '[data-lang]' also matched <html>, because the boot script writes
     root.dataset.lang there. Clicks bubble to <html>, so this handler ran on
     every click anywhere on the site and called preventDefault() on all of
     them: links did not open, the NDA checkbox could not be ticked, the pitch
     form could not submit, and choosing Kurdish snapped straight back to
     English because the handler re-applied whatever <html> already said.
     The two real controls are .lang-opt in the desktop flyout and
     .mobile-lang in the dock, seven of each. */
  /* Delegated, so it survives the flyout being re-rendered. Binding each
     button once at start-up did not: applyLang('ku') called by hand switches
     the site correctly, but clicking the same button did nothing, because the
     element carrying the listener had been replaced by then. The old
     '[data-lang]' selector hid this — it also matched <html>, which is never
     replaced, so the accidental catch-all was the only binding still firing. */
  document.addEventListener('click', (e) => {
    const opt = e.target.closest && e.target.closest('.lang-opt[data-lang], .mobile-lang[data-lang]');
    if (!opt) return;
    e.preventDefault();
    window.applyLang(opt.dataset.lang);
  });

  // Initial language: ALWAYS English by default — only a /lang prefix in the
  // URL (a shared localized link) switches it. Switching in-session updates
  // the URL, so a reload keeps the chosen language without defaulting to it.
  const urlLang0 = location.pathname.replace(/^\/+/, '').split('/')[0];
  window.applyLang(URL_LANGS.includes(urlLang0) ? urlLang0 : 'en');

  /* Keep legacy lightbox tiles reachable without a mouse. New gallery builds
     use native buttons; this fallback covers a stale cached gallery bundle
     without turning the informative client logos into fake controls. */
  const makeTilesReachable = () => {
    document.querySelectorAll('#certGrid .cert-item, .logos-grid .logo-mark--img:not(.logo-mark--client)').forEach((tile) => {
      if (tile.dataset.bqKeyed === '1' || tile.tagName === 'BUTTON' || tile.tagName === 'A') return;
      tile.dataset.bqKeyed = '1';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      const label = (tile.querySelector('img')?.getAttribute('alt')
        || tile.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      if (label && !tile.getAttribute('aria-label')) tile.setAttribute('aria-label', label);
      tile.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
        event.preventDefault();
        tile.click();
      });
    });
  };
  makeTilesReachable();
  window.__bqMakeTilesReachable = makeTilesReachable;
  ['bq:gallery-built', 'bq:certs-built', 'bq:logos-built'].forEach((name) => {
    window.addEventListener(name, makeTilesReachable);
  });
  /* Watch only the two interactive grids. Observing the whole document made
     unrelated dashboard and journal updates trigger redundant accessibility
     sweeps. */
  let tileSweep = 0;
  const tileObserver = new MutationObserver(() => {
    if (tileSweep) return;
    tileSweep = requestAnimationFrame(() => { tileSweep = 0; makeTilesReachable(); });
  });
  [document.getElementById('certGrid'), document.querySelector('.logos-grid')]
    .filter(Boolean)
    .forEach((root) => tileObserver.observe(root, { childList: true, subtree: true }));

  /* ---------- ROUTER (room switcher + deep-links) ---------- */
  const rooms = document.querySelectorAll('.room');
  const routeLinks = document.querySelectorAll('[data-route]');
  const validRooms = ['design','blog','bio','contact'];
  let restoringHistory = false;

  // Real anchors keep their authored destination (home versus /design) while
  // sharing the router's language prefix for copied links and new tabs.
  const routeHrefPaths = new Map();
  const languagePrefix = new RegExp('^/(?:' + URL_LANGS.join('|') + ')(?=/|$)');
  routeLinks.forEach(link => {
    if (link.tagName !== 'A' || !validRooms.includes(link.dataset.route)) return;
    const href = link.getAttribute('href') || '';
    if (href === '#') routeHrefPaths.set(link, '/');
    else if (/^\/(?!\/)/.test(href)) routeHrefPaths.set(link, href.replace(languagePrefix, '') || '/');
  });
  const syncRouteHrefs = () => {
    const language = window.__bqDesiredLang || currentLang;
    const prefix = URL_LANGS.includes(language) ? '/' + language : '';
    routeHrefPaths.forEach((path, link) => {
      link.setAttribute('href', path === '/' ? (prefix || '/') : prefix + path);
    });
  };
  document.addEventListener('bq:language', syncRouteHrefs);
  syncRouteHrefs();

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
    const lang = URL_LANGS.includes(seg[0]) ? seg.shift() : 'en';
    return { lang, room: seg[0], tab: seg[1] };
  };
  const syncURL = (push) => {
    /* Initial localized hydration may briefly paint the English fallback while
       its dictionary downloads. Preserve the requested /lang route until the
       router and the requested dictionary are both ready. */
    if (restoringHistory || !routerReady) return;
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
    const menuWasOpen = Boolean(
      document.getElementById('mobileMenu')?.classList.contains('is-open')
      || document.getElementById('mobileMenu')?.classList.contains('is-ready')
      || document.getElementById('mobileMenu')?.classList.contains('is-closing')
    );
    rooms.forEach(r => r.classList.toggle('is-hidden', r.id !== id));
    rooms.forEach(r => {
      const title = r.querySelector('.room-hero-title');
      if (!title) return;
      if (r.id === id) {
        title.setAttribute('role', 'heading');
        title.setAttribute('aria-level', '1');
      } else {
        title.removeAttribute('role');
        title.removeAttribute('aria-level');
      }
    });
    document.querySelectorAll('.rail-link, .mobile-link, .mm-link').forEach(l => {
      l.classList.toggle('is-active', l.dataset.route === id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.getElementById(id)?.querySelectorAll('.paper-scroll').forEach((scroller) => {
      scroller.scrollTop = 0;
    });
    const footerScroller = document.querySelector('.footer.footer-v249.paper-sheet > .paper-scroll');
    if (footerScroller) footerScroller.scrollTop = 0;
    document.body.dataset.room = id;
    document.documentElement.dataset.room = id;
    document.dispatchEvent(new CustomEvent('bq:route', { detail: { room: id } }));
    setRoomChrome(id);
    document.querySelectorAll('.reveal').forEach(el => el.classList.remove('is-in'));
    requestAnimationFrame(() => triggerReveals());
    syncURL(push);
    setDocTitle();
    if (window.__bqPanels && window.__bqPanels.menu) window.__bqPanels.menu({ restoreScroll: false });
    else {
      document.getElementById('mobileMenu')?.classList.remove('is-open', 'is-ready', 'is-closing');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    }
    if (window.__bqToggleCta) window.__bqToggleCta();
    requestAnimationFrame(() => { if (window.__bqOnScroll) window.__bqOnScroll(); });   // refresh the back-to-top button on every room change

    /* A route selected from the curtain should land the keyboard and screen
       reader in the new room, not back on the now-hidden menu trigger. */
    if (push) {
      const destination = document.getElementById(id)?.querySelector('.room-hero-title, h1, h2');
      if (destination) {
        const focusDestination = () => {
          destination.setAttribute('tabindex', '-1');
          try { destination.focus({ preventScroll: true }); } catch (e) { destination.focus(); }
          destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
        };
        // The page stays inert until the real return transition finishes.
        // A fixed delay can target its heading while the curtain still moves.
        if (menuWasOpen) document.addEventListener('bq:menu-closed', focusDestination, { once: true });
        else window.setTimeout(focusDestination, 0);
      }
    }
  };
  window.__bqShowRoom = showRoom;

  /* The skip link follows the active SPA room. A static #design target sends
     keyboard users into a hidden section after navigating to Blog/Bio/Contact. */
  document.querySelector('[data-skip-link]')?.addEventListener('click', (event) => {
    event.preventDefault();
    const room = document.getElementById(document.body.dataset.room || 'design');
    const destination = room?.querySelector('.room-hero-title, h1, h2') || room || document.getElementById('top');
    if (!destination) return;
    if (typeof window.__bqGoDocumentTop === 'function') window.__bqGoDocumentTop('auto');
    else window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    destination.setAttribute('tabindex', '-1');
    try { destination.focus({ preventScroll: true }); } catch (e) { destination.focus(); }
    destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
  });

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
    if (isCompact()) { designCta.classList.remove('is-shown'); return; }
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
  let ctaFrame = 0;
  const queueCta = () => {
    if (ctaFrame) return;
    ctaFrame = requestAnimationFrame(() => {
      ctaFrame = 0;
      toggleCta();
    });
  };
  window.addEventListener('scroll', () => {
    queueCta();
    if (document.body.dataset.room !== 'design') return;
    if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) return;
    clearTimeout(__urlResetT);
    __urlResetT = setTimeout(() => {
      if (document.body.dataset.room !== 'design') return;
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) return;
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
        path = prefix + '/design' + (currentFilter && currentFilter !== 'all' ? '/' + currentFilter : '');
      }
      const cur  = (location.pathname.replace(/\/+$/, '') || '/');
      const want = (path.replace(/\/+$/, '') || '/');
      if (cur !== want) { try { history.replaceState(null, '', path); } catch (e) {} }
    }, 180);
  }, { passive: true });
  window.addEventListener('resize', queueCta, { passive: true });

  routeLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
    const { lang, room, tab } = parseRoute();
    restoringHistory = true;
    /* A pending non-English dictionary paints English temporarily. History
       restoring English must still invalidate that outstanding request even
       when currentLang already reflects the English fallback. */
    if (currentLang !== lang || window.__bqDesiredLang !== lang) window.applyLang(lang);
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
    /* applyLang/showRoom both normally synchronize history; release the guard
       only after every synchronous route callback has completed. */
    queueMicrotask(() => { restoringHistory = false; });
  });

  /* ---------- MOBILE MENU (full-screen overlay) ---------- */
  const menuBtn = document.getElementById('menuToggle');
  const railMenuBtn = document.getElementById('railMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuCloseBtn = document.getElementById('mobileMenuClose');
  const menuTriggers = [menuBtn, railMenuBtn].filter(Boolean);
  const menuShapeQuery = window.matchMedia('(max-width: 820px)');
  let menuViewportBound = false;
  const menuShapeNames = ['--bq-menu-shape-top', '--bq-menu-shape-left', '--bq-menu-shape-width', '--bq-menu-shape-height', '--bq-menu-shape-radius'];
  const clearMenuShape = () => {
    menuShapeNames.forEach((name) => document.documentElement.style.removeProperty(name));
  };
  /* Use the deck's frame, not the bounds of whichever content happens to be
     under the button. A footer or an entering paper can occupy only the lower
     half of the screen; copying that rectangle pushed the menu off-screen
     and lost its bottom corners. The visible viewport plus the shared deck
     gutter gives every opening the same complete, rounded paper. */
  const fitMenuViewport = () => {
    if (!menuShapeQuery.matches || !mobileMenu) {
      clearMenuShape();
      return;
    }
    const view = window.visualViewport;
    const viewWidth = view && view.width ? view.width : window.innerWidth;
    const viewHeight = view && view.height ? view.height : window.innerHeight;
    const viewTop = view && view.offsetTop ? view.offsetTop : 0;
    const viewLeft = view && view.offsetLeft ? view.offsetLeft : 0;
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const authoredGutter = parseFloat(style.getPropertyValue('--bq-deck-gutter'));
    const gutter = Math.min(viewWidth / 4, viewHeight / 4,
      Number.isFinite(authoredGutter) ? Math.max(0, authoredGutter) : 10);
    root.style.setProperty('--bq-menu-shape-top', Math.round(viewTop + gutter) + 'px');
    root.style.setProperty('--bq-menu-shape-left', Math.round(viewLeft + gutter) + 'px');
    root.style.setProperty('--bq-menu-shape-width', Math.round(viewWidth - gutter * 2) + 'px');
    root.style.setProperty('--bq-menu-shape-height', Math.round(viewHeight - gutter * 2) + 'px');
    root.style.setProperty('--bq-menu-shape-radius', style.getPropertyValue('--bq-deck-radius').trim() || '22px');
  };
  const bindMenuViewport = (on) => {
    const view = window.visualViewport;
    if (on && !menuViewportBound) {
      menuViewportBound = true;
      view?.addEventListener('resize', fitMenuViewport);
      view?.addEventListener('scroll', fitMenuViewport);
      window.addEventListener('resize', fitMenuViewport);
    } else if (!on && menuViewportBound) {
      menuViewportBound = false;
      view?.removeEventListener('resize', fitMenuViewport);
      view?.removeEventListener('scroll', fitMenuViewport);
      window.removeEventListener('resize', fitMenuViewport);
      clearMenuShape();
    }
  };
  const menuDocks = Array.from(document.querySelectorAll('.rail'));
  const menuHasDock = () => window.innerWidth >= 1025;
  const menuStage = document.getElementById('bqPageStage');
  const menuPageState = new Map();
  let menuStageHidden = null;
  let lastMenuTrigger = null;
  let menuFrame = 0;

  const setMenuPageUnavailable = (unavailable) => {
    if (!menuStage) return;
    if (unavailable) {
      if (menuStageHidden !== null) return;
      menuStageHidden = { value:menuStage.getAttribute('aria-hidden') };
      menuStage.setAttribute('aria-hidden', 'true');
      // Leave the preview surface interactive so clicking it still dismisses
      // the curtain. Only its actual page content becomes unavailable.
      Array.from(menuStage.children).forEach((element) => {
        menuPageState.set(element, element.inert);
        element.inert = true;
      });
    } else if (menuStageHidden !== null) {
      menuPageState.forEach((inert, element) => { element.inert = inert; });
      menuPageState.clear();
      if (menuStageHidden.value === null) menuStage.removeAttribute('aria-hidden');
      else menuStage.setAttribute('aria-hidden', menuStageHidden.value);
      menuStageHidden = null;
    }
  };
  function syncMenuA11y(open) {
    mobileMenu?.setAttribute('aria-hidden', String(!open));
    if (mobileMenu) {
      mobileMenu.inert = !open;
      // Only the desktop rail stays above the curtain. Its sibling controls
      // remain accessible there; phones/tablets keep a modal, menu-only sheet.
      mobileMenu.setAttribute('aria-modal', String(!menuHasDock()));
    }
    const key = open ? 'a11y.menuClose' : 'a11y.menuOpen';
    const fallback = open ? 'Close menu' : 'Open menu';
    const label = (window.BQ_DICT && window.BQ_DICT[key]) || fallback;
    menuTriggers.forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', label);
    });
  }

  let menuScrollY = 0;
  let menuCloseTimer = 0;
  let menuCloseCleanup = null;
  let menuCloseCycle = 0;
  let menuRestoreScroll = true;
  const clearMenuCloseWait = () => {
    window.clearTimeout(menuCloseTimer);
    menuCloseTimer = 0;
    menuCloseCleanup?.();
    menuCloseCleanup = null;
    menuCloseCycle += 1;
  };
  const menuCloseTransition = () => {
    let longest = { element: null, property: '', milliseconds: 0 };
    [mobileMenu, mobileMenu?.querySelector('.mobile-sheet'), document.getElementById('bqPageStage')].filter(Boolean).forEach((element) => {
      const style = getComputedStyle(element);
      const properties = style.transitionProperty.split(',').map((value) => value.trim());
      const time = (value) => (parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);
      const durations = style.transitionDuration.split(',').map(time);
      const delays = style.transitionDelay.split(',').map(time);
      properties.forEach((property, index) => {
        if (!['transform', 'clip-path', '-webkit-clip-path', 'opacity', 'all'].includes(property)) return;
        const duration = durations[index % durations.length];
        if (duration <= 0) return;
        const milliseconds = Math.max(0, duration + delays[index % delays.length]);
        if (milliseconds > longest.milliseconds) longest = { element, property, milliseconds };
      });
    });
    return longest;
  };
  const setMenu = (open, trigger, { restoreScroll = true } = {}) => {
    if (!mobileMenu) return;
    if (open && window.__bqExclusive) window.__bqExclusive('menu');   // opening the menu closes chat/Latest/popovers
    cancelAnimationFrame(menuFrame);
    const wasOpen = mobileMenu.classList.contains('is-open') || mobileMenu.classList.contains('is-ready');
    const wasClosing = mobileMenu.classList.contains('is-closing');
    if (!open && !restoreScroll) {
      menuRestoreScroll = false;
      // A newly selected room starts at its hero beneath the route curtain.
      document.body.style.setProperty('--bq-menu-scroll-y', '0px');
    }
    // A route can change beneath the curtain before the menu's close finishes.
    // Cancel its old scroll destination without removing the transition guards.
    if (!open && wasClosing) return;
    if (!open && !wasOpen) {
      mobileMenu.classList.remove('is-open', 'is-ready', 'is-closing');
      document.body.classList.remove('menu-open', 'menu-revealed', 'menu-closing');
      document.body.style.overflow = '';
      document.body.style.removeProperty('--bq-menu-scroll-shift');
      bindMenuViewport(false);
      setMenuPageUnavailable(false);
      syncMenuA11y(false);
      return;
    }
    if (open) {
      clearMenuCloseWait();
      lastMenuTrigger = trigger || document.activeElement;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      /* Keep the native document position and scale its visible slice. The
         origin offset survives closing so returning from scale(.8) to 1 does
         not suddenly pivot around the top of a long document. */
      if ((!wasOpen && !wasClosing) || !menuRestoreScroll) menuScrollY = scrollY;
      menuRestoreScroll = true;
      document.body.style.setProperty('--bq-menu-scroll-shift', (-menuScrollY) + 'px');
      document.body.style.setProperty('--bq-menu-scroll-y', menuScrollY + 'px');
      fitMenuViewport();
      bindMenuViewport(true);
      mobileMenu.classList.remove('is-closing');
      document.body.classList.remove('menu-closing');
      mobileMenu.classList.add('is-open');
      document.body.classList.add('menu-open');
      setMenuPageUnavailable(true);
      menuFrame = requestAnimationFrame(() => {
        mobileMenu.classList.add('is-ready');
        document.body.classList.add('menu-revealed');
        try { menuCloseBtn?.focus({ preventScroll: true }); } catch (e) { menuCloseBtn?.focus(); }
      });
    } else {
      document.body.classList.remove('menu-revealed');
      document.body.classList.add('menu-closing');
      mobileMenu.classList.remove('is-ready', 'is-open');
      mobileMenu.classList.add('is-closing');
      // Read the destination at completion: a route selected while this menu
      // is closing must replace the old page's saved reading position.
      const closeCycle = ++menuCloseCycle;
      const finishClose = () => {
        if (closeCycle !== menuCloseCycle || !mobileMenu.classList.contains('is-closing')) return;
        clearMenuCloseWait();
        const restore = menuRestoreScroll ? menuScrollY : 0;
        mobileMenu.classList.remove('is-closing');
        document.body.classList.remove('menu-open', 'menu-closing');
        // Unlock only after the sheet has left its frame. Unlocking at the
        // start lets Safari resize its toolbar/viewport beneath the slide.
        document.body.style.overflow = '';
        document.body.style.removeProperty('--bq-menu-scroll-shift');
        bindMenuViewport(false);
        setMenuPageUnavailable(false);
        if (Math.abs(window.scrollY - restore) > 2) {
          window.scrollTo({ top: restore, left: 0, behavior: 'auto' });
        }
        menuScrollY = 0;
        document.dispatchEvent(new CustomEvent('bq:menu-closed'));
      };
      /* The phone slide and desktop wipe have different durations. Clearing
         their guards at a fixed 840ms measured the desktop page mid-transition
         and left the phone waiting after its curtain was already gone. */
      const transition = menuCloseTransition();
      if (transition.element && transition.property !== 'all') {
        const ended = (event) => {
          if (event.target === transition.element && event.propertyName === transition.property) finishClose();
        };
        transition.element.addEventListener('transitionend', ended);
        menuCloseCleanup = () => transition.element.removeEventListener('transitionend', ended);
      }
      // Interrupted/no-op transitions and suspended tabs may omit transitionend.
      menuCloseTimer = window.setTimeout(finishClose, transition.milliseconds + 80);
      const focused = document.activeElement;
      const focusIsInMenu = mobileMenu.contains(focused) || focused === document.body;
      // Opening another dock panel owns its own focus. Do not drag keyboard
      // users from a language/chat button back to the menu button as it closes.
      if (focusIsInMenu && lastMenuTrigger && document.contains(lastMenuTrigger)) {
        try { lastMenuTrigger.focus({ preventScroll: true }); } catch (e) { lastMenuTrigger.focus(); }
      }
      lastMenuTrigger = null;
    }
    document.body.style.overflow = 'hidden';
    syncMenuA11y(open);
  };
  window.__bqPanels = window.__bqPanels || {};
  window.__bqPanels.menu = (options) => setMenu(false, null, options);
  menuBtn?.addEventListener('click', (event) => setMenu(!mobileMenu?.classList.contains('is-open'), event.currentTarget));
  railMenuBtn?.addEventListener('click', (event) => setMenu(!mobileMenu?.classList.contains('is-open'), event.currentTarget));
  menuCloseBtn?.addEventListener('click', () => setMenu(false));
  mobileMenu?.addEventListener('click', (e) => { if (e.target === mobileMenu) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (!mobileMenu?.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setMenu(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const scopes = menuHasDock() ? [mobileMenu, ...menuDocks] : [mobileMenu];
    const focusable = scopes.flatMap((scope) => Array.from(scope.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')))
      .filter((el) => !el.hidden && !el.inert && !el.closest('[inert]') && el.getClientRects().length);
    if (!focusable.length) return;
    // These two surfaces are siblings in the DOM. Own the full cycle rather
    // than just its ends, or native traversal can enter an unrelated cookie
    // or utility control between the menu and the toolbar.
    const current = focusable.indexOf(document.activeElement);
    const next = current < 0 ? (e.shiftKey ? focusable.length - 1 : 0)
      : (current + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
    e.preventDefault();
    try { focusable[next].focus({ preventScroll:true }); } catch (error) { focusable[next].focus(); }
  });
  mobileMenu?.querySelectorAll('.mm-link, .mm-touch, .mm-logo').forEach((a) => a.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setMenu(false, null, { restoreScroll: !a.dataset.route });
  }));

  /* Voxo behaviour: while the menu is open the receded page sheet is itself a
     close target — one click anywhere on it slides everything home. */
  document.getElementById('bqPageStage')?.addEventListener('click', (e) => {
    if (!document.body.classList.contains('menu-revealed')) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu(false);
  }, true);
  syncMenuA11y(false);
  window.addEventListener('resize', () => {
    if (!mobileMenu?.classList.contains('is-open')) return;
    syncMenuA11y(true);
    if (!menuHasDock() && menuDocks.some(dock => dock.contains(document.activeElement))) {
      try { menuCloseBtn?.focus({ preventScroll:true }); } catch (error) { menuCloseBtn?.focus(); }
    }
  }, { passive:true });

  window.__bqGoDocumentTop = (behavior = 'smooth') => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) behavior = 'auto';
    window.__bqPaperBypassUntil = performance.now() + (behavior === 'smooth' ? 1200 : 180);
    document.querySelectorAll('.room:not(.is-hidden) .paper-scroll, .footer.footer-v249.paper-sheet > .paper-scroll')
      .forEach((scroller) => { scroller.scrollTop = 0; });
    window.scrollTo({ top: 0, behavior });
  };

  document.querySelector('[data-footer-top]')?.addEventListener('click', () => {
    window.__bqGoDocumentTop('smooth');
  });

  /* Compaction changes only the dock's painted scale; CSS reserves its full
     footprint so fitted paper cannot feed scroll corrections back into this
     state. Accumulated intent and clamped bounds ignore small reversals and
     the browser's rubber-band bounce at either end of a swipe. */
  (function dockScrollState() {
    let lastY = 0, travel = 0, frame = 0, maxY = 0;
    const position = () => Math.min(maxY, Math.max(0, window.scrollY || 0));
    const update = () => {
      frame = 0;
      const y = position(), delta = y - lastY;
      lastY = y;
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) { travel = 0; return; }
      if (y < 28) {
        document.body.classList.remove('nav-compact');
        travel = 0;
        return;
      }
      if (Math.abs(delta) < 1) return;
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (Math.abs(travel) >= 24) {
        document.body.classList.toggle('nav-compact', travel > 0 && y > 56);
        travel = 0;
      }
    };
    const refreshBounds = () => {
      maxY = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
      lastY = Math.min(maxY, Math.max(0, lastY));
    };
    const refresh = () => {
      refreshBounds();
      lastY = position();
      travel = 0;
      update();
    };
    window.addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    }, { passive: true });
    // Browser-toolbar resize events interleave with each scroll sample.
    // Refresh geometry without erasing the accumulated upward/downward intent.
    window.addEventListener('resize', refreshBounds, { passive: true });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('bq:gallery-built', refreshBounds);
    document.addEventListener('bq:route', refresh);
    document.addEventListener('bq:menu-closed', refresh);
    // Image/font-driven paper measurements can extend the document after the
    // initial layout. Cache that new end outside the scroll handler.
    if (typeof ResizeObserver === 'function') new ResizeObserver(refreshBounds).observe(document.body);
    refresh();
  })();

  /* ---------- MOBILE BOTTOM-BAR POPUPS (language · socials) ----------
     Every floating panel (chat · Latest · menu · these popovers) is EXCLUSIVE:
     opening one closes all the others, through a tiny shared registry. */
  window.__bqPanels = window.__bqPanels || {};
  window.__bqExclusive = window.__bqExclusive || ((except) => {
    Object.keys(window.__bqPanels).forEach((k) => { if (k !== except) { try { window.__bqPanels[k](); } catch (e) {} } });
  });
  const langPop = document.getElementById('langPop');
  const socialPop = document.getElementById('socialPop');
  const langPopBtn = document.getElementById('langPopBtn');
  const socialPopBtn = document.getElementById('socialPopBtn');
  const setPopState = (name, open) => {
    const button = name === 'lang' ? langPopBtn : socialPopBtn;
    const panel = name === 'lang' ? langPop : socialPop;
    button?.setAttribute('aria-expanded', String(open));
    if (!panel) return;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    panel.toggleAttribute('inert', !open);
  };
  const closePops = (except) => {
    if (except !== 'lang') setPopState('lang', false);
    if (except !== 'social') setPopState('social', false);
  };
  window.__bqPanels.lang = () => closePops('social');
  window.__bqPanels.social = () => closePops('lang');
  langPopBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.__bqExclusive('lang');
    setPopState('lang', !langPop?.classList.contains('is-open'));
  });
  socialPopBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.__bqExclusive('social');
    setPopState('social', !socialPop?.classList.contains('is-open'));
  });
  langPop?.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    setPopState('lang', false);
  }));
  socialPop?.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', () => setPopState('social', false)));
  const bindPopoverKeys = (panel) => panel?.addEventListener('keydown', (e) => {
    const items = [...panel.querySelectorAll('[role="menuitem"]')].filter((item) => !item.hidden);
    if (!items.length) return;
    const current = Math.max(0, items.indexOf(document.activeElement));
    let next = current;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (current + 1) % items.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    items[next].focus();
  });
  bindPopoverKeys(langPop);
  bindPopoverKeys(socialPop);
  closePops();
  document.addEventListener('click', (e) => { if (!e.target.closest('.mobilebar-pop-wrap')) closePops(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const returnButton = langPop?.classList.contains('is-open') ? langPopBtn
      : (socialPop?.classList.contains('is-open') ? socialPopBtn : null);
    closePops();
    returnButton?.focus();
  });

  /* Desktop hover/focus flyouts live in the always-loaded shell so their
     exposed state never depends on the optional enhancement bundle. */
  (function bindDesktopFlyouts() {
    if (window.__bqDesktopFlyoutsBound) return;
    window.__bqDesktopFlyoutsBound = true;
    const GRACE = 420;
    document.querySelectorAll('.lang-hover, .social-hover').forEach((wrap) => {
      let timer;
      const trigger = wrap.querySelector(':scope > button[aria-haspopup]');
      const menu = wrap.querySelector(':scope > [role="menu"]');
      const setOpen = (open) => {
        wrap.classList.toggle('is-hovering', open);
        trigger?.setAttribute('aria-expanded', String(open));
        menu?.setAttribute('aria-hidden', String(!open));
        menu?.toggleAttribute('inert', !open);
      };
      const openIt = () => {
        clearTimeout(timer);
        wrap.classList.remove('is-flyout-dismissed');
        setOpen(true);
      };
      const closeNow = () => {
        clearTimeout(timer);
        setOpen(false);
      };
      const closeIt = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (wrap.matches(':hover') || wrap.contains(document.activeElement)) return;
          closeNow();
        }, GRACE);
      };
      wrap.addEventListener('mouseenter', openIt);
      wrap.addEventListener('mouseleave', closeIt);
      wrap.addEventListener('focusin', openIt);
      wrap.addEventListener('focusout', closeIt);
      setOpen(false);
      trigger?.addEventListener('click', () => {
        if (wrap.classList.contains('is-flyout-dismissed')) openIt();
      });
      wrap.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        try { trigger?.focus({ preventScroll: true }); } catch (err) { trigger?.focus(); }
        /* focus() synchronously fires focusin/openIt. Mark dismissal after that
           event so Escape from a menu item cannot immediately reopen itself. */
        wrap.classList.add('is-flyout-dismissed');
        closeNow();
      });
    });
  })();

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
  /* 40, not 80. A batch is one transformed reel: at 80 it stood ~15,000px tall
     with 80 images and 80 shadows, and the whole layer moves every frame, which
     is what made the portfolio heavy on a phone. Halving the batch halves that
     layer. "Load more" still reaches every work. */
  const PAGE_SIZE = 40;
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
    social:   { title: 'Social',          desc: 'Instagram grids, campaigns, and digital storytelling.',                 note: '2023—Now · Various brands' },
    events:   { title: 'Events',          desc: 'Ceremony materials, banners, and event identity design.',                note: 'Conferences & cultural events · KRG' },
    stationery: { title: 'Stationery',    desc: 'Business cards, letterheads, invoices, and receipts.',                  note: '' },
    video:    { title: 'Video',           desc: 'Documentary edits, motion reels, and protocol media coverage.',         note: '2019—Now · KRG official media' },
    other:    { title: 'Other Works',     desc: 'Miscellaneous — flex banners, type experiments, and notes.',            note: 'Always ongoing' },
    certificate: { title: 'Certificates', desc: 'Recognition, awards, and studio credentials.',                           note: 'Selected · Studio archive' },
  };

  /* Rich portfolio-tab preview lives in the critical bundle so the very
     first hover works on a fresh Home / Design visit. Keep it under body: a
     fixed card must never be clipped by the rounded work scroller. */
  (function initTabHoverCards() {
    if (window.__bqTabCardsBound || !tabs.length) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    window.__bqTabCardsBound = true;

    const INFO = {
      all:        { tag: 'Full catalogue',        desc: 'Every discipline gathered in one place — the complete body of work.' },
      official:   { tag: 'Official · Editorial', desc: 'Editorial design — books, layouts, and official publications.' },
      book:       { tag: 'Print · Covers',        desc: 'Book covers — typography, illustration, and print composition.' },
      image:      { tag: 'Photography',            desc: 'Photo editing, composites, and editorial retouching.' },
      logo:       { tag: 'Brand identity',         desc: 'Logos, wordmarks, and visual identities drawn by hand.' },
      posters:    { tag: 'Print',                  desc: 'Cultural, political, and typographic poster series.' },
      social:     { tag: 'Digital',                desc: 'Social campaigns, grids, and digital storytelling.' },
      events:     { tag: 'Identity',               desc: 'Ceremony materials, banners, and event identity design.' },
      stationery: { tag: 'Stationery',             desc: 'Business cards, letterheads, invoices and receipts — the quiet system behind a brand.' },
      video:      { tag: 'Motion',                 desc: 'Documentary edits, motion reels, and media coverage.' },
      other:      { tag: 'Miscellany',             desc: 'Flex banners, type experiments, and the small things.' },
      certificate: { tag: 'Credentials',           desc: 'Recognition, awards, and studio credentials on paper.' },
    };

    const card = document.createElement('div');
    card.className = 'tab-card';
    card.setAttribute('role', 'tooltip');
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <span class="mono tab-card-tag"></span>
      <h4 class="tab-card-title"></h4>
      <p class="tab-card-desc"></p>`;
    document.body.appendChild(card);

    const tag = card.querySelector('.tab-card-tag');
    const title = card.querySelector('.tab-card-title');
    const desc = card.querySelector('.tab-card-desc');
    let activeTab = null;
    let hideTimer = 0;

    const translatedInfo = (filter) => {
      const lang = document.documentElement.dataset.lang || 'en';
      return window.TABCARD_I18N?.[lang]?.[filter] || INFO[filter];
    };
    const hide = (immediate = false) => {
      clearTimeout(hideTimer);
      const close = () => {
        card.classList.remove('is-shown');
        card.setAttribute('aria-hidden', 'true');
        activeTab?.removeAttribute('aria-describedby');
        activeTab = null;
      };
      if (immediate) close();
      else hideTimer = window.setTimeout(close, 120);
    };
    const show = (tab) => {
      const filter = tab.dataset.filter;
      const info = translatedInfo(filter);
      if (!info) return;
      clearTimeout(hideTimer);
      activeTab?.removeAttribute('aria-describedby');
      activeTab = tab;
      tag.textContent = info.tag;
      title.textContent = (tab.querySelector('.tab-label')?.textContent || filter).trim();
      desc.textContent = info.desc;
      card.id = 'portfolioTabPreview';
      tab.setAttribute('aria-describedby', card.id);
      card.style.visibility = 'hidden';
      card.classList.add('is-shown');
      card.setAttribute('aria-hidden', 'false');

      const tabRect = tab.getBoundingClientRect();
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;
      let left = tabRect.right + 14;
      if (left + cardWidth > window.innerWidth - 12) left = tabRect.left - cardWidth - 14;
      const top = Math.max(12, Math.min(
        tabRect.top + (tabRect.height - cardHeight) / 2,
        window.innerHeight - cardHeight - 12,
      ));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.visibility = '';
    };

    tabs.forEach((tab) => {
      tab.addEventListener('mouseenter', () => show(tab));
      tab.addEventListener('mouseleave', () => hide());
      tab.addEventListener('focus', () => show(tab));
      tab.addEventListener('blur', () => hide());
      tab.addEventListener('click', () => hide(true));
    });
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', () => hide());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide(true);
    });
  }());

  const getTabMeta = () =>
    (window.TAB_META_I18N && window.TAB_META_I18N[currentLang]) ||
    (window.TAB_META_I18N && window.TAB_META_I18N.en) || TAB_META;

  const updateTabHeader = (filter, total) => {
    const tm    = getTabMeta();
    const meta  = tm[filter] || TAB_META[filter] || tm.all;   // ai/stationery may only exist in the base TAB_META
    const title = document.getElementById('tabHeaderTitle');
    const desc  = document.getElementById('tabHeaderDesc');
    const note  = document.getElementById('tabHeaderNote');
    const ghost = document.getElementById('tabHeaderGhost');
    if (!title) return;
    title.textContent = meta.title;
    if (desc)  desc.textContent  = meta.desc || '';
    if (note)  note.textContent  = meta.note || '';
    if (ghost) ghost.dataset.ghost = '';
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
    const workTrack = document.querySelector('#design.paper-stack > .section.work.paper-sheet');
    if (workTrack) delete workTrack.dataset.overflowFloor;
    buildColumns(colCountForWidth());
    const matching = matchingCards();
    const target = Math.max(0, Math.min(n, matching.length));
    placeCards(matching.slice(0, target));
    currentShown = target;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
  };
  const scrollToGridTop = (behavior = 'smooth') => {
    const workScroller = document.querySelector('.section.work > .paper-scroll');
    const head = workScroller?.querySelector(':scope > .section-head') || document.querySelector('.section.work > .section-head') || document.getElementById('tabHeader') || gridEl;
    if (!head) return;
    if (workScroller?.contains(head)) {
      const targetTop = head.classList?.contains('section-head') ? 0 : head.offsetTop;
      const paperTarget = head.classList?.contains('section-head') ? workScroller : head;
      /* Portfolio owns its tall reel. Ask its page-track mapper before the
         generic paper helper, which intentionally treats .work as non-inner. */
      if (window.__bqScrollWorkTarget?.(head, { behavior, block: 'start' })) return;
      if (window.__bqScrollPaperTarget?.(paperTarget, { behavior, block: 'start' })) return;
      workScroller.scrollTo({ top: Math.max(0, targetTop), behavior });
      return;
    }
    const topbar = document.querySelector('.rail');
    const topbarH = topbar && getComputedStyle(topbar).position === 'fixed'
      ? topbar.getBoundingClientRect().height
      : 0;
    /* the sticky tab circles sit BELOW the intro in the document — the offset
       is only needed when falling back to the tab header (they'd cover it) */
    const targetIsIntro = head.classList && head.classList.contains('section-head');
    const stickyTabs = (!targetIsIntro && isCompact()) ? document.querySelector('.section.work > .tabs-wrap') : null;
    const stickyTabsH = stickyTabs && getComputedStyle(stickyTabs).position === 'sticky'
      ? stickyTabs.getBoundingClientRect().height
      : 0;
    const gap = isCompact() ? 24 : 18;
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
  let mHeights = [];   // tracked heights from exact manifest aspect ratios
  const CARD_GAP = 16;
  const CAPTION_EST = 48;

  const colCountForWidth = () => {
    const w = window.innerWidth;
    if (w <= 560)  return 2;
    if (w <= 1024) return 3;
    if (w <= 1280) return 4;
    if (w <= 1450) return 5;
    return 6;
  };

  let portfolioRevealObserver = null;
  let portfolioRevealFrame = 0;
  const pendingPortfolioReveals = new Map();
  const prepPortfolioReveal = (card, colIndex, media, rank) => {
    if (!card) return;
    card.classList.remove('portfolio-in');
    card.classList.add('portfolio-scroll-card');
    card.style.setProperty('--portfolio-delay', '0ms');

    pendingPortfolioReveals.set(card, matchMedia('(prefers-reduced-motion: reduce)').matches
      || !('IntersectionObserver' in window));
    if (portfolioRevealFrame) return;
    // All cards placed in this turn share one frame; registration still waits
    // until masonry has connected them and preserves the existing reveal mode.
    portfolioRevealFrame = requestAnimationFrame(() => {
      portfolioRevealFrame = 0;
      pendingPortfolioReveals.forEach((immediate, pendingCard) => {
        if (immediate) { pendingCard.classList.add('portfolio-in'); return; }
        if (!pendingCard.isConnected) return;
        if (!portfolioRevealObserver) {
          portfolioRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('portfolio-in');
              portfolioRevealObserver.unobserve(entry.target);
            });
          }, { threshold: 0.01, rootMargin: '0px 0px 18% 0px' });
        }
        portfolioRevealObserver.observe(pendingCard);
      });
      pendingPortfolioReveals.clear();
    });
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

  const placeCard = (entry, rank, colWidth) => {
    let card = entry && entry.el;
    if (!card && entry && entry.item && window.__bqBuildGalleryCard) {
      card = window.__bqBuildGalleryCard(entry.item);
      entry.el = card;
    }
    if (!card) return;
    const heights = mHeights, cols = mCols;       // capture current layout refs
    let i = 0;
    for (let k = 1; k < heights.length; k++) if (heights[k] < heights[i]) i = k;
    const media = card.querySelector('img, video');
    if (media && media.tagName === 'IMG') {
      media.loading = 'lazy';
      media.fetchPriority = 'low';
    }
    cols[i].appendChild(card);
    const source = entry.item || {};
    const mediaWidth = Number(source.width) || Number(media && media.getAttribute('width')) || 4;
    const mediaHeight = Number(source.height) || Number(media && media.getAttribute('height')) || 5;
    heights[i] += Math.round(colWidth * mediaHeight / mediaWidth) + CAPTION_EST + CARD_GAP;

    prepPortfolioReveal(card, i, media, rank);
  };

  // The column width is identical throughout a batch. Reading it after every
  // append forces layout once per card, which stalls a phone on "Load more".
  const placeCards = (entries, startRank = 0) => {
    if (!entries.length || !mCols.length) return;
    const gridWidth = gridEl.clientWidth || window.innerWidth;
    const colWidth = Math.max(1, (gridWidth - CARD_GAP * Math.max(0, mCols.length - 1)) / mCols.length);
    entries.forEach((entry, index) => placeCard(entry, startRank + index, colWidth));
  };

  let categoryOrderSource = null, categoryOrderFilter = null, categoryOrder = [];
  const categoryFirst = new Map();
  const matchingCards = () => {
    const source = window.BQ_ALL_CARDS || [];
    if (source !== categoryOrderSource) {
      categoryOrderSource = source;
      categoryOrderFilter = null;
      categoryFirst.clear();
    }
    // A visit owns one order. Load-more, resizing and translated labels keep
    // that exact sequence; only entering a different tab creates a new one.
    if (categoryOrderFilter === currentFilter) return categoryOrder;
    let list = source.filter(e => currentFilter === 'all' || e.cat === currentFilter);
    const previousFirst = categoryFirst.get(currentFilter);
    if (categoryFirst.has(currentFilter)) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    if (currentFilter === 'all') {
      const stills = [], videos = [];
      list.forEach(e => (e.type === 'video' ? videos : stills).push(e));
      list = stills.concat(videos);
    }
    // Chance must not make a return look unchanged. Prefer another still in
    // All Work so its opening batch stays light; a tiny mixed set still varies.
    if (list.length > 1 && list[0] === previousFirst) {
      let swap = list.findIndex((entry, i) => i > 0 && entry.type === list[0].type);
      if (swap < 1) swap = 1;
      [list[0], list[swap]] = [list[swap], list[0]];
    }
    categoryOrder = list;
    categoryOrderFilter = currentFilter;
    categoryFirst.set(currentFilter, list[0]);
    return categoryOrder;
  };

  /* Keep the first visit reproducible and varied. Re-entered tabs shuffle
     their own lightweight record list without changing this source catalogue. */
  const shuffleAllCards = () => {
    const a = window.BQ_ALL_CARDS;
    if (!Array.isArray(a) || a.__bqShuffled) return;
    let seed = 0x0b047a5;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    Object.defineProperty(a, '__bqShuffled', { value: true });
    categoryOrderSource = null;
  };
  /* render the gallery. reset=true rebuilds columns (tab switch / resize). */
  window.__bqRenderGallery = (reset) => {
    if (!gridEl) return;
    if (reset) {
      shuffleAllCards();
      buildColumns(colCountForWidth());
      currentShown = 0;
    }
    const matching = matchingCards();
    /* A second batch continues the masonry: each card goes straight under the
       last card of the shortest column, so no column is left with a hole above
       the new work. Loaded fallback media can correct a card's ratio after
       placement, so start from the rendered heights — read every column once,
       before any append, rather than forcing layout between cards. */
    if (!reset && currentShown > 0 && mCols.length) {
      mHeights = mCols.map(col => col.offsetHeight);
    }
    const batch = matching.slice(currentShown, currentShown + PAGE_SIZE);
    placeCards(batch, currentShown);
    currentShown += batch.length;
    updateTabHeader(currentFilter, matching.length);
    updateLoadMore(matching.length);
  };

  const freezeWorkTrack = () => 0;
  const thawWorkTrack = (_track, after) => { after?.(); };

  // Re-translate the tab header + load-more in place when the language flips
  window.__bqRerenderChrome = () => {
    if (!gridEl) return;
    const total = matchingCards().length;
    updateTabHeader(currentFilter, total);
    updateLoadMore(total);
  };

  const setActiveTab = (tab) => {
    if (!tab) return;
    tabs.forEach(t => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    if (gridEl) gridEl.setAttribute('aria-labelledby', tab.id);
    currentFilter = tab.dataset.filter;
    window.__bqRenderGallery(true);
  };

  const activateTab = (tab, push) => {
    if (!tab) return;
    if (tab.classList.contains('is-active') && currentFilter === tab.dataset.filter) {
      if (push !== false) syncURL(!!push);
      return;
    }

    const currentScrollY = window.scrollY;

    // Lock grid height before clearing so document never collapses and scroll never clamps
    if (gridEl) {
      const curH = gridEl.offsetHeight;
      if (curH > 200) {
        gridEl.style.minHeight = curH + 'px';
      }
    }

    setActiveTab(tab);
    if (push !== false) syncURL(!!push);

    const lockScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = Math.min(currentScrollY, Math.max(0, maxScroll));
      if (Math.abs(window.scrollY - targetScroll) > 0.5) {
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      }
    };

    /* Choosing a category is asking to see that category — from its first
       piece. Holding the reader's old offset dropped them into the middle of
       the new set, past work they had never seen. The height lock still runs
       so the document cannot collapse mid-swap; only the destination changed.
       A restore from the URL keeps its position, since that IS the position
       being restored. */
    if (push === false) {
      lockScroll();
      requestAnimationFrame(() => {
        lockScroll();
        requestAnimationFrame(() => {
          if (gridEl) gridEl.style.minHeight = '';
          lockScroll();
        });
      });
      return;
    }

    lockScroll();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (gridEl) gridEl.style.minHeight = '';
        /* Computed rather than looked up. scrollToGridTop() finds the intro by
           querying the card's direct children, but the intro now lives inside
           the reel on desktop, so it fell through to a fallback that left the
           reader mid-set. The reel sits at its start when the page is scrolled
           to the track's own top, which is arithmetic the layout cannot
           mislead. */
        if (window.__bqResetWorkReel) window.__bqResetWorkReel();
        else scrollToGridTop('auto');
      });
    });
  };

  /* Rebuild only at a column breakpoint, before the deck's queued frame
     measures its track. Delaying this left phone columns at desktop width
     for one measurement and could move the reader into a later paper. */
  window.addEventListener('resize', () => {
    if (!gridEl || !mCols.length) return;
    if (colCountForWidth() === mCols.length) return;
    const shown = currentShown;
    buildColumns(colCountForWidth());
    currentShown = 0;
    const entries = matchingCards().slice(0, shown);
    placeCards(entries);
    currentShown = entries.length;
    updateLoadMore(matchingCards().length);
  }, { passive: true });

  const clearWorkOverflowFloor = () => {
    const workTrack = document.querySelector('#design.paper-stack > .section.work.paper-sheet');
    if (workTrack) delete workTrack.dataset.overflowFloor;
  };

  /* Load more — appends to the bottom of the shortest columns */
  /* Services follow the native paper track below. Click and keyboard
     controls can also select a chapter; hover never changes it. */

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    window.__bqPrepareWorkAppend?.();
    clearWorkOverflowFloor();
    window.__bqRenderGallery(false);
  });
  /* Show fewer (one batch) / collapse all the way back to the first batch */
  document.getElementById('loadLessBtn')?.addEventListener('click', () => window.__bqShowFewer());
  document.getElementById('loadCollapseBtn')?.addEventListener('click', () => window.__bqCollapseAll());

  tabs.forEach((tab, index) => {
    tab.id = tab.id || `portfolio-tab-${tab.dataset.filter || index}`;
    tab.setAttribute('aria-controls', 'grid');
    tab.setAttribute('tabindex', tab.classList.contains('is-active') ? '0' : '-1');
    tab.addEventListener('click', () => activateTab(tab, true));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      activateTab(tabs[next], true);
    });
  });

  /* Returning to a tab gives its works a fresh order, stable for that visit.
     The gallery shows one batch (PAGE_SIZE = 40) at a time; the reader
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
    // The shared top action owns this reset too. Delayed retries would rewind
    // a new swipe immediately after returning to the foreground.
    window.__bqGoDocumentTop('auto');
    if (window.__bqOnScroll) window.__bqOnScroll();
  };

  /* ---------- COUNT UP (statistics) ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const startTime = performance.now();
    /* Replacing textContent every frame emits child-list mutations, which the
       paper observer interprets as new content and fits the entire deck again.
       Reuse the text node; ResizeObserver still catches real size changes. */
    let text = el.firstChild;
    if (!text || text.nodeType !== 3 || text.nextSibling) {
      text = document.createTextNode('');
      el.replaceChildren(text);
    }
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.floor(eased * target);
      const value = (v >= 1000 ? v.toLocaleString() : v) + suffix;
      if (text.data !== value) text.data = value;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- REVEAL on scroll ---------- */
  const markReveal = () => {
    /* .card visibility is handled entirely by activateTab pagination — excluded here */
    document.querySelectorAll('.blog-card, .tl-item, .bio-card, .honor, .lang-item, .orgs li, .service, .qc-card, .stat, .studio-card, .studio-step, .studio-proof-item, .pj-cta-section')
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
  const normalizedStartRoom = startRoomRaw;
  const startRoom = validRooms.includes(normalizedStartRoom) ? normalizedStartRoom : 'design';
  showRoom(startRoom);
  if (startRoom === 'design' && startTab) {
    const t0 = document.querySelector(`.tab[data-filter="${startTab}"]`);
    if (t0) activateTab(t0);
  }
  if (normalizedStartRoom === 'design') {
    // Wait for the full sheet before resolving a deep link. A fixed 80 ms
    // timer can run while the critical-CSS gate still hides the gallery.
    let restored = false;
    const restorePortfolio = () => {
      if (restored || document.documentElement.classList.contains('bq-css-pending')) return;
      restored = true;
      requestAnimationFrame(() => {
        if (document.body.dataset.room !== 'design') return;
        if (window.__bqResetWorkReel) window.__bqResetWorkReel();
        else scrollToGridTop('auto');
      });
    };
    window.addEventListener('bq:css-ready', restorePortfolio, { once: true });
    window.addEventListener('load', restorePortfolio, { once: true });
    setTimeout(restorePortfolio, 80);
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
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-describedby', 'lbCaption');
    overlay.inert = true;
    overlay.innerHTML = `
      <div class="lb-img-wrap" id="lbWrap">
        <button type="button" class="lb-close" id="lbClose" aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        <span class="lb-status" id="lbStatus" role="status" aria-live="polite"></span>
        <button type="button" class="lb-retry" id="lbRetry" hidden>Try again</button>
        <span class="lb-caption" id="lbCaption" aria-live="polite"></span>
        <span class="lb-counter" id="lbCounter" aria-hidden="true"></span>
      </div>
      <button type="button" class="lb-prev" id="lbPrev" aria-label="Previous"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
      <button type="button" class="lb-next" id="lbNext" aria-label="Next"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
    `;
    document.body.appendChild(overlay);

    const wrap = document.getElementById('lbWrap');
    const caption = document.getElementById('lbCaption');
    const counter = document.getElementById('lbCounter');
    const status = document.getElementById('lbStatus');
    const closeBtn = document.getElementById('lbClose');
    const prevBtn = document.getElementById('lbPrev');
    const nextBtn = document.getElementById('lbNext');
    const retryBtn = document.getElementById('lbRetry');
    let pool = [], cur = 0, lbMedia = null, lastFocus = null;
    let releaseFallback = null, savedOverflow = '', loadTimer = null;
    const backgroundState = new Map();
    const isOpen = () => overlay.classList.contains('is-open');
    const locale = () => document.documentElement.dataset.lang || 'en';
    const message = (key) => {
      const messages = {
        en: ['Preview unavailable. Please try again.', 'Try again'],
        ku: ['پێشبینین بەردەست نییە. تکایە دووبارە هەوڵ بدەرەوە.', 'دووبارە هەوڵ بدەرەوە'],
        ar: ['المعاينة غير متاحة. يرجى المحاولة مرة أخرى.', 'حاول مرة أخرى'],
        kmr: ['Pêşdîtin ne berdest e. Dîsa biceribîne.', 'Dîsa biceribîne'],
        fr: ['Aperçu indisponible. Veuillez réessayer.', 'Réessayer'],
        tr: ['Önizleme kullanılamıyor. Lütfen tekrar deneyin.', 'Tekrar dene'],
        sv: ['Förhandsvisningen är inte tillgänglig. Försök igen.', 'Försök igen'],
      };
      return (messages[locale()] || messages.en)[key === 'retry' ? 1 : 0];
    };
    const syncLightboxA11y = () => {
      const dict = window.BQ_DICT || {};
      overlay.setAttribute('aria-label', dict['a11y.preview'] || 'Portfolio preview');
      closeBtn.setAttribute('aria-label', dict['a11y.close'] || 'Close');
      prevBtn.setAttribute('aria-label', dict['a11y.previous'] || 'Previous');
      nextBtn.setAttribute('aria-label', dict['a11y.next'] || 'Next');
      retryBtn.textContent = message('retry');
      if (isOpen()) {
        const item = pool[cur];
        const title = item.sourceEl?.dataset.title || item.title || '';
        caption.textContent = title;
        if (lbMedia?.tagName === 'IMG') lbMedia.alt = title;
        const position = `${cur + 1} / ${pool.length}`;
        counter.textContent = /^(ku|ar)$/.test(locale())
          ? position.replace(/[0-9]/g, digit => '٠١٢٣٤٥٦٧٨٩'[digit]) : position;
        if (!retryBtn.hidden) status.textContent = message('error');
      }
    };
    syncLightboxA11y();
    window.__bqLangCb = window.__bqLangCb || [];
    window.__bqLangCb.push(syncLightboxA11y);

    const clearMedia = () => {
      clearTimeout(loadTimer);
      releaseFallback?.();
      releaseFallback = null;
      if (!lbMedia) return;
      const previous = lbMedia;
      lbMedia = null;
      previous.onload = previous.onloadeddata = previous.onloadedmetadata = previous.onerror = null;
      if (previous.tagName === 'VIDEO') {
        previous.pause();
        previous.removeAttribute('src');
        previous.load();
      }
      previous.remove();
    };
    const restoreBackground = () => {
      backgroundState.forEach((wasInert, element) => { element.inert = wasInert; });
      backgroundState.clear();
    };
    const close = () => {
      if (!isOpen()) return;
      overlay.classList.remove('is-open');
      clearMedia();
      document.body.style.overflow = savedOverflow;
      restoreBackground();
      if (lastFocus?.isConnected && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
      } else if (overlay.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      overlay.setAttribute('aria-hidden', 'true');
      overlay.inert = true;
      lastFocus = null;
    };
    const show = (index, focus = false) => {
      if (!pool.length) return;
      const opening = !isOpen();
      if (opening) {
        lastFocus = document.activeElement;
        savedOverflow = document.body.style.overflow;
        Array.from(document.body.children).forEach(element => {
          if (element === overlay || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)) return;
          backgroundState.set(element, element.inert);
          element.inert = true;
        });
        document.dispatchEvent(new CustomEvent('bq:lightbox-open'));
      }
      cur = ((index % pool.length) + pool.length) % pool.length;
      clearMedia();
      overlay.inert = false;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      prevBtn.hidden = nextBtn.hidden = pool.length < 2;
      retryBtn.hidden = true;
      wrap.setAttribute('aria-busy', 'true');
      status.textContent = (window.BQ_DICT || {})['cert.loading'] || 'Loading…';
      status.hidden = false;
      syncLightboxA11y();

      const item = pool[cur];
      const media = document.createElement(item.type === 'video' ? 'video' : 'img');
      lbMedia = media;
      media.style.opacity = '0';
      const ready = () => {
        // A slow response from an earlier slide must never mutate the new one.
        if (lbMedia !== media || !isOpen()) return;
        clearTimeout(loadTimer);
        media.style.opacity = '1';
        status.hidden = true;
        retryBtn.hidden = true;
        wrap.setAttribute('aria-busy', 'false');
      };
      const failed = () => {
        if (lbMedia !== media || !isOpen()) return;
        clearTimeout(loadTimer);
        wrap.setAttribute('aria-busy', 'false');
        status.textContent = message('error');
        status.hidden = false;
        retryBtn.hidden = false;
      };
      if (item.type === 'video') {
        media.controls = true;
        media.setAttribute('controlslist', 'nodownload');
        media.autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
        media.playsInline = true;
        media.preload = 'metadata';
        media.title = item.title || '';
        media.onloadedmetadata = ready;
        media.onloadeddata = ready;
      } else {
        media.alt = item.sourceEl?.dataset.title || item.title || '';
        media.decoding = 'async';
        media.onload = ready;
      }
      const gallery = window.BQ_GALLERY;
      const raw = item.raw || (gallery && item.full.startsWith(gallery.MEDIA_BASE + '/')
        ? gallery.RAW_BASE + item.full.slice(gallery.MEDIA_BASE.length) : '');
      if (gallery?.bindMediaFallback) {
        releaseFallback = gallery.bindMediaFallback(media, [raw], failed);
      } else media.onerror = failed;
      wrap.insertBefore(media, status);
      media.src = item.full;
      // A stalled connection leaves a usable retry control instead of an
      // indefinite blank modal. A later successful load still clears it.
      loadTimer = setTimeout(failed, 20000);
      if (opening || focus) requestAnimationFrame(() => { if (isOpen()) closeBtn.focus({ preventScroll: true }); });
    };
    const openPool = (items, index = 0) => {
      if (!Array.isArray(items) || !items.length) return;
      const nextPool = items.filter(item => item && typeof item.full === 'string' && item.full);
      if (!nextPool.length) return;
      pool = nextPool;
      show(Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0, true);
    };
    window.__bqOpenLightboxPool = openPool;
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    prevBtn.addEventListener('click', () => show(cur - 1));
    nextBtn.addEventListener('click', () => show(cur + 1));
    retryBtn.addEventListener('click', () => show(cur, true));
    document.addEventListener('bq:route', close);
    document.addEventListener('keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      const isRTL = document.documentElement.dir === 'rtl';
      // The arrow keys retain their native seeking behavior on video controls.
      if (!event.target.closest('video') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        show(cur + (isRTL ? -direction : direction));
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), video[controls]'))
          .filter(element => !element.hidden && element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (!first) return;
        if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    });

    let touchStart = null;
    wrap.addEventListener('touchstart', event => {
      touchStart = event.touches.length === 1 && !event.target.closest('video, button')
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    wrap.addEventListener('touchend', event => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const next = dx < 0 ? 1 : -1;
        show(cur + (document.documentElement.dir === 'rtl' ? -next : next));
      }
    }, { passive: true });
    wrap.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

    document.addEventListener('click', event => {
      const card = event.target.closest('#grid .card--photo');
      if (!card) return;
      /* .card-open is a link to the work's own page. A plain click stays in
         the lightbox; a new-tab / new-window click is left to the browser. */
      if (event.target.closest('a.card-open')) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
      }
      // Masonry columns rearrange the DOM. Follow catalogue order so previous
      // and next remain predictable after filtering or changing screen width.
      const cards = matchingCards().map(entry => entry.el).filter(element => element?.isConnected);
      const items = cards.map(element => ({
        full: element.dataset.full, title: element.dataset.title,
        raw: element.dataset.raw,
        type: element.dataset.type || 'image', sourceEl: element,
      }));
      openPool(items, Math.max(0, cards.indexOf(card)));
    });
  };

  /* ---------- INDEX LAYOUT (interactive hover preview) ---------- */
  /* highlight one word in the title with gold italic */
  const highlightTitle = (title) => {
    /* Titles can come from the CMS. Escape every word before adding the one
       presentation-only span so highlighting can never turn authored text
       into executable markup. */
    const escapeTitle = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
    const words = String(title ?? '').split(' ');
    if (words.length < 2) return escapeTitle(words[0] || '');
    const i = Math.floor(words.length / 2);
    return words.map((word, index) => index === i
      ? `<span class="hl">${escapeTitle(word)}</span>`
      : escapeTitle(word)).join(' ');
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
    const pitchCopy = {
      en: { missing: 'Please add your name, email and a short message.', email: 'Please enter a valid email address.', sending: 'Sending your pitch…', success: 'Thank you — your pitch is saved in my studio inbox. I aim to reply within 48 hours.', failure: 'Your pitch could not be sent. Your text is saved here; please try again or email hello@bqurtas.com.', timeout: 'Sending took too long to confirm. Your text is saved here; contact hello@bqurtas.com if you need help.' },
      ku: { missing: 'تکایە ناو، ئیمەیڵ و پەیامێکی کورت بنووسە.', email: 'تکایە ناونیشانێکی دروستی ئیمەیڵ بنووسە.', sending: 'پەیامەکەت دەنێردرێت…', success: 'سوپاس — پەیامەکەت لە سندووقی ستۆدیۆکەم پاشەکەوت کرا. هەوڵ دەدەم لە ٤٨ کاتژمێردا وەڵام بدەمەوە.', failure: 'پەیامەکەت نەنێردرا. دەقەکەت لێرە ماوەتەوە؛ تکایە دووبارە هەوڵ بدەوە یان ئیمەیڵ بنێرە بۆ hello@bqurtas.com.', timeout: 'پشتڕاستکردنەوەی ناردن زۆری خایاند. دەقەکەت لێرە ماوەتەوە؛ بۆ یارمەتی ئیمەیڵ بنێرە بۆ hello@bqurtas.com.' },
      kmr: { missing: 'Ji kerema xwe nav, e-name û peyameke kurt binivîse.', email: 'Ji kerema xwe navnîşaneke e-nameyê ya derbasdar binivîse.', sending: 'Peyama te tê şandin…', success: 'Spas — peyama te di qutiya stûdyoya min de hat tomarkirin. Ez hewl didim di nav 48 saetan de bersiv bidim.', failure: 'Peyama te nehat şandin. Nivîsa te li vir maye; dîsa biceribîne an e-nameyê bişîne hello@bqurtas.com.', timeout: 'Piştrastkirina şandinê pir dirêj kir. Nivîsa te li vir maye; ji bo alîkariyê binivîse hello@bqurtas.com.' },
      ar: { missing: 'يرجى إدخال اسمك وبريدك الإلكتروني ورسالة قصيرة.', email: 'يرجى إدخال عنوان بريد إلكتروني صالح.', sending: 'جارٍ إرسال رسالتك…', success: 'شكراً — حُفظت رسالتك في صندوق الاستوديو. أسعى للرد خلال ٤٨ ساعة.', failure: 'تعذر إرسال رسالتك. ما زال نصك هنا؛ حاول مجدداً أو راسل hello@bqurtas.com.', timeout: 'استغرق تأكيد الإرسال وقتاً طويلاً. ما زال نصك هنا؛ للمساعدة راسل hello@bqurtas.com.' },
      fr: { missing: 'Indiquez votre nom, votre adresse e-mail et un court message.', email: 'Indiquez une adresse e-mail valide.', sending: 'Envoi de votre message…', success: 'Merci — votre message est enregistré dans la boîte du studio. Je vise une réponse sous 48 heures.', failure: 'Votre message n’a pas pu être envoyé. Votre texte est conservé ici ; réessayez ou écrivez à hello@bqurtas.com.', timeout: 'L’envoi n’a pas pu être confirmé à temps. Votre texte est conservé ici ; contactez hello@bqurtas.com si besoin.' },
      tr: { missing: 'Lütfen adınızı, e-posta adresinizi ve kısa bir mesaj yazın.', email: 'Lütfen geçerli bir e-posta adresi girin.', sending: 'Mesajınız gönderiliyor…', success: 'Teşekkürler — mesajınız stüdyo gelen kutuma kaydedildi. 48 saat içinde yanıt vermeyi hedefliyorum.', failure: 'Mesajınız gönderilemedi. Metniniz burada duruyor; tekrar deneyin veya hello@bqurtas.com adresine yazın.', timeout: 'Gönderimin onaylanması çok uzun sürdü. Metniniz burada duruyor; yardım için hello@bqurtas.com adresine yazın.' },
      sv: { missing: 'Ange ditt namn, din e-postadress och ett kort meddelande.', email: 'Ange en giltig e-postadress.', sending: 'Skickar ditt meddelande…', success: 'Tack — ditt meddelande har sparats i studions inkorg. Jag siktar på att svara inom 48 timmar.', failure: 'Ditt meddelande kunde inte skickas. Din text finns kvar här; försök igen eller skriv till hello@bqurtas.com.', timeout: 'Det tog för lång tid att bekräfta sändningen. Din text finns kvar här; kontakta hello@bqurtas.com om du behöver hjälp.' }
    };
    const showPitchStatus = (kind) => {
      if (!status) return;
      const copy = pitchCopy[currentLang] || pitchCopy.en;
      status.style.color = ['sending', 'success'].includes(kind) ? 'var(--gold)' : 'var(--ember)';
      const icon = document.createElement('i');
      icon.className = `fa-solid ${kind === 'sending' ? 'fa-spinner fa-spin' : kind === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`;
      icon.setAttribute('aria-hidden', 'true');
      status.replaceChildren(icon, document.createTextNode(` ${copy[kind]}`));
    };
    let pitchSending = false;
    let pitchRequest = null;
    form.addEventListener('input', (event) => {
      if (event.target && event.target.removeAttribute) event.target.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (pitchSending) return;
      // Safe readers: optional brief fields may be hidden or absent in older cached markup.
      const val = (sel) => { const el = form.querySelector(sel); return el ? el.value.trim() : ''; };
      const chk = (sel) => { const el = form.querySelector(sel); return !!(el && el.checked); };
      const name = val('#pName');
      const email = val('#pEmail');
      const message = val('#pMessage');
      const type = val('#pType') || 'Project enquiry';   // optional now
      const required = [['#pName', name], ['#pEmail', email], ['#pMessage', message]];
      const invalidEmail = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const invalid = required.filter(([selector, value]) => !value || (selector === '#pEmail' && invalidEmail));
      required.forEach(([selector]) => {
        const field = form.querySelector(selector);
        if (field) field.setAttribute('aria-invalid', invalid.some(([id]) => id === selector) ? 'true' : 'false');
      });
      if (invalid.length) {
        showPitchStatus(!name || !email || !message ? 'missing' : 'email');
        const first = form.querySelector(invalid[0][0]);
        if (first) first.focus();
        return;
      }
      const fields = {
        company:      val('#pCompany'),
        phone:        val('#pPhone'),
        project_type: type,
        budget:       val('#pBudget'),
        timeline:     val('#pTimeline'),
        heard_about:  val('#pHear'),
        references:   val('#pRefs'),
        nda:          chk('#pNDA'),
        website:      val('#pWebsite'),
        lang:         currentLang
      };
      const payload = JSON.stringify({ name, email, message, ...fields });
      // Reuse an opaque ID only for the identical draft after an uncertain
      // network response; the server makes these retries idempotent.
      if (!pitchRequest || pitchRequest.payload !== payload) pitchRequest = { payload, id: crypto.randomUUID() };
      const requestId = pitchRequest.id;
      const submit = form.querySelector('[type="submit"]');
      const wasDisabled = !!(submit && submit.disabled);
      // Keep every draft field if the visitor edits anything while delivery is pending.
      const snapshot = Array.from(form.elements).filter(el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))
        .map(el => ({ el, value: el.value, checked: el.checked }));
      const controller = new AbortController();
      let timedOut = false;
      let timeout;
      pitchSending = true;
      form.setAttribute('aria-busy', 'true');
      if (submit) submit.disabled = true;
      showPitchStatus('sending');
      try {
        const deadline = new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error('pitch-timeout'));
          }, 15_000);
        });
        const delivery = fetch('/api/contact', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ request_id: requestId, name, email, message, ...fields }),
          signal: controller.signal
        }).then(async response => {
          if (!response.ok) throw new Error('pitch-http-error');
          const result = await response.json();
          if (!result || result.ok !== true || result.status !== 'stored') throw new Error('pitch-rejected');
        });
        await Promise.race([delivery, deadline]);
        if (pitchRequest && pitchRequest.id === requestId) pitchRequest = null;
        showPitchStatus('success');
        if (snapshot.every(({ el, value, checked }) => el.value === value && el.checked === checked)) form.reset();
      } catch (error) {
        showPitchStatus(timedOut ? 'timeout' : 'failure');
      } finally {
        clearTimeout(timeout);
        pitchSending = false;
        form.removeAttribute('aria-busy');
        if (submit) submit.disabled = wasDisabled;
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

});

/* =========================================================
   AI pill — tap to reveal "Shaping the future" (reliable on
   touch, where :focus on a <span> is flaky on iOS)
   ========================================================= */
(function aiPill() {
  var pill = document.querySelector('.hero-services-ai');
  if (!pill) return;
  // TAP / CLICK toggles on EVERY device — the reliable primary path (works on a
  // phone tap whether or not the browser falsely reports hover capability).
  var setOpen = function (open) {
    pill.classList.toggle('is-open', open);
    pill.setAttribute('aria-expanded', String(open));
  };
  pill.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!pill.classList.contains('is-open')); });
  document.addEventListener('click', function (e) { if (!pill.contains(e.target)) setOpen(false); });
  // Desktop bonus: also reveal while the real mouse hovers.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    pill.addEventListener('mouseenter', function () { setOpen(true); });
    pill.addEventListener('mouseleave', function () { setOpen(false); });
  }
})();

/* =========================================================
   Scroll cues — tap "SCROLL" (hero) or the room-hero cue to
   glide down past the hero to the content below it
   ========================================================= */
(function scrollCues() {
  const glide = (cue) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const hero = cue.closest('.hero, .room-hero, .pencemor-hero');
    const nextPaper = hero?.nextElementSibling;
    if (nextPaper && window.__bqScrollPaperTarget?.(nextPaper, { behavior, block: 'start' })) {
      window.__bqNoSnap = true;
      setTimeout(() => { window.__bqNoSnap = false; }, 1100);
      return;
    }
    const top = hero ? Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - 2)
                     : window.scrollY + window.innerHeight * 0.9;
    window.__bqNoSnap = true;                       // don't let the hero-snap fight this deliberate scroll-down
    window.scrollTo({ top, behavior });
    setTimeout(() => { window.__bqNoSnap = false; }, 900);
  };
  document.querySelectorAll('.hero-meta--br, .hero-scrolldown, .room-hero-scroll').forEach((cue) => {
    cue.style.cursor = 'pointer';
    cue.setAttribute('role', 'button');
    cue.setAttribute('tabindex', '0');
    cue.removeAttribute('aria-hidden');
    cue.setAttribute('data-i18n-aria', 'hero.scroll');
    cue.setAttribute('aria-label', (window.BQ_DICT && window.BQ_DICT['hero.scroll']) || 'Scroll down');
    cue.addEventListener('click', () => glide(cue));
    cue.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glide(cue); } });
  });
})();

/* ---- Hero — reliable static portrait, with no scroll-linked style work ---- */
document.getElementById('heroPortrait')?.classList.add('is-in');

/* =========================================================
   FEATURED PAPER STACK — fixed rounded frames; content scrolls
   inside .paper-scroll. Same system on home + other rooms.
   ========================================================= */
(function featuredPaperStack() {
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const ease = (t) => t * t * (3 - 2 * t);
  const paperStacks = [];
  let shellDomReady = document.readyState === 'complete';
  let shellFontsReady = !document.fonts?.load;
  let shellFontsStarted = false;
  let shellRevision = 0;
  const initialHeroFontLoads = () => {
    const hero = document.querySelector('.room:not(.is-hidden) > .hero, .room:not(.is-hidden) > .room-hero');
    if (!hero) return [];
    const fonts = new Map();
    const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      const element = node.parentElement;
      // The startup gate hides visibility, but preserves layout. Rects omit
      // genuinely absent text without excluding the gated, readable hero.
      if (!text || !element?.getClientRects().length) continue;
      const style = getComputedStyle(element);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      fonts.set(font, `${fonts.get(font) || ''} ${text}`.trim());
    }
    return [...fonts].map(([font, text]) => {
      try { return document.fonts.load(font, text); }
      catch (_) { return Promise.resolve(); }
    });
  };
  const prepareShellFonts = () => {
    if (shellFontsStarted || shellFontsReady) return;
    shellFontsStarted = true;
    let settled = false;
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      shellFontsReady = true;
      // An old queued render must not reveal the fit measured with fallback
      // type. The active deck gets one final fit with its actual hero fonts.
      shellRevision += 1;
      window.dispatchEvent(new CustomEvent('bq:shell-fonts-ready'));
    };
    // Stay inside the existing missing-core recovery limits. Failed fonts
    // retain a usable fallback; healthy cached fonts add no fixed delay.
    timer = setTimeout(finish, document.documentElement.dataset.initialRoute === 'home' ? 1200 : 500);
    Promise.allSettled(initialHeroFontLoads()).then(finish);
  };
  document.addEventListener('DOMContentLoaded', () => {
    shellDomReady = true;
    prepareShellFonts();
  }, { once: true });
  if (shellDomReady) prepareShellFonts();
  window.addEventListener('bq:frame-resize', () => {
    if (!window.__bqShellReady) shellRevision += 1;
  });
  const signalPaperShellReady = (measuredRevision) => {
    const html = document.documentElement;
    if (html.dataset.bqShellReady === '1') return;
    /* A warm core bundle can run before a cold stylesheet finishes. Reveal
       only the measured, styled paper shell, never its pre-wrapper layout. */
    if (!shellDomReady || !shellFontsReady || measuredRevision !== shellRevision
      || !document.getElementById('bqFullCss')?.sheet) return;
    html.dataset.bqShellReady = '1';
    window.__bqShellReady = true;
    window.dispatchEvent(new CustomEvent('bq:shell-ready'));
  };
  /* The portfolio gallery is driven by the tall-track "magic scroll" below
     (page-scroll → reel translate), NOT by the input router's nested scrollTop,
     so no sheet claims router-owned inner scroll. */
  const allowsInnerScroll = (sheet) => {
    /* Portfolio has its own reel. Other reading papers, including services,
       use the single native document track only when their copy overflows. */
    if (sheet?.classList?.contains('work')) return false;
    /* Journal / Designer / Contact are one sticky sheet; reading happens inside. */
    return Boolean(
      sheet?.classList?.contains('room-sheet--one')
      || sheet?.classList?.contains('room-sheet--scroll')
      || sheet?.dataset?.paperScroll === 'inner'
    );
  };

  /* Short home papers fit inside their frame; services may read vertically.
     A sheet marked data-paper-fit whose copy is taller than its frame is drawn
     smaller instead: --bq-paper-fit drives a CSS zoom on the frame's content
     (polish.css). zoom reflows the type at the same width, so the fitted
     height is not linear in the factor; a short bisection finds the largest
     size that fits. Below PAPER_FIT_MIN the remainder falls back to the inner
     reading track rather than shrinking type out of legibility. */
  const PAPER_FIT_MIN = 0.5;
  const PAPER_FIT_STEPS = 7;
  const compactBioPaper = (sheet) => [
    'bio-kit-sheet', 'bio-record-sheet', 'bio-education-sheet',
    'bio-honors-sheet', 'bio-world-sheet', 'bio-connect-sheet', 'bio-docs-sheet',
  ].some(name => sheet.classList.contains(name));
  const lastPaperFit = new WeakMap();
  /* Section content follows the viewport's height even while it comfortably
     fits. Heroes and the footer retain their existing intrinsic fitting;
     their type and artwork already use height-aware sizes in the stylesheet. */
  const paperFitCeiling = (sheet) => {
    if (!sheet.classList.contains('section')) return 1;
    const viewportScale = Number(window.__bqViewportScale)
      || ((window.innerHeight || 720) / 720);
    return Math.min(1, Math.max(PAPER_FIT_MIN, viewportScale));
  };
  const paperFits = (scroller) => (
    scroller.scrollHeight - scroller.clientHeight <= 2
    && scroller.scrollWidth - scroller.clientWidth <= 2
  );

  /* The service index opens one row at a time and its descriptions differ in
     length. The open row reserves the tallest of them, so neither the fitted
     size nor the rows around it move as the reader goes from row to row. */
  const reserveTallestPanel = (scroller) => {
    const accordion = scroller.querySelector('.service-accordion');
    if (!accordion) return;
    let tallest = 0;
    accordion.querySelectorAll('.service-detail-inner').forEach((inner) => {
      tallest = Math.max(tallest, inner.scrollHeight);
    });
    if (tallest > 0) accordion.style.setProperty('--bq-open-panel-h', `${Math.ceil(tallest)}px`);
    /* The list keeps its one-row-open height while rows trade places (see
       polish.css), so the centred layout and the column beside it never move.
       Read at rest: the measuring class stops the rows' transitions. */
    accordion.style.removeProperty('--bq-accordion-h');
    // The used height, unrounded: offsetHeight could add half a pixel and
    // tip the paper fit one step smaller.
    accordion.style.setProperty('--bq-accordion-h', getComputedStyle(accordion).height);
  };

  const fitPaper = (sheet, scroller) => {
    if (!sheet.hasAttribute('data-paper-fit')) return;
    const apply = (fit) => {
      sheet.style.setProperty('--bq-paper-fit', fit === 1 ? '1' : fit.toFixed(4));
      reserveTallestPanel(scroller);
    };
    /* Entrance motion parks copy a few pixels low with transforms, which the
       browser counts as scrollable overflow; measure the settled layout. */
    sheet.classList.add('is-paper-measuring');
    /* The bisection always lands on the largest step within this viewport's
       ceiling that fits. Most re-measures (a font arriving, an observer echo) change
       nothing, so first confirm the previous answer: if it still fits and the
       next step up does not, it is still the answer — two layouts instead of
       ten. A different height changes the search interval, so it receives a
       fresh search and restores the original scale as the window grows. */
    const ceiling = paperFitCeiling(sheet);
    /* Biography, journal and contact used to keep authored type on a portrait
       phone and scroll the remainder inside the card. That inner track is not
       needed: every chapter scales with its frame the way the hero does, down
       to the legibility floor. Only a remainder below that floor still reads
       on the page track. */
    const floor = PAPER_FIT_MIN;
    const roomId = sheet.closest?.('.room')?.id;
    /* The compact service accordion also needs its reading track on tablets,
       landscape phones and desktops. Fitting its HEIGHT removed the overflow
       before measurement, so those screens could never enter the track.
       Retain width fitting, but let native page scroll read any excess height.
       The sequence below also assigns a short interval to each service,
       including when its description fits entirely inside the card. */
    const serviceReading = roomId === 'design' && sheet.classList.contains('service-showcase');
    const fits = serviceReading
      ? () => scroller.scrollWidth - scroller.clientWidth <= 2
      : () => paperFits(scroller);
    const fitStep = (ceiling - floor) / (2 ** PAPER_FIT_STEPS);
    const previousAnswer = lastPaperFit.get(sheet);
    const previous = previousAnswer?.fit;
    let fit = ceiling;
    let confirmed = false;
    if (previousAnswer?.ceiling === ceiling && previous >= floor && previous < ceiling) {
      apply(previous + fitStep);
      if (!fits()) {
        apply(previous);
        confirmed = fits();
        if (confirmed) fit = previous;
      }
    }
    if (!confirmed) {
      apply(fit);
      if (!fits()) {
        let low = floor;
        let high = ceiling;
        apply(low);
        if (fits()) {
          for (let step = 0; step < PAPER_FIT_STEPS; step += 1) {
            const mid = (low + high) / 2;
            apply(mid);
            if (fits()) low = mid;
            else high = mid;
          }
        }
        fit = low;
        apply(fit);
      }
    }
    lastPaperFit.set(sheet, { fit, ceiling });
    // The caller reads the final overflow before lifting is-paper-measuring.
    sheet.classList.toggle('is-paper-fitted', fit < 1);
  };

  /* Chapters of one group (the Biography) share the smallest fit, so a
     heading on one card is the size of the heading on the next. A chapter
     that cannot fit even at the floor keeps its own reading track and does
     not drag the rest down to it. */
  const fitGroups = (entries) => {
    const smallest = new Map();
    entries.forEach(({ sheet, scroller }) => {
      const group = sheet.dataset.paperFitGroup;
      if (!group || !sheet.hasAttribute('data-paper-fit')) return;
      const fit = parseFloat(sheet.style.getPropertyValue('--bq-paper-fit')) || 1;
      if (fit <= PAPER_FIT_MIN + 0.001 && !paperFits(scroller)) return;
      smallest.set(group, Math.min(smallest.has(group) ? smallest.get(group) : 1, fit));
    });
    entries.forEach(({ sheet, scroller }) => {
      const fit = smallest.get(sheet.dataset.paperFitGroup);
      if (fit == null || !sheet.hasAttribute('data-paper-fit')) return;
      const own = parseFloat(sheet.style.getPropertyValue('--bq-paper-fit')) || 1;
      if (own <= PAPER_FIT_MIN + 0.001 && !paperFits(scroller)) return;
      sheet.style.setProperty('--bq-paper-fit', fit === 1 ? '1' : fit.toFixed(4));
      sheet.classList.toggle('is-paper-fitted', fit < 1);
    });
  };

  const paperLabel = (sheet, scroller) => {
    const heading = scroller?.querySelector('h1, h2, h3, .section-title, .room-hero-title');
    const fallback = String(sheet?.dataset?.paper || 'Scrollable section')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    return heading?.textContent?.replace(/\s+/g, ' ').trim() || fallback;
  };

  const ensurePaperMeter = (sheet) => {
    if (!sheet || sheet.classList.contains('work')) return null;
    let meter = sheet.querySelector(':scope > .paper-scroll-meter');
    if (!meter) {
      meter = document.createElement('span');
      meter.className = 'paper-scroll-meter';
      meter.setAttribute('aria-hidden', 'true');
      meter.innerHTML = '<span></span>';
      sheet.appendChild(meter);
    }
    return meter;
  };

  const updatePaperMeter = (sheet, scroller, overflow, { measure = false, metrics = null } = {}) => {
    const meter = metrics ? metrics.meter : ensurePaperMeter(sheet);
    if (!meter) return;
    const active = overflow > 0;
    const previous = meter.__bqPaint || {};
    if (previous.active !== active) sheet.classList.toggle('has-paper-overflow', active);
    if (!active) {
      if (previous.active === false) return;
      sheet.classList.remove('is-paper-reading');
      meter.style.removeProperty('--bq-meter-h');
      meter.style.removeProperty('--bq-meter-y');
      delete meter.dataset.trackHeight;
      delete meter.dataset.thumbHeight;
      meter.__bqPaint = { active: false };
      return;
    }
    let trackHeight = Number(meter.dataset.trackHeight);
    let thumbHeight = Number(meter.dataset.thumbHeight);
    if (metrics || measure || !Number.isFinite(trackHeight) || !Number.isFinite(thumbHeight)) {
      trackHeight = metrics ? metrics.trackHeight : Math.max(1, meter.clientHeight || sheet.clientHeight - 112);
      thumbHeight = metrics ? metrics.thumbHeight
        : Math.min(trackHeight, Math.max(30, trackHeight * (scroller.clientHeight / scroller.scrollHeight)));
      meter.dataset.trackHeight = String(trackHeight);
      meter.dataset.thumbHeight = String(thumbHeight);
      const height = `${thumbHeight.toFixed(2)}px`;
      if (height !== previous.height) meter.style.setProperty('--bq-meter-h', height);
      previous.height = height;
    }
    const scrollTop = metrics ? metrics.scrollTop : scroller.scrollTop;
    const progress = overflow > 0 ? Math.min(1, Math.max(0, scrollTop / overflow)) : 0;
    const y = `${((trackHeight - thumbHeight) * progress).toFixed(2)}px`;
    const reading = scrollTop > 1 && scrollTop < overflow - 1;
    if (y !== previous.y) meter.style.setProperty('--bq-meter-y', y);
    if (reading !== previous.reading) sheet.classList.toggle('is-paper-reading', reading);
    meter.__bqPaint = { active, height: previous.height, y, reading };
  };

  const ensurePaperSpacer = (sheet, scroller) => {
    if (!allowsInnerScroll(sheet) || !scroller) return;
    scroller.classList.add('has-paper-reading-track');
    if (scroller.querySelector(':scope > .paper-reading-spacer')) return;
    const spacer = document.createElement('span');
    spacer.className = 'paper-reading-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    scroller.appendChild(spacer);
  };

  const wrapPaperScroll = (sheet) => {
    if (!sheet) return;
    const existing = sheet.querySelector(':scope > .paper-scroll');
    if (existing) {
      ensurePaperSpacer(sheet, existing);
      return;
    }
    const scroller = document.createElement('div');
    scroller.className = 'paper-scroll';
    while (sheet.firstChild) scroller.appendChild(sheet.firstChild);
    const label = paperLabel(sheet, scroller);
    scroller.dataset.paperLabel = label;
    /* Measurement assigns region semantics only when authored content truly
       overflows; the minimum visual reading track is not an extra landmark. */
    scroller.removeAttribute('tabindex');
    scroller.removeAttribute('role');
    scroller.removeAttribute('aria-label');
    ensurePaperSpacer(sheet, scroller);
    sheet.appendChild(scroller);
  };

  const coverProgress = (top, pin, vh) => {
    const start = vh - pin;
    const end = pin;
    if (start <= end) return top <= end ? 1 : 0;
    return clamp01((start - top) / (start - end));
  };

  /* Start fading/blurring a touch earlier so the hand-off feels soft */
  const fadeFrom = (raw) => ease(clamp01((raw - 0.02) / 0.58));

  /* Four services share one paper. A native document track gives each its
     own reading interval before the next paper arrives; no wheel or touch
     event is intercepted. Any genuinely overflowing copy is read in every
     interval before advancing, including on very short landscape screens. */
  const serviceSequencePosition = (offset, step, count, overflow) => {
    const index = Math.min(count - 1, Math.max(0, Math.floor(Math.max(0, offset) / step)));
    return { index, inner: Math.min(overflow, Math.max(0, offset - index * step)) };
  };
  const serviceSequences = new WeakMap();
  const setupServiceSequence = (sheet, scroller) => {
    if (!sheet.classList.contains('service-showcase')) return null;
    const panels = [...scroller.querySelectorAll('.service-panel')];
    if (panels.length < 2) return null;
    sheet.dataset.serviceSequence = '';
    const sequence = {
      panels, step: 1, range: 0, overflow: 0,
      measure(overflow) {
        this.overflow = overflow;
        this.step = overflow + Math.round(Math.max(120, Math.min(200, scroller.clientHeight * 0.24)));
        this.range = this.step * panels.length;
        scroller.dataset.paperSequenceStep = String(this.step);
        /* A sticky element's own bottom margin is subtracted from its travel
           range. Put chapter distance in a real sibling instead, so this
           paper remains pinned until the following paper fully covers it. */
        if (!this.track) {
          this.track = document.createElement('div');
          this.track.className = 'paper-sequence-track';
          this.track.setAttribute('aria-hidden', 'true');
        }
        if (sheet.nextElementSibling !== this.track) sheet.after(this.track);
        this.track.style.setProperty('height', `${this.range}px`, 'important');
      },
      activate(index) {
        panels.forEach((panel, i) => {
          const active = i === index;
          if (panel.classList.contains('is-active') === active) return;
          panel.classList.toggle('is-active', active);
          panel.querySelector('.service-trigger')?.setAttribute('aria-expanded', String(active));
        });
      },
    };
    panels.forEach((panel, index) => {
      panel.dataset.serviceStep = String(index);
      panel.querySelector('.service-trigger')?.addEventListener('click', () => {
        window.__bqScrollPaperTarget?.(panel, { behavior: 'auto', block: 'start' });
      });
    });
    serviceSequences.set(sheet, sequence);
    return sequence;
  };

  window.__bqScrollPaperTarget = (target, { behavior = 'smooth', block = 'start' } = {}) => {
    if (!target?.closest) return false;
    const sheet = target.matches?.('.paper-sheet') ? target : target.closest('.paper-sheet');
    const scroller = target.matches?.('.paper-scroll')
      ? target
      : sheet?.querySelector(':scope > .paper-scroll');
    if (!scroller) return false;

    const sheetStart = Number(scroller.dataset.paperStart);
    const allowInner = allowsInnerScroll(sheet);
    const liveOverflow = allowInner
      ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      : 0;
    const innerMax = liveOverflow > 1 ? Math.ceil(liveOverflow) : 0;
    if (!Number.isFinite(sheetStart)) return false;
    const serviceStep = Number(scroller.dataset.paperSequenceStep) || 0;
    const servicePanel = serviceStep > 0 ? target.closest('.service-panel') : null;
    const chapterOffset = servicePanel ? Number(servicePanel.dataset.serviceStep) * serviceStep : 0;
    if (servicePanel && Number.isFinite(Number(servicePanel.dataset.serviceStep))) {
      if (target === servicePanel || target.matches?.('.service-trigger')) {
        const top = Math.ceil(sheetStart + chapterOffset);
        // Deliberate selection lands on its chapter, without racing through
        // intervening rows or moving focus away from the selected row.
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        return true;
      }
      // Links inside a long chapter use the normal nearest-edge reveal below;
      // focusing them must not rewind that chapter's reading position.
    }
    /* Non-portfolio targets only need the sheet brought to its document anchor. */
    if (!allowInner) {
      window.__bqPaperBypassUntil = performance.now() + (behavior === 'smooth' ? 1200 : 180);
      window.scrollTo({ top: Math.max(0, sheetStart), behavior });
      return true;
    }

    let desired = 0;
    if (target !== sheet && target !== scroller) {
      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop = targetRect.top - scrollerRect.top + scroller.scrollTop;
      const targetBottom = targetTop + targetRect.height;
      if (block === 'nearest') {
        if (targetTop < scroller.scrollTop) desired = targetTop;
        else if (targetBottom > scroller.scrollTop + scroller.clientHeight) desired = targetBottom - scroller.clientHeight;
        else desired = scroller.scrollTop;
      } else if (block === 'center') {
        desired = targetTop - ((scroller.clientHeight - targetRect.height) / 2);
      } else {
        desired = targetTop;
      }
    }

    /* Long cards use the same single-owner model as Portfolio: native window
       scroll holds the paper in place and advances its interior. Mapping a
       target to the document track preserves trackpad/touch momentum and
       keeps focus navigation deterministic. */
    const innerTarget = Math.min(innerMax, Math.max(0, desired));
    const windowTarget = Math.max(0, sheetStart + chapterOffset + innerTarget);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resolvedBehavior = reduce ? 'auto' : behavior;
    window.__bqPaperBypassUntil = performance.now() + (resolvedBehavior === 'smooth' ? 1200 : 180);
    window.scrollTo({ top: windowTarget, behavior: resolvedBehavior });
    return true;
  };

  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest('.section.work > .paper-scroll')) {
      // A tap already targets visible content. If it loads another batch,
      // following that button on the next frame jumps past the new cards.
      // Keep automatic reveal for keyboard focus, where it is needed.
      if (!target.matches(':focus-visible')) return;
      requestAnimationFrame(() => {
        window.__bqScrollWorkTarget?.(target, { behavior: 'auto', block: 'nearest' });
      });
      return;
    }
    if (!target.closest('.paper-scroll.is-window-driven')) return;
    requestAnimationFrame(() => {
      window.__bqScrollPaperTarget?.(target, { behavior: 'auto', block: 'nearest' });
    });
  });

  const bindStack = (root, sheets, { requireActive, terminalSheet = null } = {}) => {
    if (!root || sheets.length < 1) return;
    sheets.forEach((sheet) => {
      const scroller = sheet.querySelector(':scope > .paper-scroll');
      if (scroller) setupServiceSequence(sheet, scroller);
    });
    paperStacks.push({ root, sheets, requireActive });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let measureFrame = 0;
    let hasMeasured = false;
    let measuredShellRevision = -1;
    let suppressNextPreserve = false;
    if (root.id === 'design') {
      window.__bqSuppressNextPaperPreserve = () => { suppressNextPreserve = true; };
    }

    const inactive = () => requireActive && root.classList.contains('is-hidden');
    /* The sticky inset only moves when the deck is re-measured, but this ran
       on every rendered frame — and getComputedStyle forces a style recalc. */
    let cachedPin = null;
    const refreshPin = () => {
      cachedPin = parseFloat(getComputedStyle(sheets[0]).top) || 0;
      return cachedPin;
    };
    const readPin = () => (cachedPin === null ? refreshPin() : cachedPin);

    /* Last values actually written per sheet. Re-writing a custom property with
       the identical string still invalidates style for that sheet's whole
       subtree, and this ran for all 22 sheets on every scroll frame even though
       only the one or two mid-transition ever change. Measured on a desktop it
       cost 6-9ms a frame; on a phone that is the whole frame budget and more,
       which is why the portfolio scroll felt heavy there. */
    let coverCache = new WeakMap();

    /* Every room runs its own stack, so the three that are hidden at any moment
       were each landing here on every scroll frame and re-zeroing all of their
       sheets — 63 style writes per hidden room, per frame, to set values that
       were already zero. Reset once on the way out and stay quiet until the
       room is actually rendered again. */
    let visualsReset = false;

    const resetVisuals = () => {
      if (visualsReset) return;
      visualsReset = true;
      /* These writes go straight to the sheets, so the cache must forget what
         it thinks is on them or the next frame would skip re-applying. */
      coverCache = new WeakMap();
      sheets.forEach((sheet) => {
        sheet.style.setProperty('--bq-out', '0');
        sheet.style.setProperty('--bq-fade', '0');
        sheet.style.setProperty('--bq-push-y', '0px');
        sheet.classList.remove('is-paper-gone');
        sheet.inert = false;
      });
    };

    const render = () => {
      frame = 0;
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) return;
      if (inactive()) {
        resetVisuals();
        return;
      }
      /* Rendering again, so the next exit owes another reset. */
      visualsReset = false;

      const vh = Math.max(window.innerHeight || 0, 1);
      const pin = readPin();
      const motionOff = reduced.matches;

      /* Gather reading positions before writing any scroll offsets or meters. */
      const reading = sheets.map((sheet) => {
        const scroller = sheet.querySelector(':scope > .paper-scroll');
        const sheetStart = Number(scroller?.dataset.paperStart);
        const overflow = Number(scroller?.dataset.paperOverflow) || 0;
        if (!scroller || !allowsInnerScroll(sheet) || overflow <= 0 || !Number.isFinite(sheetStart)) return null;
        const sequence = serviceSequences.get(sheet);
        const position = sequence
          ? serviceSequencePosition(window.scrollY - sheetStart, sequence.step, sequence.panels.length, sequence.overflow)
          : null;
        const innerY = position ? position.inner : Math.min(overflow, Math.max(0, window.scrollY - sheetStart));
        return { sheet, scroller, overflow: sequence ? sequence.overflow : overflow,
          sequence, position, innerY, scrollTop: scroller.scrollTop };
      }).filter(Boolean);

      /* Read every geometry value together before writing transforms. */
      const metrics = sheets.map((sheet) => {
        const scroller = sheet.querySelector(':scope > .paper-scroll');
        const sheetStart = Number(scroller?.dataset.paperStart);
        return {
          naturalTop: Number.isFinite(sheetStart)
            ? sheetStart + pin - window.scrollY
            : sheet.getBoundingClientRect().top,
        };
      });
      const lastSheet = sheets[sheets.length - 1];
      const terminalTop = terminalSheet ? Math.max(pin, terminalSheet.getBoundingClientRect().top) : null;
      const lastExited = terminalSheet ? lastSheet.getBoundingClientRect().bottom <= pin + 0.75 : false;

      /* Every long paper follows one native document scroll. All geometry
         above is read before scroll offsets and coverage change the frame. */
      reading.forEach(({ sheet, scroller, overflow, sequence, position, innerY, scrollTop }) => {
        if (sequence) sequence.activate(position.index);
        if (Math.abs(scrollTop - innerY) > 0.5) scroller.scrollTop = innerY;
        updatePaperMeter(sheet, scroller, overflow);
      });
      if (sheets.length < 2 && !terminalSheet) return;

      const applyCoverage = (curr, nextTop) => {
        const fullyCovered = nextTop <= pin + 0.75;
        const raw = coverProgress(nextTop, pin, vh);
        const out = motionOff ? '0' : ease(raw).toFixed(4);
        const fade = motionOff ? '0' : fadeFrom(raw).toFixed(4);

        /* Nothing below changes the pixels unless one of these three did, so a
           settled sheet costs a WeakMap lookup and no style invalidation. */
        const was = coverCache.get(curr);
        if (was && was.out === out && was.fade === fade && was.covered === fullyCovered) return;
        coverCache.set(curr, { out, fade, covered: fullyCovered });

        if (!was) curr.style.setProperty('--bq-push-y', '0px');
        if (!was || was.out !== out) curr.style.setProperty('--bq-out', out);
        if (!was || was.fade !== fade) curr.style.setProperty('--bq-fade', fade);
        if (!was || was.covered !== fullyCovered) {
          curr.inert = fullyCovered;
          curr.classList.toggle('is-paper-gone', fullyCovered);
        }
      };

      for (let i = 0; i < sheets.length - 1; i += 1) {
        applyCoverage(sheets[i], Math.max(pin, metrics[i + 1].naturalTop));
      }

      if (terminalSheet) {
        /* The shared footer is outside secondary room roots, but it is still
           their final incoming paper. A short footer may never reach the pin
           before the last sticky card exits above the viewport, so either a
           complete cover or a complete exit retires that card from focus. */
        applyCoverage(lastSheet, lastExited ? pin : terminalTop);
      } else {
        /* The final card has no incoming paper and must always remain live. */
        lastSheet.inert = false;
        lastSheet.classList.remove('is-paper-gone');
      }
      if (hasMeasured) signalPaperShellReady(measuredShellRevision);
    };

    const queue = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const captureReadingState = () => {
      if (!hasMeasured || suppressNextPreserve || inactive()) return null;
      const y = window.scrollY;
      let current = null;
      sheets.forEach((sheet) => {
        const scroller = sheet.querySelector(':scope > .paper-scroll');
        const start = Number(scroller?.dataset.paperStart);
        if (Number.isFinite(start) && start <= y + 1) current = { sheet, scroller, start };
      });
      if (!current) return null;
      /* Portfolio owns its own tall-track geometry and preserves its reel/hold
         phase during remeasure. Treating its full page offset as generic
         handoff distance can jump into the following papers after rotation. */
      if (current.sheet.classList.contains('work')) return null;
      const overflow = Number(current.scroller.dataset.paperOverflow) || 0;
      const inner = Math.min(overflow, Math.max(0, y - current.start));
      const atEnd = overflow > 0 && inner >= overflow - 1;
      const handoff = Math.max(0, y - (current.start + overflow));
      const sequence = serviceSequences.get(current.sheet);
      const phase = sequence ? inner / sequence.step : null;
      return { ...current, inner, atEnd, handoff, phase };
    };

    const measure = () => {
      measureFrame = 0;
      if (window.__bqViewportLayout?.defer(queueMeasure)) return;
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) return;
      if (inactive()) {
        resetVisuals();
        return;
      }
      if (!window.__bqShellReady) {
        // Refresh the initial viewport before fitting, never as a side effect
        // of the later ready/reveal event that would invalidate this fit.
        window.dispatchEvent(new CustomEvent('bq:shell-prepare'));
        if (window.__bqViewportLayout?.defer(queueMeasure)) return;
      }

      const readingState = captureReadingState();
      const pin = refreshPin();
      /* The final card of a stack has no sibling below it, so it cannot buy its
         reading track with margin-bottom: a sticky box travels across its
         containing block's padding box INSET BY ITS OWN MARGINS, so that margin
         is added and subtracted in the same breath and the card gets zero
         travel — it slid away while its interior scrolled, doubling the
         apparent speed. Its distance goes to the root's padding instead. */
      const rootSheets = sheets.filter((sheet) => sheet.parentElement === root);
      const tailSheet = rootSheets[rootSheets.length - 1] || null;
      let tailTrack = 0;
      const measurements = sheets.map((sheet) => {
        const scroller = sheet.querySelector(':scope > .paper-scroll');
        if (!scroller) return null;
        const allowInner = allowsInnerScroll(sheet);
        const readingSpacer = allowInner
          ? scroller.querySelector(':scope > .paper-reading-spacer')
          : null;
        return { sheet, scroller, allowInner, readingSpacer, meter: ensurePaperMeter(sheet) };
      }).filter(Boolean);
      /* Hide every breathing spacer before the first size read. Alternating
         hide/read/restore for each sheet forced layout twice per sheet. */
      measurements.forEach(({ readingSpacer }) => {
        if (readingSpacer) readingSpacer.style.setProperty('display', 'none', 'important');
      });
      /* Fitting is independent of reading ownership: the heroes and shared
         footer also have a viewport-sized frame, but never own inner scroll.
         A secondary room has that footer outside its root, so measure its
         terminal frame along with the active room's papers. */
      measurements.forEach(({ sheet, scroller }) => fitPaper(sheet, scroller));
      const terminalScroller = terminalSheet?.querySelector(':scope > .paper-scroll');
      if (terminalScroller) fitPaper(terminalSheet, terminalScroller);
      fitGroups(measurements);
      measurements.forEach((entry) => {
        const { sheet, scroller, allowInner } = entry;
        entry.naturalOverflow = allowInner
          ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
          : 0;
        sheet.classList.remove('is-paper-measuring');
      });
      terminalSheet?.classList.remove('is-paper-measuring');
      measurements.forEach(({ readingSpacer }) => {
        if (readingSpacer) readingSpacer.style.removeProperty('display');
      });
      measurements.forEach((entry) => {
        const { sheet, scroller, allowInner, naturalOverflow } = entry;
        /* Hold a card only for reading its OWN content. This used to measure
           the authored content plus the breathing spacer — so a
           page whose content fit comfortably still held for ~80px of scroll,
           which reads as an inner scroll on a page that has nothing to scroll.
           Measuring the authored content alone means a card that fits simply
           hands over to the next one. Sub-pixel/font rounding is ignored. */
        const contentOverflow = naturalOverflow > 12 ? Math.ceil(naturalOverflow) : 0;
        const sequence = serviceSequences.get(sheet);
        if (sequence) sequence.measure(contentOverflow);
        const overflow = sequence ? sequence.range : contentOverflow;
        const hasNaturalOverflow = contentOverflow > 0;
        entry.overflow = overflow;
        entry.contentOverflow = contentOverflow;

        /* Hold the paper for exactly its interior reading distance. Native
           window scroll then advances the content and releases the next card. */
        sheet.classList.toggle('is-tail-sheet', sheet === tailSheet);
        if (sequence || sheet === tailSheet) {
          if (!sequence) tailTrack = overflow;
          sheet.style.setProperty('--bq-flow-extra', '0px');
        } else {
          sheet.style.setProperty('--bq-flow-extra', `${overflow}px`);
        }
        scroller.classList.toggle('is-window-driven', allowInner && overflow > 0);
        scroller.classList.toggle('is-paper-scrollable', allowInner && overflow > 0);
        sheet.classList.toggle('has-paper-natural-overflow', hasNaturalOverflow);
        scroller.dataset.paperOverflow = String(overflow);
        scroller.dataset.paperNaturalOverflow = String(hasNaturalOverflow ? Math.ceil(naturalOverflow) : 0);
        scroller.dataset.paperLabel = paperLabel(sheet, scroller);
        if (allowInner && hasNaturalOverflow) {
          /* The document is the only input owner. A focusable hidden-overflow
             container would make PageDown/Space target scrollTop directly and
             fight the page-driven mapping. Keep the named region semantic but
             let normal controls and document navigation own the tab order. */
          scroller.removeAttribute('tabindex');
          scroller.setAttribute('role', 'region');
          scroller.setAttribute('aria-label', scroller.dataset.paperLabel);
        } else {
          scroller.removeAttribute('tabindex');
          scroller.removeAttribute('role');
          scroller.removeAttribute('aria-label');
        }
        // Establish meter visibility before measuring all meters together.
        sheet.classList.toggle('has-paper-overflow', hasNaturalOverflow);
        if (allowInner) sheet.dataset.paperScroll = 'inner';
        else delete sheet.dataset.paperScroll;
      });
      measurements.forEach((entry) => {
        const { sheet, scroller, meter, contentOverflow: overflow } = entry;
        if (!meter || !overflow) { entry.meterMetrics = { meter }; return; }
        const trackHeight = Math.max(1, meter.clientHeight || sheet.clientHeight - 112);
        const thumbHeight = Math.min(trackHeight, Math.max(30, trackHeight * (scroller.clientHeight / scroller.scrollHeight)));
        entry.meterMetrics = { meter, trackHeight, thumbHeight, scrollTop: scroller.scrollTop };
      });
      measurements.forEach(({ sheet, scroller, contentOverflow, meterMetrics }) => {
        updatePaperMeter(sheet, scroller, contentOverflow, { metrics: meterMetrics });
      });

      /* Give the final card a real sibling to travel against. Padding on the
         deck cannot do this — a sticky box is held inside its containing
         block's CONTENT box — and its own margin-bottom cannot either, because
         a sticky box's range is inset by its own margins. A spacer is the one
         thing that lengthens the content box without being subtracted again.
         root.offsetHeight grows with it, so the footer offset stays correct. */
      let tailSpacer = root.querySelector(':scope > .paper-tail-track');
      if (tailTrack > 0) {
        if (!tailSpacer) {
          tailSpacer = document.createElement('div');
          tailSpacer.className = 'paper-tail-track';
          tailSpacer.setAttribute('aria-hidden', 'true');
        }
        if (root.lastElementChild !== tailSpacer) root.appendChild(tailSpacer);
        tailSpacer.style.setProperty('height', `${tailTrack}px`, 'important');
      } else if (tailSpacer) {
        tailSpacer.remove();
      }
      /* The footer must follow this added reading distance in normal flow.
         Cancelling it with a negative margin covers a long final card before
         its interior reaches the end (including the contact submit button).
         The final card stays pinned across the spacer, so no blank gap opens. */

      /* Build stable normal-flow offsets instead of reading `offsetTop` from a
         sticky element (Chromium reports its painted/stuck position there). */
      const rootStyle = getComputedStyle(root);
      const rootTop = root.getBoundingClientRect().top + window.scrollY;
      let cursor = rootTop
        + (parseFloat(rootStyle.borderTopWidth) || 0)
        + (parseFloat(rootStyle.paddingTop) || 0);

      sheets.forEach((sheet) => {
        const scroller = sheet.querySelector(':scope > .paper-scroll');
        if (!scroller) return;
        const style = getComputedStyle(sheet);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        let naturalTop;

        if (sheet.parentElement === root) {
          naturalTop = cursor + marginTop;
          cursor = naturalTop + sheet.offsetHeight + marginBottom
            + (serviceSequences.get(sheet)?.range || 0);
        } else {
          /* Home footer lives immediately after #design (other rooms are
             display:none). Its sticky inset is also the deliberate outer gap
             between the deck and footer in normal flow. */
          naturalTop = rootTop + root.offsetHeight + pin + marginTop;
        }
        scroller.dataset.paperStart = String(naturalTop - pin);
      });

      hasMeasured = true;
      measuredShellRevision = shellRevision;
      if (readingState) {
        const newStart = Number(readingState.scroller.dataset.paperStart);
        const newOverflow = Number(readingState.scroller.dataset.paperOverflow) || 0;
        if (Number.isFinite(newStart)) {
          const sequence = serviceSequences.get(readingState.sheet);
          const newInner = sequence && readingState.phase !== null
            ? Math.min(newOverflow, readingState.phase * sequence.step)
            : readingState.atEnd
            ? newOverflow
            : Math.min(readingState.inner, newOverflow);
          const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const nextY = Math.min(maxY, Math.max(0, newStart + newInner + readingState.handoff));
          if (Math.abs(nextY - window.scrollY) > 0.75) {
            window.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
          }
        }
      }
      suppressNextPreserve = false;
      queue();
    };

    const queueMeasure = () => {
      if (window.__bqViewportLayout?.defer(queueMeasure)) return;
      if (!measureFrame) measureFrame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', queue, { passive: true });
    if (window.__bqViewportLayout) window.__bqViewportLayout.subscribe(queueMeasure);
    else {
      window.addEventListener('resize', queueMeasure, { passive: true });
      window.visualViewport?.addEventListener('resize', queueMeasure, { passive: true });
    }
    window.addEventListener('orientationchange', queueMeasure, { passive: true });
    window.addEventListener('pageshow', queueMeasure);
    window.addEventListener('load', queueMeasure, { once: true });
    window.addEventListener('bq:css-ready', queueMeasure);
    window.addEventListener('bq:shell-fonts-ready', queueMeasure);
    document.addEventListener('DOMContentLoaded', queueMeasure, { once: true });
    document.getElementById('bqFullCss')?.addEventListener('load', queueMeasure, { once: true });
    reduced.addEventListener?.('change', queue);
    document.addEventListener('bq:route', () => {
      suppressNextPreserve = true;
      queueMeasure();
    });
    document.addEventListener('bq:language', queueMeasure);
    document.addEventListener('bq:menu-closed', queueMeasure);

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(queueMeasure)
      : null;
    const mutationObserver = typeof MutationObserver === 'function' && resizeObserver
      ? new MutationObserver((records) => {
          records.forEach((record) => {
            record.addedNodes.forEach((node) => {
              if (
                node.nodeType === 1
                && node.parentElement?.classList.contains('paper-scroll')
                && !node.classList.contains('paper-reading-spacer')
              ) {
                resizeObserver.observe(node);
              }
            });
          });
          queueMeasure();
        })
      : null;

    sheets.forEach((sheet) => {
      const scroller = sheet.querySelector(':scope > .paper-scroll');
      scroller?.addEventListener('scroll', () => {
        const sequence = serviceSequences.get(sheet);
        updatePaperMeter(sheet, scroller, sequence ? sequence.overflow : Number(scroller.dataset.paperOverflow) || 0);
      }, { passive: true });
      if (scroller && resizeObserver) {
        // The gallery card stays viewport-sized while its outer track grows.
        // Observe that real flow height so later papers are measured after the
        // portfolio has applied new media dimensions or appended a batch.
        if (sheet.classList.contains('work')) resizeObserver.observe(sheet);
        resizeObserver.observe(scroller);
        [...scroller.children]
          .filter((child) => !child.classList.contains('paper-reading-spacer'))
          .forEach((child) => resizeObserver.observe(child));
        mutationObserver?.observe(scroller, { childList: true, subtree: true });
      }
    });
    document.fonts?.ready?.then(queueMeasure, () => {});
    queueMeasure();
  };

  /* ---- Home deck ---- */
  const design = document.getElementById('design');
  if (design) {
    design.classList.add('paper-stack');

    const hero = design.querySelector(':scope > .hero');
    const footer = document.querySelector('.footer.footer-v249');
    const sections = [...design.querySelectorAll(':scope > .section')];

    document.querySelectorAll('.hero-flow-spacer').forEach((node) => node.remove());

    if (hero && sections.length) {
      hero.classList.remove('is-hero-pinned', 'is-hero-covered');
      hero.classList.add('paper-sheet');
      hero.dataset.paper = 'hero';
      hero.dataset.paperFit = '';
      hero.style.setProperty('--bq-paper-z', '1');
      wrapPaperScroll(hero);

      const paperNames = ['work', 'practice', 'note', 'clients', 'blog'];
      sections.forEach((sheet, i) => {
        sheet.classList.add('paper-sheet');
        sheet.dataset.paper = paperNames[i] || `sheet-${i + 1}`;
        sheet.style.setProperty('--bq-paper-z', String((i + 2) * 10));
        if (sheet.classList.contains('work')) {
          delete sheet.dataset.paperScroll;
          delete sheet.dataset.paperFit;
        } else {
          sheet.dataset.paperScroll = 'inner';
          /* Short home papers fit; services retain a native reading track
             only when their compact content exceeds the frame. */
          sheet.dataset.paperFit = '';
        }
        wrapPaperScroll(sheet);
      });

      if (footer) {
        footer.classList.add('paper-sheet', 'paper-sheet--footer');
        footer.dataset.paper = 'footer';
        footer.dataset.paperFit = '';
        delete footer.dataset.paperScroll;
        footer.style.setProperty('--bq-paper-z', '70');
        wrapPaperScroll(footer);
      }

      bindStack(design, [hero, ...sections, footer].filter(Boolean), { requireActive: true });
    }
  }

  /* ---- Blog / Bio / Contact — the same paper deck as the main room ---- */
  const sharedFooter = document.querySelector('.footer.footer-v249');
  if (sharedFooter) sharedFooter.dataset.paperFit = '';
  ['blog', 'bio', 'contact'].forEach((id) => {
    const room = document.getElementById(id);
    if (!room) return;
    room.classList.add('paper-stack', 'room-paper');

    const sheets = [...room.children].filter((node) => (
      node.classList?.contains('room-hero') || node.classList?.contains('section')
    ));

    sheets.forEach((sheet, index) => {
      sheet.classList.add('paper-sheet');
      sheet.classList.remove('room-sheet--one');
      sheet.dataset.paper = `${id}-${index + 1}`;
      sheet.style.setProperty('--bq-paper-z', String((index + 1) * 10));

      /* Room chapters, like the home papers, are drawn to fit their card
         (fitPaper) instead of reading inside it; the inner reading track is
         only the fallback below the smallest legible size. The hero never
         becomes a nested scroller. */
      if (sheet.classList.contains('section')) {
        sheet.dataset.paperScroll = 'inner';
        sheet.dataset.paperFit = '';
        // Certificates and compact biography directories fit independently;
        // neither should shrink the long biography's reading type.
        if (id === 'bio' && !sheet.classList.contains('bio-proof-sheet')
          && !compactBioPaper(sheet)) sheet.dataset.paperFitGroup = 'bio';
        else delete sheet.dataset.paperFitGroup;
      } else {
        delete sheet.dataset.paperScroll;
        sheet.dataset.paperFit = '';
      }

      wrapPaperScroll(sheet);
    });

    bindStack(room, sheets, { requireActive: true, terminalSheet: sharedFooter });
  });

  /* Portfolio "magic scroll" (tall-track): the work section becomes a tall
     scroll TRACK; its .paper-scroll is a sticky CARD that pins fully over the
     hero first; a .work-reel inside it is translated up by page scroll to
     reveal the gallery within the fixed frame; at the reel's end the track ends
     and the next card takes over. Purely page-scroll driven — deterministic,
     native momentum, identical on desktop and phones. */
  /* =======================================================
     Scroll state.
     The twelve filter chips each carry backdrop-filter: blur(16px), and the
     gallery reel scrolls directly behind them, so the browser re-samples and
     re-blurs twelve regions on every single frame of a portfolio scroll. That
     is the most expensive thing on the page while it moves — and a 16px blur
     is not something anyone perceives mid-scroll.

     So the blur is suspended while the page is moving and restored the moment
     it stops. At rest the design is exactly as authored; in motion it is free.
     ======================================================= */
  (function scrollState() {
    const root = document.documentElement;
    const SELECTOR = '.tab, .hero-cta, .rail, .mobilebar, .design-cta, .tab-card, .load-more-btn, .cookie-card';
    /* Applied inline rather than through a class: the authored blur is set at
       two-id specificity in several places, and an inline !important is the
       one thing that reliably outranks all of them without starting a
       specificity war that the next edit would lose. */
    let blurred = null;
    const suspend = () => {
      // The fixed dock already uses an opaque, unblurred surface. Rewriting
      // its (or its CTA's) filter at each idle/restart needlessly rebuilds the
      // compositing layer while the shrink transition may be reversing.
      if (!blurred) blurred = Array.from(document.querySelectorAll(SELECTOR))
        .filter((el) => !el.closest('.rail, .mobilebar'));
      for (const el of blurred) {
        el.style.setProperty('backdrop-filter', 'none', 'important');
        el.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      }
    };
    const restore = () => {
      if (!blurred) return;
      for (const el of blurred) {
        el.style.removeProperty('backdrop-filter');
        el.style.removeProperty('-webkit-backdrop-filter');
      }
    };
    let idle = 0;
    let moving = false;
    const stop = () => {
      if (!moving) return;
      moving = false;
      root.classList.remove('bq-scrolling');
      restore();
    };
    const onMove = () => {
      if (!moving) {
        moving = true;
        root.classList.add('bq-scrolling');
        suspend();
      }
      clearTimeout(idle);
      idle = setTimeout(stop, 140);
    };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('wheel', onMove, { passive: true });
    window.addEventListener('blur', stop);
    /* The gallery rebuilds its chrome on a tab switch or a language change. */
    const forget = () => {
      restore();
      blurred = null;
      if (moving) suspend();
    };
    window.addEventListener('bq:gallery-built', forget);
    document.addEventListener('bq:language', forget);
  }());

  (function portfolioMagicScroll() {
    const track = document.querySelector('#design.paper-stack > .section.work.paper-sheet');
    const card = track?.querySelector(':scope > .paper-scroll');
    if (!card) return;
    const phoneEntry = window.matchMedia('(max-width: 820px)');
    card.classList.add('bq-entry-clipped');
    let vp = card.querySelector(':scope > .work-vp');
    let reel = vp && vp.querySelector(':scope > .work-reel');
    if (!vp) {
      /* Fixed head (intro + filter tabs stay put) + scrolling gallery reel. */
      const head = document.createElement('div');
      head.className = 'work-head';
      vp = document.createElement('div');
      vp.className = 'work-vp';
      reel = document.createElement('div');
      reel.className = 'work-reel';
      /* Only the filter TABS stay fixed. Everything else — the "Design Room /
         A small catalogue…" section-head, the "All Work / The full catalogue…"
         tab-header, the grid and load-more — scrolls inside the reel (so the
         intro copy is kept, and a tall title no longer collapses the viewport). */
      [...card.children].forEach((node) => {
        (node.matches && node.matches('.tabs-wrap') ? head : reel).appendChild(node);
      });
      vp.appendChild(reel);
      card.appendChild(head);
      card.appendChild(vp);
    }
    const headEl = card.querySelector(':scope > .work-head');
    const tabsWrap = headEl && headEl.querySelector('.tabs-wrap');
    /* MOBILE: the section-head ("Design Room / A small catalogue…") sits in the
       head ABOVE the tabs, and the head flows at the card top (owner: put the
       buttons UNDER that heading). DESKTOP: the tabs are a side rail, so the
       section-head stays at the top of the scrolling reel instead. */
    const placeChrome = () => {
      const sh = card.querySelector('.section-head');
      if (!headEl || !tabsWrap) return;
      const mobile = window.matchMedia('(max-width: 1024px)').matches;
      card.classList.toggle('work-head-flow', mobile);
      if (mobile) {
        if (sh && (sh.parentElement !== headEl || sh.nextElementSibling !== tabsWrap)) {
          headEl.insertBefore(sh, tabsWrap);
        }
      } else if (sh && sh.parentElement === headEl) {
        reel.insertBefore(sh, reel.firstChild);
      }
    };
    let overflow = 0;
    let cardH = 0;
    let collapseDist = 0;   /* how far the head slides up before the tabs pin (mobile) */
    const nextSheet = () => {
      const n = track.nextElementSibling;
      return (n && n.classList && n.classList.contains('paper-sheet')) ? n : null;
    };
    let lastY = 0;
    let holdY = null;
    let pendingAppendOffset = null;
    let paintedY = null, paintedHeadY = null;
    let paintedEntryClip = null;
    let contentScale = 1;
    let trackOrigin = 0;
    let workReadingState = { active: false };
    const portfolioEntryClip = (top, pin, height) => Math.max(0, Math.min(height, top - pin));
    const measure = () => {
      readGutter();
      /* Tab switches hold geometry so an empty-grid frame cannot snap the reel. */
      if (track.dataset.holdTrack === '1') {
        if (track.dataset.trackHLock) {
          track.style.setProperty('--work-track-h', track.dataset.trackHLock);
        }
        return;
      }
      cardH = card.clientHeight;
      // Content, route and viewport changes refresh the document origin.
      // Native scrolling can then advance the reel without a layout read.
      trackOrigin = track.getBoundingClientRect().top + window.scrollY;
      const nextScale = Number(window.__bqViewportScale) || 1;
      if (nextScale !== contentScale) {
        contentScale = nextScale;
        paintedY = paintedHeadY = null;
        holdY = null;
      }
      /* Mobile: the head holds the section-head heading + the tabs. On scroll the
         head slides up by collapseDist so the HEADING scrolls away and ONLY the
         tabs stay pinned at the top (owner). The reel starts below the full head.
         Tab switches freeze this so the heading cannot drop back into view. */
      if (Number(track.dataset.overflowFloor) > 0) {
        /* keep collapseDist / --work-head-h as last measured */
      } else if (card.classList.contains('work-head-flow') && headEl && tabsWrap) {
        collapseDist = Math.max(0, (tabsWrap.offsetTop - 6) * contentScale);
        card.style.setProperty('--work-head-h', headEl.offsetHeight + 'px');
      } else {
        collapseDist = 0;
        card.style.removeProperty('--work-head-h');
        if (headEl) {
          const headX = (card.clientWidth || 0) * (1 - contentScale) / 2;
          // Twelve filters can exceed even a wide card's vertical space.
          // Keep their whole rail visible, centred beside the scaled work.
          const filterScale = Math.min(contentScale, Math.max(.1, (cardH - 16) / (tabsWrap?.scrollHeight || 1)));
          headEl.style.transform = filterScale === 1 ? '' : `translate3d(${headX}px,0,0) scale(${filterScale})`;
        }
      }
      const vpH = vp.clientHeight;
      // The layout remains at its original width, preserving every image's
      // ratio and masonry order. Its visible height shrinks with the content.
      const reelH = reel.scrollHeight * contentScale;
      overflow = Math.max(0, reelH - vpH);
      const floor = Number(track.dataset.overflowFloor);
      if (Number.isFinite(floor) && floor > 0) overflow = Math.max(overflow, floor);
      /* track = card + gallery-scroll + ONE card-height of HOLD. The hold is the
         window in which the NEXT sheet ("What I do") RISES up over the still-pinned
         card — the same scroll-driven "next sheet climbs over the previous" as every
         other sheet on the page, so it comes up WITH the scroll and never pops in
         suddenly (owner, said many times). The reel scrolls through `overflow`,
         then the card stays pinned a card-height while the next sheet rises over it. */
      track.style.setProperty('--work-track-h', (cardH * 2 + overflow) + 'px');
      /* Overlap the next sheet by ONE card-height in fixed px (not the dvh CSS
         margin, which drifts as the mobile address bar hides and desyncs the
         hand-off). It starts to rise as the reel finishes and finishes covering as
         the card unpins — a plain sticky rise, no pull-up, no occlusion, no cut. */
      const next = nextSheet();
      if (next) next.style.setProperty('margin-top', (-cardH) + 'px', 'important');
    };
    /* getComputedStyle is a style-recalc barrier; this was being called several
       times per scroll event for a value that only changes on resize. Cached,
       refreshed wherever geometry is re-measured. */
    let cachedGutter = null;
    const readGutter = () => {
      cachedGutter = parseFloat(getComputedStyle(card).top) || 0;
      return cachedGutter;
    };
    const gutter = () => (cachedGutter === null ? readGutter() : cachedGutter);
    const reelState = () => {
      const g = gutter();
      const trackTop = trackOrigin - window.scrollY;
      const local = g - trackTop;
      const y = Math.min(overflow, Math.max(0, local));
      return { g, y, local };
    };
    /* The card stays visible the WHOLE time it is pinned — including while the next
       sheet rises up over it (that rise IS the hand-off the owner wants). It is
       hidden only the instant it UNPINS and scrolls up, by which point the next
       sheet has fully climbed over it, so hiding is invisible. Position-based, so
       the card can never leak above/beside the sheets that follow. No z-lift, no
       occlusion — a plain sticky card the next sheet rises over like any other. */
    /* Writing visibility on every frame invalidates style even when the value
       is unchanged; remembered so the write happens only on a real transition. */
    let coveredNow = null;
    const applyCovered = (cardTop, g) => {
      const covered = cardTop < g - 1;
      if (covered === coveredNow) return;
      coveredNow = covered;
      card.style.visibility = covered ? 'hidden' : 'visible';
    };
    const rememberReading = (local) => {
      const span = overflow + cardH;
      const active = document.body.dataset.room === 'design'
        && span > 0
        && local >= -1
        && local <= span + 1;
      if (!active) {
        workReadingState = { active: false };
      } else if (local <= overflow) {
        workReadingState = {
          active: true,
          phase: 'reel',
          progress: overflow > 0 ? clamp01(local / overflow) : 0,
          /* Keep the distance, not just the fraction. "Load 24 more" doubles
             the reel, and a fraction re-applied to twice the content lands
             twice as deep — the reader was thrown a thousand pixels past the
             work they were looking at. The pixel offset is what keeps the same
             images under their eye. */
          offset: Math.max(0, local),
        };
      } else {
        workReadingState = {
          active: true,
          phase: 'hold',
          progress: cardH > 0 ? clamp01((local - overflow) / cardH) : 0,
        };
      }
    };
    let raf = 0;
    let workMeasureFrame = 0;
    let scrollPending = false;
    /* One frame = read everything, then write everything. Interleaving them is
       what made this scroll stutter: each read that followed a write forced a
       synchronous relayout, several times per scroll event. */
    const drive = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      scrollPending = false;
      if (document.body.dataset.room !== 'design') return;
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) return;

      /* ---- reads ---- */
      const g = gutter();
      // The sticky carrier pins until the reel and its handoff hold finish.
      // Its bounds are known from measure(), so no rectangle/style read is
      // needed after another scroll module has written its own transforms.
      // Menu motion is excluded above; closure remeasures the real origin.
      const trackTop = trackOrigin - window.scrollY;
      const cardTop = Math.min(Math.max(g, trackTop), trackTop + cardH + overflow);
      const local = g - trackTop;
      let entryClip = 0;
      if (phoneEntry.matches) {
        const liveHeight = Math.max(1, (window.__bqPaperViewport?.height || window.innerHeight) - (g * 2));
        const entering = local < Math.max(0, liveHeight - cardH) || paintedEntryClip > 0;
        // Toolbar motion changes the hero's flow height before the deferred
        // deck measurement. Read the entering card only in that interval;
        // settled entry and the pinned gallery use cached geometry.
        const entryTop = entering && Math.abs(liveHeight - cardH) > 0.5
          ? card.getBoundingClientRect().top
          : cardTop;
        entryClip = portfolioEntryClip(entryTop, g, liveHeight);
      }
      let y = Math.min(overflow, Math.max(0, local));
      /* Latch the reel the instant the hold begins — the hold IS the next
         sheet's rise. Through it local >= overflow, so y is exactly `overflow`,
         and `overflow` is not a constant: measure() recomputes it from the
         reel's height, and remeasure fires from the reel's own ResizeObserver
         and from bq:gallery-built / fonts.ready. A lazy image landing or a
         video's metadata arriving mid-hand-off therefore moved the reel by that
         delta while the card stayed pinned and the incoming sheet stayed put —
         so all the reader saw was the gallery sliding under a stationary sheet,
         then stopping. Holding the value it had when the hold opened means a
         late resize lands as nothing at all. */
      if (local >= overflow) {
        if (holdY === null) holdY = y;
        y = holdY;
      } else {
        holdY = null;
      }
      if (track.dataset.holdTrack === '1') {
        const locked = Number(track.dataset.reelY);
        y = Number.isFinite(locked) ? locked : lastY;
      }
      const headY = collapseDist ? -Math.min(y, collapseDist) : null;

      /* ---- writes ---- */
      if (entryClip !== paintedEntryClip) {
        card.style.setProperty('--work-entry-clip', `${entryClip}px`);
        paintedEntryClip = entryClip;
      }
      lastY = y;
      if (y !== paintedY) {
        reel.style.transform = 'translate3d(0,' + (-y) + 'px,0)' + (contentScale === 1 ? '' : ` scale(${contentScale})`);
        paintedY = y;
      }
      /* slide the head up until the tabs reach the top, then hold — the heading
         scrolls away while ONLY the tabs stay pinned (owner). */
      if (headY !== null && headEl && headY !== paintedHeadY) {
        headEl.style.transform = 'translate3d(0,' + headY + 'px,0)' + (contentScale === 1 ? '' : ` scale(${contentScale})`);
        paintedHeadY = headY;
      }
      applyCovered(cardTop, g);
      rememberReading(local);
    };
    const onScroll = () => {
      scrollPending = true;
      if (!raf && !workMeasureFrame) raf = requestAnimationFrame(drive);
    };
    const onEntryFrameResize = () => {
      // Refresh the clipping immediately, without treating a toolbar resize
      // as native scrolling or waiting for the full deck's 120ms refit gate.
      if (phoneEntry.matches && !raf && !workMeasureFrame) raf = requestAnimationFrame(drive);
    };
    const remeasure = () => {
      if (window.__bqViewportLayout?.defer(queueRemeasure)) return;
      if (document.body.dataset.room !== 'design'
        || document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) {
        // A cancelled scroll frame would have discarded movement while the
        // gallery was inactive. Do the same here so reopening does not treat
        // an old event as new movement and replace the saved reading offset.
        scrollPending = false;
        return;
      }
      paintedHeadY = null;
      if (track.dataset.holdTrack === '1') {
        scrollPending = false;
        if (track.dataset.trackHLock) {
          track.style.setProperty('--work-track-h', track.dataset.trackHLock);
        }
        return;
      }
      const oldSpan = overflow + cardH;
      const oldScale = contentScale;
      const nativeMovement = scrollPending;
      const liveLocal = gutter() - track.getBoundingClientRect().top;
      // Mobile browser chrome can resize before the scroll event from the
      // same gesture is painted. Preserve that new position, not the previous
      // frame's reading offset, or scrollTo cancels the native movement.
      if (scrollPending && pendingAppendOffset === null) rememberReading(liveLocal);
      const tolerance = Math.max(48, cardH * .25);
      const saved = pendingAppendOffset !== null
        ? { phase: 'reel', offset: pendingAppendOffset }
        : workReadingState.active
        && document.body.dataset.room === 'design'
        && liveLocal >= -tolerance
        && liveLocal <= oldSpan + tolerance
        ? { ...workReadingState }
        : null;
      pendingAppendOffset = null;
      if (track.dataset.skipChrome !== '1') placeChrome();
      measure();
      if (saved) {
        window.__bqSuppressNextPaperPreserve?.();
        /* The hold is a fixed card height, so a fraction of it is stable.
           The reel is not: its length changes whenever the grid grows, so the
           reel restores by distance and only falls back to the fraction for a
           state saved before offsets were recorded. */
        const newLocal = saved.phase === 'hold'
          ? overflow + (cardH * saved.progress)
          : Number.isFinite(saved.offset)
            ? Math.min(overflow, Math.max(0, saved.offset * (nativeMovement ? 1 : contentScale / oldScale)))
            : overflow * saved.progress;
        const targetY = Math.max(0, trackOrigin - gutter() + newLocal);
        if (Math.abs(targetY - window.scrollY) > 0.75) {
          window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
        }
      }
      drive();
    };
    /* Sending the reel home. remeasure() restores the saved reading position
       after every measurement, and a tab switch causes several (the grid
       rebuilds, then each image lands and resizes it) — so simply scrolling to
       the top got overwritten a frame later. Instead of fighting that, the
       saved position IS the start: every later remeasure now restores to zero
       and the reel stays where the reader asked it to be. */
    window.__bqResetWorkReel = () => {
      lastY = 0;
      holdY = null;
      pendingAppendOffset = null;
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, trackTop - gutter()), left: 0, behavior: 'auto' });
      drive();
      /* State the intent AFTER drive(), not before. drive() ends by re-deriving
         workReadingState from wherever the browser actually landed, and it does
         not always land on the track top: a category with fewer pieces makes a
         shorter document, so the scroll above gets clamped, and the derived
         local can fall outside the track entirely — which marks the state
         inactive and leaves every later remeasure with nothing to restore. The
         reader is then wherever the clamp dropped them, mid-gallery. Setting it
         last means the start is what survives. */
      workReadingState = { active: true, phase: 'reel', progress: 0, offset: 0 };
    };

    window.__bqScrollWorkTarget = (target, { behavior = 'smooth', block = 'nearest' } = {}) => {
      if (!target?.closest?.('.section.work') || !reel.contains(target)) return false;
      const targetRect = target.getBoundingClientRect();
      const reelRect = reel.getBoundingClientRect();
      const contentTop = targetRect.top - reelRect.top;
      const contentBottom = contentTop + targetRect.height;
      const safeTop = Math.max(70, collapseDist ? Math.min(collapseDist + 18, card.clientHeight * .28) : 34);
      const safeBottom = Math.max(safeTop + 80, card.clientHeight - 96);
      let desired = lastY;

      if (block === 'center') desired = contentTop - ((card.clientHeight - targetRect.height) / 2);
      else if (block === 'start') desired = contentTop - safeTop;
      else if (contentTop < lastY + safeTop) desired = contentTop - safeTop;
      else if (contentBottom > lastY + safeBottom) desired = contentBottom - safeBottom;

      desired = Math.min(overflow, Math.max(0, desired));
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      const windowTarget = Math.max(0, trackTop - gutter() + desired);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const resolvedBehavior = reduce ? 'auto' : behavior;
      window.__bqPaperBypassUntil = performance.now() + (resolvedBehavior === 'smooth' ? 1200 : 180);
      window.scrollTo({ top: windowTarget, behavior: resolvedBehavior });
      return true;
    };
    // Mobile browser chrome can emit both resize events in the same frame.
    // Gallery/font observers can join them: measure once after they settle.
    const queueRemeasure = () => {
      if (window.__bqViewportLayout?.defer(queueRemeasure)) return;
      if (workMeasureFrame) return;
      // Measurement finishes with drive(), so it also owns any scroll paint
      // already queued for this frame. Keep scrollPending for reading-position
      // preservation without running a second set of geometry reads.
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      workMeasureFrame = requestAnimationFrame(() => {
        workMeasureFrame = 0;
        remeasure();
      });
    };
    window.__bqPrepareWorkAppend = () => {
      // The load button remains visible during the handoff hold. Growing the
      // reel must keep the images here, rather than preserve the NEW reel end.
      const liveLocal = gutter() + window.scrollY - trackOrigin;
      pendingAppendOffset = liveLocal >= overflow && holdY !== null
        ? holdY : Math.min(overflow, Math.max(0, liveLocal));
      holdY = null;
      queueRemeasure();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('bq:frame-resize', onEntryFrameResize, { passive: true });
    if (window.__bqViewportLayout) window.__bqViewportLayout.subscribe(queueRemeasure);
    else {
      window.addEventListener('resize', queueRemeasure, { passive: true });
      window.visualViewport?.addEventListener('resize', queueRemeasure, { passive: true });
    }
    window.addEventListener('bq:gallery-built', queueRemeasure);
    window.addEventListener('bq:gallery-counts', queueRemeasure);
    window.addEventListener('bq:gallery-dimensions', queueRemeasure);
    window.addEventListener('bq:css-ready', queueRemeasure);
    document.addEventListener('bq:route', queueRemeasure);
    document.addEventListener('bq:menu-closed', queueRemeasure);
    document.addEventListener('bq:language', queueRemeasure);
    if (typeof ResizeObserver === 'function') {
      /* Gallery images land one by one, each resizing the reel. Un-coalesced
         that is one full remeasure — and possibly a scrollTo — per image. */
      try { new ResizeObserver(queueRemeasure).observe(reel); } catch (e) {}
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRemeasure, () => {});
    remeasure();
  })();

})();

/* =========================================================
   FOOTER SHELL — Cloudflare can briefly retain an older HTML
   shell after deploy while serving the newest JS/CSS assets.
   Recreate the current footer structure when that happens.
   ========================================================= */
(function ensureFooterShell() {
  const footer = document.querySelector('.footer-v249');
  if (!footer) return;
  const footerContent = footer.querySelector(':scope > .paper-scroll') || footer;

  const dict = window.BQ_DICT || {};
  footer.querySelectorAll('.footer-wordmark, .footer-contact-grid, .footer-main-v249, .footer-cta-btn').forEach((el) => el.remove());

  if (!footer.querySelector('.footer-stage')) {
    const stage = document.createElement('div');
    stage.className = 'footer-stage';
    stage.innerHTML = `
      <div class="footer-stage-copy">
        <span class="footer-kicker mono">
          <span class="footer-live-dot" aria-hidden="true"></span>
          <span data-i18n="f.avail"></span>
        </span>
        <h2 class="footer-cta-title" id="footerCtaTitle" data-i18n="f.cta.title"></h2>
        <a class="footer-email" href="mailto:hello@bqurtas.com">hello@bqurtas.com</a>
      </div>`;
    stage.querySelector('[data-i18n="f.avail"]').textContent = dict['f.avail'] || 'Available for select commissions';
    stage.querySelector('[data-i18n="f.cta.title"]').innerHTML = dict['f.cta.title'] || "Let's make something <em>quietly</em> good together.";
    footerContent.prepend(stage);
  } else if (!footer.querySelector('.footer-email')) {
    const copy = footer.querySelector('.footer-stage-copy') || footer.querySelector('.footer-stage');
    const mail = document.createElement('a');
    mail.className = 'footer-email';
    mail.href = 'mailto:hello@bqurtas.com';
    mail.textContent = 'hello@bqurtas.com';
    copy?.append(mail);
  }

  if (!footer.querySelector('.footer-bottom')) {
    const bottom = document.createElement('div');
    bottom.className = 'footer-bottom mono';
    bottom.innerHTML = `
      <span data-i18n="f.loc">${dict['f.loc'] || 'Erbil — Kurdistan, Iraq'}</span>
      <span>© 2026 <span data-i18n="name.full">${dict['name.full'] || 'Barakat Qurtas'}</span></span>`;
    footerContent.append(bottom);
  }

  /* An older shell may still carry the social row this footer no longer uses. */
  footer.querySelectorAll('.footer-social-links').forEach((el) => el.remove());
  footer.setAttribute('aria-labelledby', 'footerCtaTitle');
})();

/* =========================================================
   Footer colour scene — match VOXO's closing behaviour:
   the page itself turns into the footer colour while the
   final section is still visible, then the contact block enters.
   ========================================================= */
(function footerColourScene() {
  const footer = document.querySelector('.footer-v249');
  if (!footer) return;

  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  let lastProgress, lastMix, lastArriving, lastEntered;
  let lastUnder = false;

  /* The footer is the inverse of the cards, and the dock stays painted over
     it. Flip the glass only once the footer actually covers the bar — the
     arriving flag turns on while the dock is still on a card. */
  const dockCoverLine = () => {
    if (typeof document.querySelectorAll !== 'function') return null;
    if (typeof window.getComputedStyle !== 'function') return null;
    const nodes = document.querySelectorAll('.mobilebar, .rail');
    let line = null;
    let bestBottom = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node || typeof node.getBoundingClientRect !== 'function') continue;
      const style = window.getComputedStyle(node);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) continue;
      const box = node.getBoundingClientRect();
      if (!box || !(box.height > 8) || !(box.width > 8) || !Number.isFinite(box.top)) continue;
      if (box.bottom <= bestBottom) continue;
      bestBottom = box.bottom;
      line = box.top + box.height * .55;
    }
    return line;
  };

  const render = () => {
    frame = 0;
    const vh = Math.max(window.innerHeight || 0, 1);
    const top = footer.getBoundingClientRect().top;
    const start = vh * 1.08;
    const end = vh * .48;
    const raw = Math.min(1, Math.max(0, (start - top) / Math.max(start - end, 1)));
    const eased = raw * raw * (3 - 2 * raw);
    const progress = reduced.matches ? (raw >= .5 ? 1 : 0) : eased;

    // These inherited variables affect the entire page. During the gallery
    // both are zero: do not invalidate every card's styles on every frame.
    const nextProgress = progress.toFixed(4);
    const nextMix = (progress * 100).toFixed(2) + '%';
    const arriving = raw > .001, entered = raw > .72;
    const edge = dockCoverLine();
    const underDock = edge == null ? false : (lastUnder ? top < edge + 28 : top <= edge);
    if (nextProgress !== lastProgress) root.style.setProperty('--bq-footer-progress', lastProgress = nextProgress);
    if (nextMix !== lastMix) root.style.setProperty('--bq-footer-mix', lastMix = nextMix);
    if (arriving !== lastArriving) body.classList.toggle('footer-arriving', lastArriving = arriving);
    if (entered !== lastEntered) body.classList.toggle('footer-entered', lastEntered = entered);
    if (underDock !== lastUnder) body.classList.toggle('footer-under-dock', lastUnder = underDock);
  };

  const queue = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('orientationchange', queue, { passive: true });
  window.addEventListener('pageshow', queue);
  window.addEventListener('load', queue);
  reduced.addEventListener?.('change', queue);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queue(); });
  document.addEventListener('click', () => setTimeout(queue, 80), { passive: true });
  window.__bqFooterScene = queue;
  render();
  setTimeout(queue, 400);
})();

/* =========================================================
   GLOBAL GO UP — the control belongs to the core interface,
   so it must not wait for the optional enhancement bundle.
   ========================================================= */
(function globalGoUp() {
  const control = document.getElementById('toTop');
  if (!control) return;

  const ring = document.getElementById('toTopProg');
  /* Claim the ring so the enhancement bundle stops painting pixel progress
     over the deck progress on every scroll event. */
  window.__bqDeckRing = true;
  const circumference = 2 * Math.PI * 20;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (ring) {
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
  }

  /* scrollHeight is a layout barrier, so it is read once per resize rather
     than once per scroll event, and the ring is painted once per frame. */
  let cachedMax = 0;
  const readMax = () => {
    const doc = document.documentElement;
    cachedMax = Math.max(doc.scrollHeight - doc.clientHeight, 1);
  };
  /* Progress by sheet, not by pixel.
     Raw document scroll is dominated by the portfolio: its track is over half
     the page, so the ring raced through the gallery and then barely moved for
     the four sheets after it. Counting the deck instead — which card is pinned,
     and how far the next one has risen over it — makes one sheet worth one step
     whatever its track is worth in pixels. Falls back to document scroll for
     any page that is not a deck. */
  let progressSheets = [], progressPin = 10;
  const measureGalleryProgress = () => {
    const activeDeck = document.getElementById(document.body.dataset.room || 'design');
    const sheets = Array.from(activeDeck?.querySelectorAll(':scope > .paper-sheet') || []);
    progressSheets = sheets.map(sheet => sheet.querySelector(':scope > .paper-scroll'));
    if (sheets[0]) progressPin = parseFloat(getComputedStyle(sheets[0]).top) || 0;
  };
  measureGalleryProgress();

  const deckProgress = (top) => {
    // The paper stack already measures normal-flow offsets whenever content
    // or the viewport changes. Scrolling any room needs only arithmetic,
    // not computed styles and a forced rectangle read for every sheet.
    const starts = progressSheets.map(scroller => Number(scroller?.dataset.paperStart));
    if (starts.length < 2 || starts.some(start => !Number.isFinite(start))) return null;
    let index = 0;
    for (let i = 0; i < starts.length; i++) if (starts[i] <= top + 1) index = i;
    const nextTop = starts[index + 1] + progressPin - top;
    const within = index + 1 < starts.length
      ? Math.min(1, Math.max(0, (window.innerHeight - nextTop) / Math.max(1, window.innerHeight - progressPin - 1)))
      : 1;
    return Math.min(1, Math.max(0, (index + within) / starts.length));
  };

  let shownNow = null, lastRingOffset;
  const update = () => {
    // A valid zero is authoritative during native restoration / menu unlock;
    // do not revive an old scrollingElement offset while Safari catches up.
    const top = Math.max(0, Number.isFinite(window.scrollY)
      ? window.scrollY : (document.scrollingElement?.scrollTop || 0));
    if (!cachedMax) readMax();
    const deck = deckProgress(top);
    const progress = deck === null
      ? Math.min(Math.max(top / cachedMax, 0), 1)
      : deck;
    // Keep the control through small scroll corrections near its threshold.
    const shown = shownNow ? top > 40 : top > 160;
    if (shown !== shownNow) {
      shownNow = shown;
      control.classList.toggle('is-shown', shown);
      control.setAttribute?.('aria-hidden', String(!shown));
      control.tabIndex = shown ? 0 : -1;
    }
    const offset = String(circumference * (1 - progress));
    if (ring && offset !== lastRingOffset) ring.style.strokeDashoffset = lastRingOffset = offset;
  };
  let ringFrame = 0;
  const queueUpdate = () => {
    if (ringFrame) return;
    ringFrame = requestAnimationFrame(() => { ringFrame = 0; update(); });
  };
  const onResize = () => { readMax(); measureGalleryProgress(); queueUpdate(); };

  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('touchmove', queueUpdate, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('bq:css-ready', onResize);
  window.addEventListener('bq:gallery-built', onResize);
  document.addEventListener('bq:route', onResize);
  document.addEventListener('bq:menu-closed', onResize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onResize(); });
  window.addEventListener('pageshow', onResize);

  // The consent card is centred above the dock. Move the go-up control above
  // its measured height instead of hiding it for the lifetime of that card.
  const cookie = document.getElementById('cookieCard');
  if (cookie && typeof ResizeObserver === 'function') {
    let lastHeight = -1;
    new ResizeObserver(() => {
      const height = Math.ceil(cookie.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      document.documentElement.style.setProperty('--bq-cookie-height', height + 'px');
    }).observe(cookie);
  }
  window.__bqCoreGoUpUpdate = queueUpdate;

  if (!window.__bqTopClickBound) {
    control.addEventListener('click', () => {
      const behavior = reduced.matches ? 'auto' : 'smooth';
      if (window.__bqGoDocumentTop) window.__bqGoDocumentTop(behavior);
      else window.scrollTo({ top: 0, behavior });
    });
    window.__bqTopClickBound = true;
  }

  update();
})();
