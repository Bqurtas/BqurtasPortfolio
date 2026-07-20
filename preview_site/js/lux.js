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
      '<span class="lux-transition-no">01 / 04</span>' +
      '<span class="lux-transition-line"></span>';
    document.body.appendChild(curtain);

    var roomNumbers = {
      design: '01 / 04',
      blog: '02 / 04',
      bio: '03 / 04',
      contact: '04 / 04'
    };
    var roomFallbacks = {
      design: 'Design',
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

/* Scrolling intentionally stays native. Trackpads, wheel momentum, keyboard
   navigation and the hero anchor now share the browser's own scroll model. */

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

/* (the tab-switch landing now lives in main.js — one scroll system, no fights) */
