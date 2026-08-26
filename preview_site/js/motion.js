/* =========================================================
   Barakat Qurtas — motion layer v250
   Additive interaction only: no routing, content, form or gallery logic.
   ========================================================= */
(function () {
  'use strict';

  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (n, min, max) { return Math.max(min, Math.min(max, n)); };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    /* ---- hero entrance: one quiet rise, then still ---- */
    var compactStart = matchMedia('(max-width: 1024px)').matches
      || matchMedia('(hover: none), (pointer: coarse)').matches;
    var hero = document.querySelector('#design > .hero');
    if (hero && !reduce && !compactStart) {
      var heroBits = hero.querySelectorAll(
        '.hero-portrait, .hero-sign, .hero-spark, .hero-lede, .hero-cta, .hero-corner, .hero-scrolldown'
      );
      heroBits.forEach(function (el, i) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(14px)';
        el.style.transition =
          'opacity .9s cubic-bezier(.16,1,.3,1) ' + (120 + i * 70) + 'ms, ' +
          'transform .9s cubic-bezier(.16,1,.3,1) ' + (120 + i * 70) + 'ms';
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          heroBits.forEach(function (el) {
            el.style.opacity = '';
            el.style.transform = '';
          });
          setTimeout(function () {
            heroBits.forEach(function (el) {
              el.style.transition = '';
            });
          }, 1400);
        });
      });
    }

    /* ---- service accordion ---- */
    var panels = Array.from(document.querySelectorAll('.service-panel'));
    var activate = function (panel) {
      panels.forEach(function (item) {
        var active = item === panel;
        item.classList.toggle('is-active', active);
        var trigger = item.querySelector('.service-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', active ? 'true' : 'false');
      });
    };
    panels.forEach(function (panel) {
      var trigger = panel.querySelector('.service-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', function () { activate(panel); });
      trigger.addEventListener('focus', function () { activate(panel); });
    });

    /* ---- software lines keep moving; hover only lowers their speed ---- */
    document.querySelectorAll('.software-line').forEach(function (line) {
      var track = line.querySelector('.software-track');
      if (!track || !track.getAnimations) return;
      var setRate = function (rate) {
        track.getAnimations().forEach(function (animation) {
          if (animation.updatePlaybackRate) animation.updatePlaybackRate(rate);
          else animation.playbackRate = rate;
        });
      };
      line.addEventListener('mouseenter', function () { setRate(0.32); });
      line.addEventListener('mouseleave', function () { setRate(1); });
    });

    /* ---- reveal choreography ---- */
    var revealItems = Array.from(document.querySelectorAll(
      '[data-motion], .latest-blog-grid .blog-card, #contact .qc-card, #contact .pitch-wrap, ' +
      '.bio-doc-btn, .footer-stage-copy, .footer-main-v249 > *, .practice-note .software-head, ' +
      '.pj-room-mark, .studio-card, .studio-step, .studio-proof-item, .pj-cta-section'
    ));
    revealItems.forEach(function (el, index) {
      el.classList.add('motion-reveal');
      el.style.setProperty('--motion-delay', Math.min(index % 4, 3) * 80 + 'ms');
    });
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('motion-in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      revealItems.forEach(function (el) { revealObserver.observe(el); });
    } else {
      revealItems.forEach(function (el) { el.classList.add('motion-in'); });
    }

    /* ---- masked rise: the two home sheets that arrived with no motion ----
       "What I do" and "A short note" were assembled and then simply appeared.
       Everything else on the page has the fade above; these two get a firmer
       move, because they are the sheets a visitor stops on. Each line is
       clipped to its own baseline and lifts out from behind it, one after the
       next, so the sheet composes itself in reading order instead of arriving
       whole. Selectors live here rather than in the markup so the i18n pass —
       which rewrites innerHTML on every [data-i18n] node — cannot strip them. */
    var riseGroups = [
      { sheet: '#design > .service-showcase',
        parts: ['.service-showcase-head .section-num',
                '.service-showcase-head .section-title',
                '.service-showcase-head .section-lede',
                '.service-showcase-head .service-cta',
                '.service-panel'] },
      { sheet: '#design > .practice-note',
        parts: ['.bio-teaser-text .section-num',
                '.bio-teaser-title',
                '.bio-teaser-text p',
                '.bio-teaser-link',
                '.stat',
                '.software-experience'] }
    ];
    var riseSheets = [];
    riseGroups.forEach(function (group) {
      var sheet = document.querySelector(group.sheet);
      if (!sheet) return;
      var items = [];
      var step = 0;
      group.parts.forEach(function (selector) {
        sheet.querySelectorAll(selector).forEach(function (el) {
          if (el.dataset.bqRise) return;
          el.dataset.bqRise = '1';
          el.classList.add('bq-rise');
          /* 70ms reads as one continuous move; more and it becomes a queue. */
          el.style.setProperty('--bq-rise-delay', step * 70 + 'ms');
          step += 1;
          items.push(el);
        });
      });
      if (items.length) riseSheets.push({ sheet: sheet, items: items });
    });
    var riseItems = riseSheets.reduce(function (all, group) { return all.concat(group.items); }, []);
    if (riseItems.length) {
      if (reduce) {
        riseItems.forEach(function (el) { el.classList.add('is-risen'); });
      } else {
        /* Not IntersectionObserver. These two sheets live inside the paper
           stack, whose sheets sit in a clipped, transformed container, so the
           observer reports ratio 0 against the viewport root even while the
           element is plainly on screen — measured, not assumed. getBoundingClientRect
           does report the true position there, so the scroll position drives it. */
        var pending = riseSheets.slice();
        var frame = 0;
        var checkRise = function () {
          frame = 0;
          /* Gate on the SHEET, never on the items. The deck stacks its sheets at
             the same pinned position, so every item reports itself on screen from
             the very top of the page and the whole choreography would burn off
             before the sheet was ever looked at. The sheet's own top is the only
             honest signal for which one has arrived. */
          var limit = window.innerHeight * 0.55;
          /* read first, mutate after — adding a class mid-loop would force the
             next sheet's rect to re-run layout */
          var arrived = [];
          for (var i = pending.length - 1; i >= 0; i--) {
            if (pending[i].sheet.getBoundingClientRect().top < limit) arrived.push(i);
          }
          for (var a = 0; a < arrived.length; a++) {
            var group = pending[arrived[a]];
            group.items.forEach(function (el) { el.classList.add('is-risen'); });
            pending.splice(arrived[a], 1);
          }
          if (!pending.length) {
            removeEventListener('scroll', queueRise);
            removeEventListener('resize', queueRise);
          }
        };
        var queueRise = function () {
          if (!frame) frame = requestAnimationFrame(checkRise);
        };
        addEventListener('scroll', queueRise, { passive: true });
        addEventListener('resize', queueRise, { passive: true });
        queueRise();
      }
    }

    /* ---- top bar hierarchy on scroll ---- */
    var scrolledNow = null;
    var setScrolled = function () {
      var on = window.scrollY > 24;
      if (on === scrolledNow) return;
      scrolledNow = on;
      document.body.classList.toggle('is-scrolled', on);
    };
    setScrolled();
    addEventListener('scroll', setScrolled, { passive: true });

    if (fine && !reduce) {
      /* ---- magnetic controls (uses the independent `translate` property) ---- */
      var magnetic = document.querySelectorAll(
        '.rail-menu, #railChat, #railLatest, #themeToggle, .social-current, .lang-current, ' +
        '.pencemor-hero-btn, .pj-room-btn, .pitch-submit, .service-cta, .software-link, .bio-doc-btn, ' +
        '.footer-cta-btn, .footer-email, .footer-top-btn, .hero-cta, .load-more-btn, .mobilebar-cta, ' +
        '.mm-touch, .tab, .blog-more, .latest-blog-all, .bio-teaser-link'
      );
      magnetic.forEach(function (el) {
        el.classList.add('motion-magnetic');
        el.addEventListener('pointermove', function (event) {
          var rect = el.getBoundingClientRect();
          var x = (event.clientX - rect.left) / rect.width - 0.5;
          var y = (event.clientY - rect.top) / rect.height - 0.5;
          el.style.translate = (x * 7).toFixed(2) + 'px ' + (y * 6).toFixed(2) + 'px';
        });
        el.addEventListener('pointerleave', function () { el.style.translate = '0 0'; });
      });

      /* ---- restrained card tilt ---- */
      document.querySelectorAll('.feature-card, .latest-blog-grid .blog-card, .work-card, .studio-card, .studio-step, #grid .card').forEach(function (card) {
        card.classList.add('motion-tilt');
        card.addEventListener('pointermove', function (event) {
          var rect = card.getBoundingClientRect();
          var px = (event.clientX - rect.left) / rect.width - 0.5;
          var py = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.setProperty('--tilt-x', (-py * 3.5).toFixed(2) + 'deg');
          card.style.setProperty('--tilt-y', (px * 4).toFixed(2) + 'deg');
          card.style.setProperty('--shine-x', (px + 0.5) * 100 + '%');
          card.style.setProperty('--shine-y', (py + 0.5) * 100 + '%');
        });
        card.addEventListener('pointerleave', function () {
          card.style.setProperty('--tilt-x', '0deg');
          card.style.setProperty('--tilt-y', '0deg');
          card.style.setProperty('--shine-x', '50%');
          card.style.setProperty('--shine-y', '50%');
        });
      });

      /* ---- soft spotlight across stacked homepage sheets ---- */
      document.querySelectorAll('#design > .section.section').forEach(function (sheet) {
        sheet.addEventListener('pointermove', function (event) {
          var rect = sheet.getBoundingClientRect();
          sheet.style.setProperty('--bq-spot-x', (event.clientX - rect.left) + 'px');
          sheet.style.setProperty('--bq-spot-y', (event.clientY - rect.top) + 'px');
        });
      });

      /* ---- menu preview follows room focus / hover ---- */
      var menu = document.getElementById('mobileMenu');
      if (menu) {
        var previewNo = document.getElementById('menuPreviewNo');
        var previewTitle = document.getElementById('menuPreviewTitle');
        var previewNote = document.getElementById('menuPreviewNote');
        var figure = document.getElementById('menuFigure');
        var roomLinks = Array.from(menu.querySelectorAll('.mm-link'));
        var translated = function (key, fallback) {
          return (key && window.BQ_DICT && window.BQ_DICT[key]) || fallback || '';
        };
        var coverImg = document.getElementById('menuCoverImg');
        var navEl = menu.querySelector('.mm-nav');
        var coverFor = function (link) {
          var lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
          var map = { ckb: 'ku', ku: 'ku', ar: 'ar', kmr: 'kmr', fr: 'fr', tr: 'tr', sv: 'sv' };
          var prefix = map[lang] || 'en';
          var room = link.dataset.route || 'design';
          return 'assets/covers/' + prefix + '-' + room + '.jpg';
        };
        var placeRail = function (link) {
          if (!navEl || !link) return;
          var navBox = navEl.getBoundingClientRect();
          var box = link.getBoundingClientRect();
          navEl.style.setProperty('--mm-rail-y', (box.top - navBox.top + (box.height / 2)) + 'px');
        };
        var applyPreview = function (link) {
          var number = link.querySelector('.mm-n');
          var title = link.querySelector('.mm-link-text');
          var room = link.dataset.route || 'design';
          if (previewNo && number) previewNo.textContent = number.textContent.trim() + ' / ' + String(roomLinks.length).padStart(2, '0');
          if (previewTitle && title) previewTitle.textContent = title.textContent.trim();
          if (previewNote) previewNote.textContent = translated(link.dataset.i18nMenuNote, link.dataset.menuNote || '');
          if (figure) figure.dataset.room = room;
          menu.dataset.previewRoom = room;
          placeRail(link);
          roomLinks.forEach(function (el) { el.classList.toggle('is-preview', el === link); });
          if (coverImg) {
            var next = coverFor(link);
            if (coverImg.getAttribute('src') !== next) {
              coverImg.classList.add('is-swapping');
              window.setTimeout(function () {
                coverImg.src = next;
                requestAnimationFrame(function () { coverImg.classList.remove('is-swapping'); });
              }, 180);
            }
          }
        };
        var updatePreview = function (link) {
          if (!link) return;
          var room = link.dataset.route || 'design';
          /* smooth Strida-style swap: fade the cover content out, change, fade back */
          if (figure && figure.dataset.room && figure.dataset.room !== room && !reduce) {
            figure.classList.add('is-fading');
            clearTimeout(figure._ft);
            figure._ft = setTimeout(function () {
              applyPreview(link);
              requestAnimationFrame(function () { figure.classList.remove('is-fading'); });
            }, 190);
          } else {
            applyPreview(link);
          }
          menu.dataset.previewRoom = room;
        };
        /* the preview is a stationary side panel — it just swaps image on hover */
        roomLinks.forEach(function (link) {
          link.addEventListener('mouseenter', function () { updatePreview(link); });
          link.addEventListener('focus', function () { updatePreview(link); });
        });
        updatePreview(menu.querySelector('.mm-link.is-active') || roomLinks[0]);
        if (typeof MutationObserver === 'function') {
          new MutationObserver(function () {
            if (!menu.classList.contains('is-ready')) return;
            placeRail(menu.querySelector('.mm-link.is-preview') || menu.querySelector('.mm-link.is-active') || roomLinks[0]);
          }).observe(menu, { attributes: true, attributeFilter: ['class'] });
        }
      }

      /* ---- biography spotlight follows the pointer without moving layout ---- */
      document.querySelectorAll('#bio .bio-block').forEach(function (card) {
        card.addEventListener('pointermove', function (event) {
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--bio-x', event.clientX - rect.left + 'px');
          card.style.setProperty('--bio-y', event.clientY - rect.top + 'px');
        });
      });

    }

    /* ---- slow section-title drift gives long pages a soft depth cue ---- */
    var compact = matchMedia('(max-width: 1024px)').matches
      || matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!reduce && !compact) {
      var driftItems = Array.from(document.querySelectorAll(
        '.service-showcase-title, .bio-teaser-title, .software-title, .latest-blog-title, .room-hero-title, .pj-room-title'
      ));
      var driftFrame = 0;
      var driftValues = [];
      var updateDrift = function () {
        driftFrame = 0;
        var vh = innerHeight;
        /* read every rect first — a write in between forces the next read to
           re-run layout, which is what made this the most expensive thing on
           the page during a scroll */
        for (var i = 0; i < driftItems.length; i++) {
          var rect = driftItems[i].getBoundingClientRect();
          driftValues[i] = (rect.bottom < -80 || rect.top > vh + 80)
            ? null
            : clamp((rect.top + rect.height * 0.5) / vh, 0, 1);
        }
        /* then write */
        for (var j = 0; j < driftItems.length; j++) {
          if (driftValues[j] === null) continue;
          driftItems[j].style.setProperty(
            '--motion-drift', ((driftValues[j] - 0.5) * 14).toFixed(2) + 'px');
        }
      };
      var queueDrift = function () {
        if (!driftFrame) driftFrame = requestAnimationFrame(updateDrift);
      };
      updateDrift();
      addEventListener('scroll', queueDrift, { passive: true });
      addEventListener('resize', queueDrift);
    }

    /* Infinite marquees only run while on-screen; pause in background tabs. */
    var softwareTracks = Array.from(document.querySelectorAll('.software-track, .hero-marquee-track'));
    if (softwareTracks.length && 'IntersectionObserver' in window) {
      var trackObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
        });
      }, { rootMargin: '12% 0px' });
      softwareTracks.forEach(function (track) { trackObserver.observe(track); });
    }
    var syncPaused = function () {
      document.documentElement.classList.toggle('bq-paused', document.hidden);
    };
    syncPaused();
    document.addEventListener('visibilitychange', syncPaused);
  });
})();

/* =========================================================
   Mobile portfolio tabs stay pinned while the catalogue scrolls.
   (Fade-out removed — filters must remain readable end-to-end.)
   ========================================================= */
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  ready(function () {
    var section = document.querySelector('.section.work');
    if (!section) return;
    var scroller = section.querySelector(':scope > .paper-scroll');
    var wrap = (scroller && scroller.querySelector(':scope > .tabs-wrap')) || section.querySelector(':scope > .tabs-wrap');
    if (!wrap) return;
    wrap.style.opacity = '';
    wrap.style.pointerEvents = '';
  });
})();

/* =========================================================
   CURSOR — a dot that tracks, a ring that trails.

   style.css has carried a complete contract for this since v1 (43 rules:
   .cursor-dot, .cursor-ring, .is-hover, .is-open with its OPEN label, and a
   coarse-pointer opt-out) but nothing ever built the two elements, so the
   whole thing was dead. This wires it up.

   Both marks are drawn with mix-blend-mode: difference, so they carry no
   colour of their own — they invert against whatever is under them and stay
   black-and-white on a black-and-white site.

   The dot rides the pointer. The ring trails it on a spring, and the gap
   between them is the whole effect: fast when you flick, settling when you
   stop. Pointer-fine only, and reduced motion drops the trail.
   ========================================================= */
(function customCursor() {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(max-width: 900px)').matches) return;
  if (document.querySelector('.cursor-dot')) return;

  var reduced = matchMedia('(prefers-reduced-motion: reduce)');

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  var label = document.createElement('span');
  label.className = 'cursor-ring-label';
  label.textContent = 'Open';
  ring.appendChild(label);

  document.body.appendChild(ring);
  document.body.appendChild(dot);
  document.documentElement.classList.add('bq-cursor-on');

  /* Park both marks off-screen until the pointer first reports in, so neither
     flashes in the top-left corner on load. */
  var px = -100, py = -100;
  var rx = px, ry = py;
  var magnetX = 0, magnetY = 0;
  var seen = false;
  var frame = 0;

  dot.style.opacity = '0';
  ring.style.opacity = '0';

  var HOVER = 'a[href], button, [role="button"], input, textarea, select, summary,' +
              '.tab, .mm-link, .service-trigger, .index-row, .rail-link, .mobilebar-btn';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cursorAction(target) {
    if (!target || !target.closest) return '';
    if (target.closest('#grid .card, .logos-grid .logo-mark, .cert-grid a')) return 'view';
    if (target.closest('a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"], [data-route="contact"]')) return 'talk';
    if (target.closest('button[type="submit"], .pitch-submit')) return 'send';
    if (target.closest('.mm-link, .hero-cta, .service-cta, .bio-teaser-link, .blog-more, .latest-blog-all')) return 'open';
    return '';
  }

  function actionLabel(action) {
    var fallback = { view: 'View', talk: 'Talk', send: 'Send', open: 'Open' };
    return (window.BQ_DICT && window.BQ_DICT['cursor.' + action]) || fallback[action] || '';
  }

  function paint() {
    frame = 0;
    /* The ring eases toward the pointer; the dot is already there. A single
       lerp per frame is what produces the trail — no library needed. */
    var k = reduced.matches ? 1 : 0.18;
    var tx = px + magnetX;
    var ty = py + magnetY;
    rx += (tx - rx) * k;
    ry += (ty - ry) * k;
    dot.style.transform = 'translate(' + px + 'px,' + py + 'px) translate(-50%,-50%)';
    ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    /* Keep animating while the ring still has ground to cover. */
    if (Math.abs(tx - rx) > 0.1 || Math.abs(ty - ry) > 0.1) queue();
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    px = e.clientX;
    py = e.clientY;
    if (!seen) {
      seen = true;
      rx = px; ry = py;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
    queue();

    var t = e.target;
    var hit = t && t.closest && t.closest(HOVER);
    var action = cursorAction(t);
    var magnetic = hit && hit.matches('.mm-link, .hero-cta, .service-cta, .bio-teaser-link, .pitch-submit, .footer-email');
    if (magnetic) {
      var rect = hit.getBoundingClientRect();
      magnetX = clamp((rect.left + rect.width / 2 - px) * 0.12, -10, 10);
      magnetY = clamp((rect.top + rect.height / 2 - py) * 0.12, -10, 10);
    } else {
      magnetX = 0;
      magnetY = 0;
    }
    label.textContent = actionLabel(action);
    ring.dataset.cursorAction = action;
    ring.classList.toggle('is-open', action === 'view');
    ring.classList.toggle('has-label', !!action && action !== 'view');
    ring.classList.toggle('is-hover', !!hit && !action);
    ring.classList.toggle('is-magnet', !!magnetic);
  }, { passive: true });

  /* Leaving the window, or a context menu / tab switch, should take the marks
     with it — otherwise they sit frozen wherever the pointer left. */
  function hide() { dot.style.opacity = '0'; ring.style.opacity = '0'; }
  function show() { if (seen) { dot.style.opacity = '1'; ring.style.opacity = '1'; } }
  document.addEventListener('pointerleave', hide);
  document.addEventListener('pointerenter', show);
  window.addEventListener('blur', hide);
  window.addEventListener('focus', show);
  document.addEventListener('visibilitychange', function () { document.hidden ? hide() : show(); });

  /* A pen or finger on a hybrid machine hands control back to the real cursor. */
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') {
      hide();
      document.documentElement.classList.remove('bq-cursor-on');
    }
  }, { passive: true });
})();
