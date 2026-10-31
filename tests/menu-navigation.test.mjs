import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function section(from, to) {
  const start = main.indexOf(from), end = main.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `actual application section found: ${from}`);
  return main.slice(start, end);
}
function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback, options) {
      if (options?.once) {
        const original = callback;
        callback = (...args) => { this.removeEventListener(type, callback); original(...args); };
      }
      listeners.set(type, [...(listeners.get(type) || []), callback]);
    },
    removeEventListener(type, callback) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== callback)); },
    callbacks(type) { return [...(listeners.get(type) || [])]; },
    fire(type, values = {}) {
      const event = { type, target: this, currentTarget: this, button: 0, ...values,
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      for (const callback of listeners.get(type) || []) callback(event);
    },
  };
}
function element(id) {
  const classes = new Set();
  return {
    ...events(), id, dataset: {}, attrs: {}, children: [], inert: false,
    classList: {
      contains: value => classes.has(value),
      add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)),
      toggle(value, force) { if (force ?? !classes.has(value)) classes.add(value); else classes.delete(value); },
    },
    style: { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } },
    setAttribute(name, value) { this.attrs[name] = value; }, removeAttribute(name) { delete this.attrs[name]; },
    getAttribute(name) { return this.attrs[name] ?? null; },
    contains(item) { return item === this || this.children.some(child => child.contains(item)); },
    closest(selector) {
      if (selector === '[inert]' && this.inert) return this;
      return this.parent?.closest(selector) || null;
    },
    getClientRects: () => [{}], querySelector: () => null, querySelectorAll: () => [], focus() {},
  };
}
function fixture({ clampMenuScroll = true, menuTransition = {}, sheetTransition = {}, stageDuration = '1s', innerWidth = 390,
  innerHeight = 760, paperRects = null, viewport = null, deckGutter = '10px', deckRadius = '22px' } = {}) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), closed = [], historyChanges = [];
  const schedule = (callback, delay = 0) => { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; };
  const cancel = id => timers.delete(id);
  const advance = ms => {
    const end = now + ms;
    for (;;) {
      const pending = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!pending) break;
      const [id, timer] = pending; timers.delete(id); now = timer.at; timer.callback();
    }
    now = end;
  };
  const ids = Object.fromEntries(['menuToggle', 'railMenu', 'mobileMenu', 'mobileSheet', 'mobileMenuClose', 'bqPageStage', 'design', 'bio', 'blog', 'contact', 'main', 'footer', 'rail', 'mobilebar', 'dockChat', 'dockTheme', 'mobileChat', 'mobileTheme', 'bioHeading'].map(id => [id, element(id)]));
  const bioLink = element('bio-link'); bioLink.dataset.route = 'bio';
  ids.mobileMenu.children = [ids.mobileSheet];
  ids.mobileSheet.children = [ids.mobileMenuClose, bioLink];
  ids.mobileSheet.children.forEach(child => { child.parent = ids.mobileSheet; });
  ids.mobileMenu.children.forEach(child => { child.parent = ids.mobileMenu; });
  ids.mobileMenu.querySelector = selector => selector === '.mobile-sheet' ? ids.mobileSheet : null;
  ids.mobileMenu.querySelectorAll = selector => selector === '.mm-link, .mm-touch, .mm-logo' ? [bioLink] : [ids.mobileMenuClose, bioLink];
  ids.mobilebar.children = [ids.menuToggle, ids.mobileChat, ids.mobileTheme];
  ids.mobilebar.children.forEach(child => { child.parent = ids.mobilebar; });
  ids.mobilebar.querySelectorAll = () => ids.mobilebar.children;
  ids.rail.children = [ids.railMenu, ids.dockChat, ids.dockTheme];
  ids.rail.children.forEach(child => { child.parent = ids.rail; });
  ids.rail.querySelectorAll = () => ids.rail.children;
  ids.bqPageStage.children = [ids.main, ids.footer];
  ids.bqPageStage.children.forEach(child => { child.parent = ids.bqPageStage; });
  ids.bio.querySelector = selector => selector === '.room-hero-title, h1, h2' ? ids.bioHeading : null;
  const body = element('body'); body.dataset.room = 'design';
  const root = element('html'); root.scrollTop = 0;
  const location = { pathname: '/ku/design' };
  const window = {
    ...events(), scrollY: 5239, innerHeight, innerWidth, setTimeout: schedule, clearTimeout: cancel,
    matchMedia: () => ({ get matches() { return paperRects !== null && window.innerWidth <= 820; } }), __bqPlayRoomCurtain: () => true,
    scrollTo({ top }) { this.scrollY = top; this.fire('scroll'); },
  };
  if (viewport) window.visualViewport = { ...events(), ...viewport };
  const paperCards = (paperRects || []).map((rect, index) => {
    const card = element('paper-' + index);
    card.getBoundingClientRect = () => rect;
    card.closest = selector => selector === '.paper-scroll' ? card : null;
    return card;
  });
  const work = { getBoundingClientRect: () => ({ top: 1000 - window.scrollY }) };
  const afterWork = { getBoundingClientRect: () => ({ top: 8000 - window.scrollY }) };
  const document = {
    ...events(), body, documentElement: root, activeElement: ids.menuToggle,
    getElementById: id => ids[id], contains: () => true,
    querySelector: selector => ({ '.lux-transition': {}, '.section.work': work, '.service-showcase': afterWork })[selector] || null,
    querySelectorAll: selector => selector === '.rail' ? [ids.rail] : selector === '#bqPageStage .paper-scroll' ? paperCards : [],
    elementsFromPoint: () => paperCards.slice(-1),
    dispatchEvent(event) { if (event.type === 'bq:menu-closed') closed.push(now); this.fire(event.type, event); },
  };
  ids.rail.children.forEach(child => { child.getClientRects = () => window.innerWidth >= 1025 ? [{}] : []; });
  ids.mobilebar.children.forEach(child => { child.getClientRects = () => window.innerWidth < 1025 ? [{}] : []; });
  [...Object.values(ids), bioLink].forEach(item => { item.focus = () => { document.activeElement = item; }; });
  const context = {
    getComputedStyle(element) {
      if (element === root) return { getPropertyValue: name => ({ '--bq-deck-gutter': deckGutter, '--bq-deck-radius': deckRadius })[name] || '' };
      if (paperCards.includes(element)) return { borderTopLeftRadius: '22px', borderTopRightRadius: '22px', borderBottomLeftRadius: '22px', borderBottomRightRadius: '22px' };
      return element === ids.mobileMenu
        ? { transitionProperty: 'clip-path, opacity, visibility', transitionDuration: '1.15s, .6s, 0s',
          transitionDelay: '0s, 0s, 1.15s', ...menuTransition }
        : element === ids.mobileSheet
          ? { transitionProperty: 'transform', transitionDuration: '0s', transitionDelay: '0s', ...sheetTransition }
        : { transitionProperty: 'transform', transitionDuration: stageDuration, transitionDelay: '0s' };
    },
    window, document, location, rooms: ['design', 'bio', 'blog', 'contact'].map(id => ids[id]), routeLinks: [bioLink],
    routerReady: true, currentLang: 'ku', currentFilter: 'all', isCompact: () => true,
    setRoomChrome() {}, triggerReveals() {}, setDocTitle() {},
    syncURL() { location.pathname = '/ku/' + body.dataset.room; },
    history: { replaceState(_state, _title, path) { location.pathname = path; historyChanges.push(path); } },
    requestAnimationFrame: callback => schedule(callback, 16), cancelAnimationFrame: cancel,
    setTimeout: schedule, clearTimeout: cancel,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  };
  vm.runInNewContext(section('  const showRoom = ', '\n  /* The skip link'), context);
  vm.runInNewContext(section('  let roomTransitionTimer = ', '\n  /* Scroll-spy'), context);
  vm.runInNewContext(section('  let __urlResetT;', '\n  routeLinks.forEach(a => {'), context);
  vm.runInNewContext(section('  routeLinks.forEach(a => {', '\n  // Browser back/forward'), context);
  vm.runInNewContext(section('  /* ---------- MOBILE MENU', '\n  window.__bqGoDocumentTop = '), context);
  return {
    window, document, ids, bioLink, body, location, closed, historyChanges, advance,
    open() {
      ids.menuToggle.fire('click');
      advance(16);
      if (clampMenuScroll) window.scrollY = 0;
      window.fire('scroll');
    },
  };
}

test('opening over a short footer uses the full rounded viewport frame instead of its partial rectangle', () => {
  const page = fixture({ clampMenuScroll: false, innerHeight: 844,
    paperRects: [{ left: 0, top: 330, right: 390, bottom: 844 }] });
  page.open();
  const shape = page.document.documentElement.style;
  assert.equal(shape['--bq-menu-shape-top'], '10px');
  assert.equal(shape['--bq-menu-shape-left'], '10px');
  assert.equal(shape['--bq-menu-shape-width'], '370px');
  assert.equal(shape['--bq-menu-shape-height'], '824px');
  assert.equal(shape['--bq-menu-shape-radius'], '22px');
  assert.equal(page.window.scrollY, 5239, 'fitting the curtain must not scroll the footer away');
});

test('menu viewport changes preserve four corners and inset after browser chrome expands or the page is zoomed', () => {
  const page = fixture({ paperRects: [{ left: 10, top: -50, right: 380, bottom: 760 }],
    viewport: { width: 390, height: 700, offsetTop: 0, offsetLeft: 0 } });
  page.open();
  const shape = page.document.documentElement.style;
  assert.equal(shape['--bq-menu-shape-height'], '680px');
  Object.assign(page.window.visualViewport, { width: 320, height: 480, offsetTop: 48, offsetLeft: 20 });
  page.window.visualViewport.fire('resize');
  assert.equal(shape['--bq-menu-shape-top'], '58px');
  assert.equal(shape['--bq-menu-shape-left'], '30px');
  assert.equal(shape['--bq-menu-shape-width'], '300px');
  assert.equal(shape['--bq-menu-shape-height'], '460px');
  assert.equal(shape['--bq-menu-shape-radius'], '22px');
  page.ids.mobileMenuClose.fire('click');
  page.advance(1230);
  assert.equal(shape['--bq-menu-shape-height'], undefined, 'closed menus release measured dimensions');
  assert.equal(page.window.visualViewport.callbacks('resize').length, 0);
});

test('a clipped transition or missing paper cannot shrink the menu and desktop retains its side-preview layout', () => {
  const page = fixture({ paperRects: [], deckGutter: '4px', deckRadius: '14px', innerHeight: 360 });
  page.open();
  const shape = page.document.documentElement.style;
  assert.equal(shape['--bq-menu-shape-height'], '352px');
  assert.equal(shape['--bq-menu-shape-radius'], '14px');
  page.window.innerWidth = 1280;
  page.window.fire('resize');
  assert.equal(shape['--bq-menu-shape-top'], undefined);
  assert.equal(shape['--bq-menu-shape-width'], undefined);
});

test('ordinary menu dismissal restores the reading position once and keeps close guards until completion', () => {
  const page = fixture();
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(400);
  page.window.__bqPanels.menu();
  assert.equal(page.body.classList.contains('menu-closing'), true);
  assert.equal(page.body.style.overflow, 'hidden', 'the mobile viewport must stay locked until the slide has finished');
  assert.equal(page.window.scrollY, 0);
  page.advance(830);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.closed.length, 1);
  assert.equal(page.body.classList.contains('menu-open'), false);
  assert.equal(page.body.style.overflow, '', 'the document unlocks after the return slide');
});

test('the desktop preview keeps the visible document slice through closing and refreshes it on the next opening', () => {
  const page = fixture({ clampMenuScroll: false });
  page.open();
  assert.equal(page.window.scrollY, 5239, 'opening must leave the native reading position unchanged');
  assert.equal(page.body.style['--bq-menu-scroll-y'], '5239px');
  page.ids.mobileMenuClose.fire('click');
  page.advance(1230);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.body.style['--bq-menu-scroll-y'], '5239px', 'the scale return must retain the same viewport-centered pivot after menu classes clear');
  page.window.scrollTo({ top: 1800 });
  page.open();
  assert.equal(page.body.style['--bq-menu-scroll-y'], '1800px', 'a later opening must use the current reading position');
});

test('a room selected beneath the curtain starts at its hero instead of restoring the old gallery offset', () => {
  const page = fixture();
  page.open();
  page.bioLink.fire('click');
  page.advance(680);
  assert.equal(page.body.dataset.room, 'bio');
  assert.equal(page.location.pathname, '/ku/bio');
  assert.equal(page.window.scrollY, 0);
  assert.equal(page.body.style['--bq-menu-scroll-y'], '0px', 'the new room must scale around its hero instead of the old gallery offset');
  assert.equal(page.body.classList.contains('menu-closing'), true, 'the room swap must not end the menu animation early');
  page.advance(550);
  assert.equal(page.window.scrollY, 0);
  assert.equal(page.closed.length, 1);
  assert.equal(page.ids.mobileMenu.classList.contains('is-closing'), false);
});

test('reopening during dismissal cancels the old close timer and keeps the original reading position', () => {
  const page = fixture();
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(400);
  page.ids.menuToggle.fire('click');
  page.advance(500);
  assert.equal(page.ids.mobileMenu.classList.contains('is-open'), true);
  assert.equal(page.body.style.overflow, 'hidden');
  assert.equal(page.closed.length, 0, 'a stale close timer must not unlock a reopened menu');
  assert.equal(page.window.scrollY, 0);
  assert.equal(page.body.style['--bq-menu-scroll-y'], '5239px', 'reopening must retain the saved slice even if a browser lost its native offset');
  page.ids.mobileMenuClose.fire('click');
  page.advance(1230);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.closed.length, 1);
});

test('modified menu links keep native navigation without closing the current menu', () => {
  const page = fixture();
  page.open();
  page.bioLink.fire('click', { ctrlKey: true });
  page.advance(1000);
  assert.equal(page.body.dataset.room, 'design');
  assert.equal(page.ids.mobileMenu.classList.contains('is-open'), true);
  assert.equal(page.closed.length, 0);
});

test('scrollspy ignores the menu lock and queued pre-menu callbacks, then resumes after dismissal', () => {
  const page = fixture();
  page.window.fire('scroll'); // queue a URL update before opening the menu
  page.open();
  page.advance(200);
  assert.equal(page.location.pathname, '/ku/design');
  assert.deepEqual(page.historyChanges, []);
  page.ids.mobileMenuClose.fire('click');
  page.window.fire('scroll');
  page.advance(1230);
  assert.equal(page.location.pathname, '/ku/design');
  page.window.scrollTo({ top: 9000 });
  page.advance(180);
  assert.equal(page.location.pathname, '/ku');
});


test('the desktop close guard waits for its longest transition and ignores child and shorter transition events', () => {
  const page = fixture();
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(600);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'opacity' });
  page.ids.mobileMenu.fire('transitionend', { target: page.bioLink, propertyName: 'clip-path' });
  page.advance(400);
  page.ids.bqPageStage.fire('transitionend', { propertyName: 'transform' });
  assert.equal(page.closed.length, 0, 'the curtain is still wiping after child and page transitions finish');
  page.advance(150);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'clip-path' });
  assert.equal(page.body.classList.contains('menu-closing'), false);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.closed.length, 1);
  assert.equal(page.ids.mobileMenu.callbacks('transitionend').length, 0, 'completion removes its listener');
  page.advance(1000);
  assert.equal(page.closed.length, 1, 'the fallback cannot dispatch a second close');
});

test('the phone unlocks when its side slide ends, without a fixed desktop-length wait', () => {
  const page = fixture({ stageDuration: '0s', menuTransition: {
    transitionProperty: 'transform, opacity, visibility', transitionDuration: '600ms, .5s, 0s',
    transitionDelay: '0s, 0s, .6s',
  } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(500);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'opacity' });
  assert.equal(page.closed.length, 0);
  page.advance(100);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'transform' });
  assert.equal(page.closed.length, 1);
  assert.equal(page.body.classList.contains('menu-closing'), false);
  assert.equal(page.window.scrollY, 5239);
});

test('a longer page return keeps geometry guards until the page itself finishes', () => {
  const page = fixture({ menuTransition: { transitionDuration: '.95s, .5s, 0s' } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(950);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'clip-path' });
  assert.equal(page.closed.length, 0);
  page.advance(50);
  page.ids.bqPageStage.fire('transitionend', { propertyName: 'transform' });
  assert.equal(page.closed.length, 1);
});

test('a stationary phone frame stays guarded until its inner sheet finishes sliding out', () => {
  const page = fixture({ stageDuration: '0s', menuTransition: { transitionDuration: '0s' },
    sheetTransition: { transitionDuration: '640ms' } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  assert.equal(page.ids.mobileSheet.callbacks('transitionend').length, 1);
  page.advance(400);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'opacity' });
  page.ids.mobileSheet.fire('transitionend', { target: page.bioLink, propertyName: 'transform' });
  assert.equal(page.closed.length, 0, 'the frame and descendants cannot end the sheet slide');
  assert.equal(page.ids.main.inert, true);
  page.advance(240);
  page.ids.mobileSheet.fire('transitionend', { propertyName: 'transform' });
  assert.equal(page.closed.length, 1);
  assert.equal(page.ids.mobileMenu.classList.contains('is-closing'), false);
  assert.equal(page.ids.main.inert, false);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.ids.mobileSheet.callbacks('transitionend').length, 0);
  page.advance(1000);
  assert.equal(page.closed.length, 1);
});

test('reopening a sliding inner sheet invalidates its old transition completion', () => {
  const page = fixture({ stageDuration: '0s', menuTransition: { transitionDuration: '0s' },
    sheetTransition: { transitionDuration: '640ms' } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  const oldCompletion = page.ids.mobileSheet.callbacks('transitionend')[0];
  page.advance(200);
  page.ids.menuToggle.fire('click');
  page.advance(16);
  assert.equal(page.ids.mobileSheet.callbacks('transitionend').length, 0);
  oldCompletion({ target: page.ids.mobileSheet, propertyName: 'transform' });
  page.advance(1000);
  assert.equal(page.closed.length, 0);
  assert.equal(page.ids.mobileMenu.classList.contains('is-open'), true);
  assert.equal(page.ids.main.inert, true);
  page.ids.mobileMenuClose.fire('click');
  page.advance(720);
  assert.equal(page.closed.length, 1, 'the new slide still has a bounded no-event fallback');
});

test('reopening removes the pending transition listener and invalidates an already queued old completion', () => {
  const page = fixture();
  page.open();
  page.ids.mobileMenuClose.fire('click');
  const oldCompletion = page.ids.mobileMenu.callbacks('transitionend')[0];
  page.advance(300);
  page.ids.menuToggle.fire('click');
  assert.equal(page.ids.mobileMenu.callbacks('transitionend').length, 0);
  page.advance(16);
  page.ids.mobileMenuClose.fire('click');
  oldCompletion({ target: page.ids.mobileMenu, propertyName: 'clip-path' });
  assert.equal(page.closed.length, 0, 'an old event cannot release a later close cycle');
  assert.equal(page.body.classList.contains('menu-closing'), true);
  page.advance(1150);
  page.ids.mobileMenu.fire('transitionend', { propertyName: 'clip-path' });
  assert.equal(page.closed.length, 1);
});

test('missing transition events use the actual duration and repeated delay list as a bounded fallback', () => {
  const page = fixture({ stageDuration: '0s', menuTransition: {
    transitionDuration: '300ms, .15s, 0s', transitionDelay: '.1s',
  } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(479);
  assert.equal(page.closed.length, 0);
  page.advance(1);
  assert.equal(page.closed.length, 1);
});

test('a menu with no motion still releases its guards when no transitionend can fire', () => {
  const page = fixture({ stageDuration: '0s', menuTransition: { transitionDuration: '0s' } });
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(80);
  assert.equal(page.closed.length, 1);
  assert.equal(page.body.classList.contains('menu-closing'), false);
});

test('desktop menu leaves its rail available while only the visible page content is inert', () => {
  const page = fixture({ innerWidth:1280 });
  page.ids.footer.inert = true;
  page.open();
  assert.equal(page.ids.mobileMenu.attrs['aria-modal'], 'false', 'the dialog cannot hide its sibling toolbar from assistive technology');
  assert.equal(page.ids.bqPageStage.attrs['aria-hidden'], 'true');
  assert.equal(page.ids.main.inert, true);
  assert.equal(page.ids.footer.inert, true);
  assert.equal(page.ids.bqPageStage.inert, false, 'the preview surface still dismisses the menu');
  assert.equal(page.ids.mobilebar.inert, false);
  assert.equal(page.ids.rail.inert, false);
  page.ids.mobileMenuClose.fire('click');
  assert.equal(page.ids.main.inert, true, 'page content stays unavailable during its return transition');
  page.advance(1230);
  assert.equal(page.ids.main.inert, false);
  assert.equal(page.ids.footer.inert, true, 'pre-existing inert state must not be erased');
  assert.equal(page.ids.bqPageStage.getAttribute('aria-hidden'), null);
});

test('desktop Tab includes its rail controls, skips the hidden mobile bar and wraps around the interaction area', () => {
  const page = fixture({ innerWidth:1280 });
  page.open();
  page.ids.dockTheme.focus();
  page.document.fire('keydown', { key:'Tab' });
  assert.equal(page.document.activeElement, page.ids.mobileMenuClose);
  page.document.fire('keydown', { key:'Tab', shiftKey:true });
  assert.equal(page.document.activeElement, page.ids.dockTheme);
  page.ids.dockChat.focus();
  page.document.fire('keydown', { key:'Tab' });
  assert.equal(page.document.activeElement, page.ids.dockTheme, 'the complete cycle stays inside the menu and its toolbar');
  page.bioLink.focus();
  page.document.fire('keydown', { key:'Tab' });
  assert.equal(page.document.activeElement, page.ids.railMenu, 'the final menu link continues into the visible desktop rail');
});

test('phone and tablet menus exclude the covered dock from keyboard navigation', () => {
  for (const innerWidth of [390, 1024]) {
    const page = fixture({ innerWidth });
    page.open();
    assert.equal(page.ids.mobileMenu.attrs['aria-modal'], 'true');
    page.bioLink.focus();
    page.document.fire('keydown', { key:'Tab' });
    assert.equal(page.document.activeElement, page.ids.mobileMenuClose);
    page.document.fire('keydown', { key:'Tab', shiftKey:true });
    assert.equal(page.document.activeElement, page.bioLink);
  }
});

test('resizing an open desktop menu to a phone releases focus from its hidden rail', () => {
  const page = fixture({ innerWidth:1280 });
  page.open();
  page.ids.dockTheme.focus();
  page.window.innerWidth = 390;
  page.window.fire('resize');
  assert.equal(page.ids.mobileMenu.attrs['aria-modal'], 'true');
  assert.equal(page.document.activeElement, page.ids.mobileMenuClose);
  page.window.innerWidth = 1280;
  page.window.fire('resize');
  assert.equal(page.ids.mobileMenu.attrs['aria-modal'], 'false');
});

test('closing for another dock panel preserves that dock control’s focus', () => {
  const page = fixture({ innerWidth:1280 });
  page.open();
  page.ids.dockChat.focus();
  page.window.__bqPanels.menu();
  assert.equal(page.document.activeElement, page.ids.dockChat);
  page.advance(1230);
  assert.equal(page.document.activeElement, page.ids.dockChat);
});

test('ordinary menu close restores the trigger and reopening retains the original background accessibility state', () => {
  const page = fixture();
  page.ids.bqPageStage.setAttribute('aria-hidden', 'false');
  page.open();
  assert.equal(page.document.activeElement, page.ids.mobileMenuClose);
  page.ids.mobileMenuClose.fire('click');
  assert.equal(page.document.activeElement, page.ids.menuToggle);
  page.advance(300);
  page.ids.menuToggle.fire('click');
  page.advance(16);
  assert.equal(page.ids.main.inert, true);
  page.ids.mobileMenuClose.fire('click');
  page.advance(1230);
  assert.equal(page.ids.main.inert, false);
  assert.equal(page.ids.bqPageStage.getAttribute('aria-hidden'), 'false');
});

test('a new room receives focus only after its menu return has actually finished', () => {
  const page = fixture();
  page.open();
  page.bioLink.focus();
  page.bioLink.fire('click');
  page.advance(1000);
  assert.equal(page.body.dataset.room, 'bio');
  assert.equal(page.ids.main.inert, true);
  assert.notEqual(page.document.activeElement, page.ids.bioHeading);
  page.advance(230);
  assert.equal(page.ids.main.inert, false);
  assert.equal(page.document.activeElement, page.ids.bioHeading);
});
