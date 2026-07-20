/* Bqurtas stage menu
   The live page becomes a quiet moving card while the menu is revealed below.
   This file owns menu timing and accessibility; the room router remains in
   main.v416.min.js. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var menu = document.getElementById('mobileMenu');
    var stage = document.getElementById('bqPageStage');
    var closeButton = document.getElementById('mobileMenuClose');
    var triggers = [
      document.getElementById('railMenu'),
      document.getElementById('menuToggle')
    ].filter(Boolean);

    if (!menu || !stage || !closeButton || !triggers.length) return;

    var body = document.body;
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var opened = false;
    var closing = false;
    var finishing = false;
    var transitionToken = 0;
    var closeTimer = 0;
    var activeTrigger = null;
    var restoreFocus = true;
    var restoreScroll = true;
    var savedScrollY = 0;
    var savedBodyOverflow = '';
    var savedBodyHeight = '';
    var inertState = new Map();

    var focusSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function isReduced() {
      return !!(reducedMotion && reducedMotion.matches);
    }

    function visibleFocusables() {
      return Array.prototype.slice.call(menu.querySelectorAll(focusSelector)).filter(function (el) {
        return !el.hidden && !el.closest('[hidden]') && el.getClientRects().length > 0;
      });
    }

    function syncCurrentRoom() {
      var room = body.dataset.room || 'design';
      menu.querySelectorAll('.mm-link[data-route]').forEach(function (link) {
        var current = link.dataset.route === room;
        link.classList.toggle('is-active', current);
        if (current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    function syncControls(isOpen, syncDialogVisibility) {
      triggers.forEach(function (trigger) {
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        trigger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        trigger.classList.toggle('is-menu-open', isOpen);
      });
      if (syncDialogVisibility !== false) menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function setBackgroundInert(makeInert) {
      Array.prototype.slice.call(body.children).filter(function (el) {
        return el !== menu && !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(el.tagName);
      }).forEach(function (el) {
        if (makeInert) {
          if (!inertState.has(el)) {
            inertState.set(el, !!el.inert);
          }
          el.inert = true;
          return;
        }
        var previous = inertState.get(el);
        el.inert = previous === undefined ? false : previous;
      });
      if (!makeInert) inertState.clear();
    }

    function prepareStage(fromExistingState) {
      savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      savedBodyOverflow = fromExistingState ? '' : body.style.overflow;
      savedBodyHeight = body.style.height;
      var documentHeight = Math.max(
        body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight
      );
      body.style.setProperty('--bq-menu-scroll-shift', (-savedScrollY) + 'px');
      body.style.height = documentHeight + 'px';
      body.style.overflow = 'hidden';
    }

    function restoreStage() {
      body.style.overflow = savedBodyOverflow;
      body.style.height = savedBodyHeight;
      body.style.removeProperty('--bq-menu-scroll-shift');
      if (restoreScroll) window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
    }

    function focusDestination() {
      var room = document.getElementById(body.dataset.room || 'design');
      if (!room) return;
      var target = room.querySelector('.hero-title, .room-hero-title, h1, h2');
      if (!target) return;
      var previousTabindex = target.getAttribute('tabindex');
      target.setAttribute('tabindex', '-1');
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      target.addEventListener('blur', function tidyDestinationFocus() {
        if (previousTabindex === null) target.removeAttribute('tabindex');
        else target.setAttribute('tabindex', previousTabindex);
      }, { once: true });
    }

    function preserveClosingFrame() {
      if (!closing || finishing) return;
      /* Every write here re-fires the MutationObserver below, so each one must
         be guarded — an unconditional write loops the observer forever and
         hard-freezes the page. */
      if (!menu.classList.contains('is-open')) menu.classList.add('is-open');
      if (!menu.classList.contains('is-closing')) menu.classList.add('is-closing');
      if (!body.classList.contains('menu-open')) body.classList.add('menu-open');
      if (!body.classList.contains('menu-closing')) body.classList.add('menu-closing');
      if (body.style.overflow !== 'hidden') body.style.overflow = 'hidden';
    }

    function finishClose(token) {
      if (!closing || token !== transitionToken) return;
      finishing = true;
      closing = false;
      opened = false;
      window.clearTimeout(closeTimer);
      menu.classList.remove('is-ready', 'is-closing', 'is-open');
      syncControls(false, false);
      /* Let the black bed fade behind the now full-size page card, then remove
         the fixed stage. This avoids a dark flash on the final frame. */
      closeTimer = window.setTimeout(function () {
        if (token !== transitionToken) return;
        body.classList.remove('menu-revealed', 'menu-closing', 'menu-open');
        setBackgroundInert(false);
        restoreStage();
        if (restoreFocus && activeTrigger && document.contains(activeTrigger)) {
          try { activeTrigger.focus({ preventScroll: true }); } catch (e) { activeTrigger.focus(); }
        } else if (!restoreScroll) focusDestination();
        menu.setAttribute('aria-hidden', 'true');
        activeTrigger = null;
        window.setTimeout(function () { finishing = false; }, 0);
      }, isReduced() ? 0 : 180);
    }

    function closeMenu(shouldRestoreFocus) {
      if (!opened || closing) return;
      closing = true;
      restoreFocus = shouldRestoreFocus !== false;
      var token = ++transitionToken;
      menu.classList.add('is-closing');
      menu.classList.remove('is-ready');
      body.classList.add('menu-closing');
      body.classList.remove('menu-revealed');
      syncControls(false, false);
      closeTimer = window.setTimeout(function () {
        finishClose(token);
      }, isReduced() ? 40 : 900);
    }

    function revealMenu(token) {
      if (!opened || closing || token !== transitionToken) return;
      menu.classList.add('is-ready');
      body.classList.add('menu-revealed');
    }

    function openMenu(trigger, fromExistingState) {
      if (opened && !closing) return;
      window.clearTimeout(closeTimer);
      transitionToken += 1;
      closing = false;
      finishing = false;
      opened = true;
      restoreFocus = true;
      restoreScroll = true;
      activeTrigger = trigger || activeTrigger || document.activeElement;

      if (window.__bqExclusive) window.__bqExclusive('menu');
      syncCurrentRoom();
      prepareStage(!!fromExistingState);

      menu.classList.remove('is-closing');
      menu.classList.add('is-open');
      body.classList.remove('menu-closing');
      body.classList.add('menu-open');
      syncControls(true);
      setBackgroundInert(true);

      var token = transitionToken;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { revealMenu(token); });
      });
    }

    function toggleFromTrigger(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (opened && !closing) closeMenu(true);
      else openMenu(event.currentTarget, false);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', toggleFromTrigger, true);
    });

    closeButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    }, true);

    menu.addEventListener('click', function (event) {
      if (event.target !== menu) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    }, true);

    menu.querySelectorAll('.mm-link, .mm-touch, .mm-logo').forEach(function (link) {
      link.addEventListener('click', function () {
        restoreFocus = false;
        restoreScroll = false;
        closeMenu(false);
      }, true);
    });

    /* main.v416 still contains an obsolete bottom-sheet drag handler. Stop
       those listener calls without cancelling native scrolling or link taps. */
    var legacySheet = menu.querySelector('.mobile-sheet');
    if (legacySheet) {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (type) {
        legacySheet.addEventListener(type, function (event) {
          event.stopImmediatePropagation();
        }, { capture: true, passive: true });
      });
      legacySheet.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'touch') event.stopImmediatePropagation();
      }, true);
    }

    document.addEventListener('keydown', function (event) {
      if (!opened) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab' || closing) return;
      var focusables = visibleFocusables();
      if (!focusables.length) {
        event.preventDefault();
        closeButton.focus({ preventScroll: true });
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }, true);

    /* Legacy room/menu handlers may remove the open class immediately. During
       the exit animation, restore it before paint so the page-card can finish
       its return without a flash or scroll jump. */
    var stateObserver = new MutationObserver(function () {
      if (finishing) return;
      if (closing) {
        preserveClosingFrame();
        return;
      }
      if (!opened && menu.classList.contains('is-open')) openMenu(null, true);
      else if (opened && !menu.classList.contains('is-open')) {
        menu.classList.add('is-open');
        closeMenu(false);
      }
    });
    stateObserver.observe(menu, { attributes: true, attributeFilter: ['class'] });
    stateObserver.observe(body, { attributes: true, attributeFilter: ['class', 'style'] });

    window.__bqPanels = window.__bqPanels || {};
    window.__bqPanels.menu = function () { closeMenu(false); };
    window.__bqStageMenu = { open: openMenu, close: closeMenu };
    syncCurrentRoom();
    syncControls(false);
  }, { once: true });
}());
