/* hero-pin.js — keep the pinned Design-room hero from ever bleeding through the
 * sheets that scroll over it.
 *
 * The hero is position:sticky so the work card (and every section after it)
 * rises over it like a card. Safari composites a sticky element onto its own GPU
 * layer and can then paint it ABOVE plain, non-composited content — so the
 * portrait + "Barakat Qurtas" signature bled through the covering sheets even
 * though their z-index is higher. modern-framer.css promotes those sheets to
 * their own compositing layers (translateZ) to fix the paint order; this script
 * is the hard guarantee on top of that: the instant the work card has fully
 * covered the hero, we hide the hero. A hidden layer cannot bleed anywhere, on
 * any engine. It re-shows on the way back up, so the first-screen "card rises
 * over the pinned hero" effect is untouched.
 */
(function () {
  'use strict';

  function init() {
    var hero = document.querySelector('#design > .hero');
    var work = document.querySelector('#design > .section.work');
    if (!hero || !work) return;

    // No IntersectionObserver → leave the hero fully visible (the CSS compositing
    // fix still applies); never hide it via a broken fallback.
    if (!('IntersectionObserver' in window)) return;

    // A zero-height trip-line pinned to the very top of the viewport
    // (rootMargin pulls the root's bottom edge all the way up). The callback
    // fires as the work card's top edge crosses that line; once the card's top
    // is at/above the viewport top it is covering the whole screen, so the hero
    // behind it can be safely hidden.
    var io = new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      var covered = e.boundingClientRect.top <= 0;
      hero.classList.toggle('is-hero-covered', covered);
    }, { rootMargin: '0px 0px -100% 0px', threshold: 0 });

    io.observe(work);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
