/* =========================================================
   lux.js — luxe motion layer (additive; safe to remove)
   • portfolio media fades from B&W to colour as it scrolls into view
   • tasteful reveal-on-scroll for section headers & cards
   ========================================================= */
(function () {
  'use strict';
  if (typeof IntersectionObserver === 'undefined') return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var curtainCoverMs = 680;
  var curtainLeaveMs = 900;
  var curtainDoneMs = 1660;
  window.__bqRouteCurtainCoverMs = curtainCoverMs;

  /* ---- B&W → colour on the gallery cards ---- */
  var colorObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-color'); colorObs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  function scanCards() {
    document.querySelectorAll('.card:not([data-lux])').forEach(function (c) {
      c.dataset.lux = '1';
      c.classList.add('lux-gray');
      if (reduce) { c.classList.add('is-color'); return; }
      colorObs.observe(c);
    });
  }
  // Debounce: only observe AFTER the masonry has positioned the cards — otherwise
  // every freshly-injected card is briefly stacked at the top, reads as "in view",
  // and colours at once (so the B&W → colour-on-scroll effect is never seen).
  var scanTimer;
  function queueScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scanCards, 280); }
  queueScan();

  var grid = document.getElementById('grid');
  if (grid) new MutationObserver(queueScan).observe(grid, { childList: true, subtree: true });

  /* ---- reveal-on-scroll (runs even with Reduce Motion — a gentle fade keeps the
     page from feeling dead; the heavier continuous motion stays gated) ---- */
  {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('lux-in'); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    var sel = ['.section-head', '.bio-teaser-grid', '.logos-head', '.latest-blog-head',
               '.room-features', '.room-hero-inner', '.bio-block', '.pencemor-hero-inner',
               '.feature-card', '.tab-header'].join(',');
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('lux-reveal');
      revealObs.observe(el);
    });
    // reveal anything a room-switch brings into view
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-route]')) return;
      setTimeout(function () {
        document.querySelectorAll('.room:not(.is-hidden) .lux-reveal:not(.lux-in)').forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < innerHeight) el.classList.add('lux-in');
        });
      }, 90);
    }, true);
  }

  /* ---- page-transition curtain when moving between rooms ---- */
  if (!reduce) {
    var curtain = document.createElement('div');
    curtain.className = 'lux-transition';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML =
      '<span class="lux-transition-room">Design</span>' +
      '<span class="lux-transition-no">01 / 06</span>' +
      '<span class="lux-transition-line"></span>';
    document.body.appendChild(curtain);

    var roomNumbers = {
      design: '01 / 06',
      work: '02 / 06',
      brandboard: '03 / 06',
      blog: '04 / 06',
      bio: '05 / 06',
      contact: '06 / 06'
    };
    var roomFallbacks = {
      design: 'Design',
      work: 'Selected Work',
      brandboard: 'The Brand Board',
      blog: 'The Journal',
      bio: 'The Designer',
      contact: "Let's talk."
    };
    var busy = false;
    var playCurtain = function (route) {
      if (busy) return true;
      if (route && route === document.body.dataset.room) return false;   // same room → no curtain
      var translated = document.querySelector('.mm-link[data-route="' + route + '"] .mm-link-text');
      var roomName = translated ? translated.textContent.trim() : roomFallbacks[route];
      var nameNode = curtain.querySelector('.lux-transition-room');
      var noNode = curtain.querySelector('.lux-transition-no');
      if (nameNode) nameNode.textContent = roomName || roomFallbacks.design;
      if (noNode) noNode.textContent = roomNumbers[route] || roomNumbers.design;
      busy = true;
      curtain.classList.remove('is-leaving');
      curtain.classList.add('is-active');             // sweep up to cover (room swaps underneath)
      setTimeout(function () { curtain.classList.add('is-leaving'); }, curtainLeaveMs);   // sweep away after the room has swapped under full cover
      setTimeout(function () { curtain.classList.remove('is-active', 'is-leaving'); busy = false; }, curtainDoneMs);
      return true;
    };
    window.__bqPlayRoomCurtain = playCurtain;
    document.addEventListener('click', function (ev) {
      var link = ev.target.closest('[data-route]');
      if (!link) return;
      var route = link.getAttribute('data-route');
      playCurtain(route);
    }, true);
    addEventListener('pagehide', function () { curtain.classList.remove('is-active', 'is-leaving'); }, { once: true });
  }

  /* ---- the client-logo marquee SLOWS (doesn't stop) on hover ---- */
  (function () {
    var mq = document.querySelector('.logo-marquee');
    var track = mq && mq.querySelector('.logo-marquee-track');
    if (!mq || !track || !track.getAnimations) return;
    var rate = function (v) {
      track.getAnimations().forEach(function (a) {
        if (a.updatePlaybackRate) a.updatePlaybackRate(v); else a.playbackRate = v;
      });
    };
    mq.addEventListener('mouseenter', function () { rate(0.22); });
    mq.addEventListener('mouseleave', function () { rate(1); });
  })();
})();

/* ---- soft lerp scroll (desktop, fine pointers) — the slow, buttery Framer
   feel, FAIL-OPEN: any error or stall instantly returns native scrolling. ---- */
(function(){
  if (!matchMedia('(min-width:821px) and (pointer:fine)').matches) return;
  var target = 0, cur = 0, raf = null, active = false, dead = false;
  var lastMove = 0, lastY = -1;
  var EASE = 0.09;
  document.documentElement.style.setProperty('scroll-behavior','auto','important');
  function maxY(){ return Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight); }
  function loop(){
    try{
      cur += (target - cur) * EASE;
      if (Math.abs(target - cur) < 0.5){
        cur = target;
        window.scrollTo({ top: cur, behavior: 'auto' });
        raf = null; active = false; return;
      }
      window.scrollTo({ top: cur, behavior: 'auto' });
      /* watchdog: if the page position refuses to move while we hold the wheel,
         hand scrolling back to the browser for good */
      var y = window.scrollY;
      if (y !== lastY){ lastY = y; lastMove = performance.now(); }
      else if (performance.now() - lastMove > 600 && Math.abs(target - cur) > 4){
        dead = true; raf = null; active = false; return;
      }
      raf = requestAnimationFrame(loop);
    }catch(err){ dead = true; raf = null; active = false; }
  }
  addEventListener('wheel', function(e){
    try{
      if (dead) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;              /* zoom / horizontal */
      if (document.body.classList.contains('menu-open')) return;    /* overlay owns input */
      var t = e.target;
      if (t && t.closest && t.closest('.chat, .latest-panel, .mobile-menu, .mm-right, textarea, select, .bb-mount, .reader, .lb, .mobile-sheet, [data-native-scroll]')) return;
      var d = e.deltaY;
      if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= innerHeight;
      if (!isFinite(d) || d === 0) return;
      e.preventDefault();
      if (!active){ cur = window.scrollY; target = cur; active = true; lastY = -1; lastMove = performance.now(); }
      target = Math.max(0, Math.min(maxY(), target + d));
      if (!raf) raf = requestAnimationFrame(loop);
    }catch(err){ dead = true; }
  }, { passive:false });
  /* stay in sync when scrolling happens by other means (keys, glide, anchors) */
  addEventListener('scroll', function(){
    if (!raf){ target = window.scrollY; cur = target; }
  }, { passive:true });
})();

/* ---- flip the print-gated FontAwesome stylesheet live (non-blocking icons) ---- */
(function(){ var f=document.getElementById('faCss'); if(f) f.media='all'; })();

/* ---- the hover tab-card is a LINK: it stays while hovered and a click
   activates the tab it previews ---- */
(function(){
  var last = null;
  document.addEventListener('mouseover', function(e){
    if (!e.target || !e.target.closest) return;
    var t = e.target.closest('.tabs .tab');
    if (t) last = t;
    var c = e.target.closest('.tab-card');
    if (c) c.classList.add('is-shown');
  }, true);
  document.addEventListener('click', function(e){
    if (!e.target || !e.target.closest) return;
    var c = e.target.closest('.tab-card');
    if (c && last){ c.classList.remove('is-shown'); last.click(); }
  }, true);
})();
