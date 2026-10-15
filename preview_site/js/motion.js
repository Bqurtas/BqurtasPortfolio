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
          if (document.hidden || document.body.classList.contains('menu-open')
            || document.body.classList.contains('menu-closing')) return;
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
            var room = pending[i].sheet.closest('.room');
            if (room && room.classList.contains('is-hidden')) continue;
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
            document.removeEventListener('bq:route', queueRise);
            document.removeEventListener('bq:menu-closed', queueRise);
            document.removeEventListener('visibilitychange', queueRise);
          }
        };
        var queueRise = function () {
          if (!frame) frame = requestAnimationFrame(checkRise);
        };
        addEventListener('scroll', queueRise, { passive: true });
        addEventListener('resize', queueRise, { passive: true });
        document.addEventListener('bq:route', queueRise);
        document.addEventListener('bq:menu-closed', queueRise);
        document.addEventListener('visibilitychange', queueRise);
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


    }

    /* ---- slow section-title drift gives long pages a soft depth cue ---- */
    var driftCompact = matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)');
    var compact = driftCompact.matches;
    if (!reduce && !compact) {
      var driftItems = Array.from(document.querySelectorAll(
        '.service-showcase-title, .bio-teaser-title, .software-title, .latest-blog-title, .pj-room-title'
      ));
      var driftFrame = 0;
      var driftValues = [];
      var driftPainted = [];
      var driftReduced = matchMedia('(prefers-reduced-motion: reduce)');
      var updateDrift = function () {
        driftFrame = 0;
        /* A desktop window can become compact after this layer started. Clear
           its desktop offset once, then stay idle as on an ordinary phone. */
        var mode = document.documentElement?.dataset?.motionMode;
        if (driftCompact.matches || mode === 'reduced' || (mode !== 'full' && driftReduced.matches)) {
          for (var r = 0; r < driftItems.length; r++) {
            if (driftPainted[r] == null) continue;
            driftItems[r].style.removeProperty('--motion-drift');
            driftPainted[r] = null;
          }
          return;
        }
        if (document.hidden || document.body.classList.contains('menu-open')
          || document.body.classList.contains('menu-closing')) return;
        var vh = innerHeight;
        /* read every rect first — a write in between forces the next read to
           re-run layout, which is what made this the most expensive thing on
           the page during a scroll */
        for (var i = 0; i < driftItems.length; i++) {
          var room = driftItems[i].closest('.room');
          if (room && room.classList.contains('is-hidden')) {
            driftValues[i] = null;
            continue;
          }
          var rect = driftItems[i].getBoundingClientRect();
          driftValues[i] = (rect.bottom < -80 || rect.top > vh + 80)
            ? null
            : clamp((rect.top + rect.height * 0.5) / vh, 0, 1);
        }
        /* then write */
        for (var j = 0; j < driftItems.length; j++) {
          if (driftValues[j] === null) continue;
          var value = ((driftValues[j] - 0.5) * 14).toFixed(2) + 'px';
          if (value === driftPainted[j]) continue;
          driftItems[j].style.setProperty('--motion-drift', value);
          driftPainted[j] = value;
        }
      };
      var queueDrift = function () {
        if (!driftFrame) driftFrame = requestAnimationFrame(updateDrift);
      };
      updateDrift();
      addEventListener('scroll', queueDrift, { passive: true });
      addEventListener('resize', queueDrift);
      document.addEventListener('bq:route', queueDrift);
      document.addEventListener('bq:menu-closed', queueDrift);
      document.addEventListener('visibilitychange', queueDrift);
      driftCompact.addEventListener?.('change', queueDrift);
      driftReduced.addEventListener?.('change', queueDrift);
      document.addEventListener('bq:motion-preference', queueDrift);
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

/* Leaf layers move inside stationary paper. Native scrolling, gallery sizing
   and the original image frames stay under main.js's control. */
(function reactiveSceneMotion() {
  'use strict';
  function init() {
    var root = document.documentElement;
    var reduced = matchMedia('(prefers-reduced-motion: reduce)');
    var pointer = matchMedia('(hover: hover) and (pointer: fine)');
    var override = '';
    try { override = localStorage.getItem('bq_motion') || ''; } catch (_) {}
    var enabled = false, frame = 0, awake = true;
    var x = 0, y = 0, wantedX = 0, wantedY = 0;
    var scene = null, layers = [], surface = null, surfaceRect = null;
    var clientX = 0, clientY = 0, surfaceDirty = false;
    var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
    var scenes = Array.from(document.querySelectorAll('.room > .hero, .room > .room-hero'));
    var lightbox = document.querySelector('.lb-overlay');
    var props = ['--scene-x', '--scene-y', '--scene-rx', '--scene-ry'];
    function resetLayers() {
      layers.forEach(function (layer) { props.forEach(function (name) { layer.style.removeProperty(name); }); });
    }
    function clearSurface() {
      if (!surface) return;
      surface.classList.remove('bq-motion-surface');
      surface.style.removeProperty('--scene-light-x');
      surface.style.removeProperty('--scene-light-y');
      surface = surfaceRect = null;
      surfaceDirty = false;
    }
    function blocked() {
      return !enabled || !awake || document.hidden
        || document.body.classList.contains('menu-open')
        || document.body.classList.contains('menu-closing')
        || !!(lightbox && lightbox.classList.contains('is-open'));
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      x = y = wantedX = wantedY = 0;
      resetLayers();
      clearSurface();
    }
    function write(layer, name, value) {
      if (layer.style.getPropertyValue(name) !== value) layer.style.setProperty(name, value);
    }
    function queue() { if (!frame && !blocked()) frame = requestAnimationFrame(paint); }
    function paint() {
      frame = 0;
      if (blocked()) { stop(); return; }
      // Read the one active hover surface before any writes. Scroll frames use
      // the paper's cached document origin and never measure the gallery.
      if (surfaceDirty && surface && !surfaceRect) surfaceRect = surface.getBoundingClientRect();
      var start = scene && scene.scroller && Number(scene.scroller.dataset.paperStart);
      var progress = scene ? clamp((window.scrollY - (Number.isFinite(start) ? start : 0)) / Math.max(1, innerHeight), 0, 1) : 1;
      var active = progress < 1 && scene;
      var targetX = active && pointer.matches ? wantedX : 0;
      var targetY = active && pointer.matches ? wantedY : 0;
      x += (targetX - x) * .2;
      y += (targetY - y) * .2;
      if (Math.abs(targetX - x) < .002) x = targetX;
      if (Math.abs(targetY - y) < .002) y = targetY;
      if (scene) {
        var depth = pointer.matches ? 1 : .55;
        scene.layers.forEach(function (layer) {
          var portrait = layer.classList.contains('hero-portrait');
          var ghost = layer.classList.contains('room-hero-ghost');
          var amount = portrait ? 12 : ghost ? -10 : -5;
          write(layer, '--scene-x', (x * amount).toFixed(2) + 'px');
          write(layer, '--scene-y', (y * amount * .6 - progress * (portrait ? 26 : ghost ? -12 : 12) * depth).toFixed(2) + 'px');
          if (portrait) {
            write(layer, '--scene-rx', (-y * 1.8).toFixed(2) + 'deg');
            write(layer, '--scene-ry', (x * 2.4).toFixed(2) + 'deg');
          }
        });
      }
      if (surfaceDirty && surface && surfaceRect && surfaceRect.width && surfaceRect.height) {
        write(surface, '--scene-light-x', (clamp((clientX - surfaceRect.left) / surfaceRect.width, 0, 1) * 100).toFixed(1) + '%');
        write(surface, '--scene-light-y', (clamp((clientY - surfaceRect.top) / surfaceRect.height, 0, 1) * 100).toFixed(1) + '%');
      }
      surfaceDirty = false;
      if (x !== targetX || y !== targetY) queue();
    }
    function chooseScene() {
      stop();
      var element = scenes.find(function (item) { return !item.closest('.room').classList.contains('is-hidden'); });
      var leaves = element ? Array.from(element.querySelectorAll('.hero-portrait, .hero-sign, .room-hero-title, .room-hero-ghost')) : [];
      scene = element ? { element: element, scroller: element.querySelector('.paper-scroll'), layers: leaves } : null;
      layers = leaves;
      queue();
    }
    function preference() {
      enabled = override === 'on' || (override !== 'off' && !reduced.matches);
      root.classList.toggle('bq-reactive-motion', enabled);
      root.dataset.motionMode = enabled ? 'full' : 'reduced';
      stop();
      document.dispatchEvent(new CustomEvent('bq:motion-preference'));
      queue();
    }
    document.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse' || !pointer.matches || blocked()) return;
      clientX = event.clientX; clientY = event.clientY;
      wantedX = clamp(clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
      wantedY = clamp(clientY / Math.max(1, innerHeight) * 2 - 1, -1, 1);
      var next = root.classList.contains('bq-scrolling') ? null : event.target.closest('#grid .card');
      if (next !== surface) {
        clearSurface(); surface = next;
        if (surface) surface.classList.add('bq-motion-surface');
      }
      surfaceDirty = !!surface;
      queue();
    }, { passive: true });
    document.addEventListener('pointerout', function (event) {
      if (event.relatedTarget) return;
      wantedX = wantedY = 0;
      clearSurface(); queue();
    }, { passive: true });
    document.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse') { wantedX = wantedY = 0; clearSurface(); queue(); }
    }, { passive: true });
    addEventListener('scroll', function () { clearSurface(); queue(); }, { passive: true });
    addEventListener('resize', function () { stop(); queue(); }, { passive: true });
    addEventListener('blur', function () { awake = false; stop(); });
    addEventListener('focus', function () { awake = true; queue(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else queue(); });
    document.addEventListener('bq:route', chooseScene);
    document.addEventListener('bq:lightbox-open', stop);
    document.addEventListener('bq:menu-closed', queue);
    window.addEventListener('bq:css-ready', chooseScene);
    reduced.addEventListener('change', preference);
    pointer.addEventListener('change', function () { stop(); queue(); });
    addEventListener('storage', function (event) {
      if (event.key !== 'bq_motion' && event.key !== null) return;
      override = event.newValue || ''; preference();
    });
    if (typeof MutationObserver === 'function') {
      new MutationObserver(function () { if (blocked()) stop(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    chooseScene();
    preference();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
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
  if (document.querySelector('.cursor-dot')) return;

  var root = document.documentElement;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var desktop = matchMedia('(min-width: 900px)');

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

  /* Park both marks off-screen until the pointer first reports in, so neither
     flashes in the top-left corner on load. */
  var px = -100, py = -100;
  var rx = px, ry = py;
  var magnetX = 0, magnetY = 0;
  var frame = 0;
  var focused = true, visible = false, hasPointer = false;
  var target = null, resolvedTarget = null, hit = null, action = '', magnetic = false;
  var rectTarget = null, targetRect = null, rectDirty = true, inputPending = false;
  var lastText = 'Open', lastAction = null, lastState = null;
  var lastDot = '', lastRing = '';

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

  function allowed() {
    return fine.matches && desktop.matches && focused && !document.hidden
      && root.classList.contains('bq-reactive-motion')
      && !document.body.classList.contains('menu-open')
      && !document.body.classList.contains('menu-closing');
  }

  function setVisible(on) {
    if (visible === on) return;
    visible = on;
    dot.style.opacity = on ? '1' : '0';
    ring.style.opacity = on ? '1' : '0';
    root.classList.toggle('bq-cursor-on', on);
  }

  /* Pointer events only replace the pending sample. Geometry and semantic
     writes happen once in its animation frame, before transform writes. A
     settling spring never re-reads its target or rewrites unchanged labels. */
  function resolvePointer() {
    if (target !== resolvedTarget) {
      resolvedTarget = target;
      hit = target && target.closest && target.closest(HOVER);
      action = cursorAction(target);
      magnetic = !!(hit && hit.matches('.mm-link, .hero-cta, .service-cta, .bio-teaser-link, .pitch-submit, .footer-email'));
    }
    if (magnetic) {
      if (hit !== rectTarget || rectDirty) {
        targetRect = hit.getBoundingClientRect();
        rectTarget = hit;
        rectDirty = false;
      }
      magnetX = clamp((targetRect.left + targetRect.width / 2 - px) * 0.12, -10, 10);
      magnetY = clamp((targetRect.top + targetRect.height / 2 - py) * 0.12, -10, 10);
    } else {
      magnetX = magnetY = 0;
    }
    var text = actionLabel(action);
    if (text !== lastText) { label.textContent = text; lastText = text; }
    if (action !== lastAction) { ring.dataset.cursorAction = action; lastAction = action; }
    var state = action + '|' + !!hit + '|' + magnetic;
    if (state !== lastState) {
      ring.classList.toggle('is-open', action === 'view');
      ring.classList.toggle('has-label', !!action && action !== 'view');
      ring.classList.toggle('is-hover', !!hit && !action);
      ring.classList.toggle('is-magnet', magnetic);
      lastState = state;
    }
    inputPending = false;
  }

  function paint() {
    frame = 0;
    if (!allowed() || !hasPointer) { suspend(); return; }
    if (inputPending) resolvePointer();
    /* The ring eases toward the pointer; the dot is already there. A single
       lerp per frame is what produces the trail — no library needed. */
    var tx = px + magnetX;
    var ty = py + magnetY;
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    var unsettled = Math.abs(tx - rx) > 0.1 || Math.abs(ty - ry) > 0.1;
    if (!unsettled) { rx = tx; ry = ty; }
    var dotTransform = 'translate(' + px + 'px,' + py + 'px) translate(-50%,-50%)';
    var ringTransform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px) translate(-50%,-50%)';
    if (dotTransform !== lastDot) { dot.style.transform = dotTransform; lastDot = dotTransform; }
    if (ringTransform !== lastRing) { ring.style.transform = ringTransform; lastRing = ringTransform; }
    setVisible(true);
    /* Keep animating while the ring still has ground to cover. */
    if (unsettled) queue();
  }

  function queue() {
    if (!frame && allowed() && hasPointer) frame = requestAnimationFrame(paint);
  }

  function move(e) {
    if (e.pointerType && e.pointerType !== 'mouse') { suspend(); return; }
    if (!allowed()) { suspend(); return; }
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
    px = e.clientX;
    py = e.clientY;
    if (!hasPointer) {
      rx = px; ry = py;
    }
    hasPointer = true;
    target = e.target;
    inputPending = true;
    queue();
  }
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', move, { passive: true });

  function invalidateGeometry() { rectDirty = true; }
  function suspend() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    inputPending = hasPointer = false;
    target = resolvedTarget = rectTarget = targetRect = null;
    rectDirty = true;
    magnetX = magnetY = 0;
    setVisible(false);
  }
  document.addEventListener('pointerleave', suspend);
  window.addEventListener('blur', function () { focused = false; suspend(); });
  window.addEventListener('focus', function () { focused = true; });
  document.addEventListener('visibilitychange', suspend);
  document.addEventListener('bq:route', suspend);
  document.addEventListener('bq:menu-closed', suspend);
  document.addEventListener('bq:motion-preference', suspend);
  document.addEventListener('bq:language', function () {
    if (hasPointer && allowed()) { inputPending = true; queue(); }
  });
  window.addEventListener('scroll', invalidateGeometry, { passive: true });
  window.addEventListener('resize', invalidateGeometry, { passive: true });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', suspend);
  fine.addEventListener?.('change', suspend);
  desktop.addEventListener?.('change', suspend);
  if (typeof MutationObserver === 'function') {
    new MutationObserver(function () {
      if (document.body.classList.contains('menu-open') || document.body.classList.contains('menu-closing')) suspend();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* A pen or finger on a hybrid machine hands control back to the real cursor. */
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') {
      suspend();
    }
  }, { passive: true });
})();
