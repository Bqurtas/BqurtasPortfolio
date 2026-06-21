/* =========================================================
   lux.js — luxe motion layer (additive; safe to remove)
   • portfolio media fades from B&W to colour as it scrolls into view
   • tasteful reveal-on-scroll for section headers & cards
   ========================================================= */
(function () {
  'use strict';
  if (typeof IntersectionObserver === 'undefined') return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---- reveal-on-scroll ---- */
  if (!reduce) {
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
})();
