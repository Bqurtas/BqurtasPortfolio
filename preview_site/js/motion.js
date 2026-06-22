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
      if (fine) panel.addEventListener('mouseenter', function () { activate(panel); });
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
      '.bio-doc-btn, .footer-stage-copy, .footer-main-v249 > *, .practice-note .software-head'
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
      /* ---- quiet page-wide cursor light ---- */
      var cursorFrame = 0;
      addEventListener('pointermove', function (event) {
        if (cursorFrame) return;
        cursorFrame = requestAnimationFrame(function () {
          cursorFrame = 0;
          document.documentElement.style.setProperty('--cursor-x', event.clientX + 'px');
          document.documentElement.style.setProperty('--cursor-y', event.clientY + 'px');
        });
      }, { passive: true });

      /* ---- magnetic controls (uses the independent `translate` property) ---- */
      var magnetic = document.querySelectorAll(
        '.rail-menu, #railChat, #railLatest, #themeToggle, .social-current, .lang-current, ' +
        '.pencemor-hero-btn, .pitch-submit, .service-cta, .software-link, .bio-doc-btn, ' +
        '.footer-cta-btn, .footer-email, .footer-top-btn'
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
      document.querySelectorAll('.feature-card, .latest-blog-grid .blog-card, .work-card').forEach(function (card) {
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

      /* ---- service-section spotlight ---- */
      var serviceSection = document.querySelector('.service-showcase');
      if (serviceSection) {
        serviceSection.addEventListener('pointermove', function (event) {
          var rect = serviceSection.getBoundingClientRect();
          serviceSection.style.setProperty('--spot-x', event.clientX - rect.left + 'px');
          serviceSection.style.setProperty('--spot-y', event.clientY - rect.top + 'px');
        });
      }

      /* ---- menu preview follows room focus / hover ---- */
      var menu = document.getElementById('mobileMenu');
      if (menu) {
        var previewNo = document.getElementById('menuPreviewNo');
        var previewTitle = document.getElementById('menuPreviewTitle');
        var previewNote = document.getElementById('menuPreviewNote');
        var previewImg = document.getElementById('menuPreviewImg');
        var roomLinks = Array.from(menu.querySelectorAll('.mm-link'));
        var swapImg = function (src) {
          if (!previewImg || !src || previewImg.getAttribute('src') === src) return;
          previewImg.classList.add('is-swapping');
          var next = new Image();
          next.onload = function () {
            previewImg.src = src;
            requestAnimationFrame(function () { previewImg.classList.remove('is-swapping'); });
          };
          next.src = src;
        };
        var card = menu.querySelector('.mm-right');
        var nav = menu.querySelector('.mm-nav');
        var updatePreview = function (link) {
          if (!link) return;
          var number = link.querySelector('.mm-n');
          var title = link.querySelector('.mm-link-text');
          if (previewNo && number) previewNo.textContent = number.textContent.trim() + ' / 06';
          if (previewTitle && title) previewTitle.textContent = title.textContent.trim();
          if (previewNote) previewNote.textContent = link.dataset.menuNote || '';
          swapImg(link.dataset.menuImg);
          menu.dataset.previewRoom = link.dataset.route || 'design';
        };
        var showCard = function () { if (card && fine) card.classList.add('is-shown'); };
        var hideCard = function () { if (card) card.classList.remove('is-shown'); };
        roomLinks.forEach(function (link) {
          link.addEventListener('mouseenter', function () { updatePreview(link); showCard(); });
          link.addEventListener('focus', function () { updatePreview(link); });
          link.addEventListener('mouseleave', hideCard);
        });
        if (nav) nav.addEventListener('mouseleave', hideCard);

        /* the preview card eases toward the pointer, leaning into the open side */
        if (card && fine && !reduce) {
          var tx = innerWidth * 0.72, ty = innerHeight * 0.5, cx = tx, cy = ty;
          menu.addEventListener('pointermove', function (event) {
            var off = Math.min(240, innerWidth * 0.17);
            var lean = event.clientX < innerWidth * 0.5 ? off : -off;
            tx = clamp(event.clientX + lean, 190, innerWidth - 190);
            ty = clamp(event.clientY, 240, innerHeight - 240);
          });
          var follow = function () {
            cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
            card.style.left = cx.toFixed(1) + 'px';
            card.style.top = cy.toFixed(1) + 'px';
            requestAnimationFrame(follow);
          };
          follow();
        }
        updatePreview(menu.querySelector('.mm-link.is-active') || roomLinks[0]);
      }

      /* ---- biography spotlight follows the pointer without moving layout ---- */
      document.querySelectorAll('#bio .bio-stack > .bio-block').forEach(function (card) {
        card.addEventListener('pointermove', function (event) {
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--bio-x', event.clientX - rect.left + 'px');
          card.style.setProperty('--bio-y', event.clientY - rect.top + 'px');
        });
      });

      /* ---- cursor labels reflect the action under the pointer ---- */
      var cursorLabel = document.querySelector('.cursor-ring-label');
      var cursorTargets = [
        ['.mm-link', 'Go'],
        ['.tab', 'View'],
        ['.service-trigger', 'Open'],
        ['.footer-cta-btn', 'Talk'],
        ['.footer-room-nav a', 'Go'],
        ['.software-chip', 'Tool']
      ];
      cursorTargets.forEach(function (pair) {
        document.querySelectorAll(pair[0]).forEach(function (el) {
          el.addEventListener('mouseenter', function () {
            if (cursorLabel) cursorLabel.textContent = pair[1];
          });
          el.addEventListener('mouseleave', function () {
            if (cursorLabel) cursorLabel.textContent = 'Open';
          });
        });
      });
    }

    /* ---- slow section-title drift gives long pages a soft depth cue ---- */
    if (!reduce) {
      var driftItems = Array.from(document.querySelectorAll(
        '.service-showcase-title, .bio-teaser-title, .software-title, .latest-blog-title, .room-hero-title'
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
