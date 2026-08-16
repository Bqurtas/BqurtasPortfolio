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
    var hero = document.querySelector('#design > .hero');
    if (hero && !reduce) {
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

    /* ---- top bar hierarchy on scroll ---- */
    var setScrolled = function () {
      document.body.classList.toggle('is-scrolled', window.scrollY > 24);
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
    if (!reduce) {
      var driftItems = Array.from(document.querySelectorAll(
        '.service-showcase-title, .bio-teaser-title, .software-title, .latest-blog-title, .room-hero-title, .pj-room-title'
      ));
      var driftFrame = 0;
      var updateDrift = function () {
        driftFrame = 0;
        driftItems.forEach(function (item) {
          var rect = item.getBoundingClientRect();
          if (rect.bottom < -80 || rect.top > innerHeight + 80) return;
          var progress = clamp((rect.top + rect.height * 0.5) / innerHeight, 0, 1);
          item.style.setProperty('--motion-drift', ((progress - 0.5) * 14).toFixed(2) + 'px');
        });
      };
      var queueDrift = function () {
        if (!driftFrame) driftFrame = requestAnimationFrame(updateDrift);
      };
      updateDrift();
      addEventListener('scroll', queueDrift, { passive: true });
      addEventListener('resize', queueDrift);
    }
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
