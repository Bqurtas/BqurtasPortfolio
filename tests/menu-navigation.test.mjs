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
    addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) || []), callback]); },
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
    ...events(), id, dataset: {}, attrs: {},
    classList: {
      contains: value => classes.has(value),
      add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)),
      toggle(value, force) { if (force ?? !classes.has(value)) classes.add(value); else classes.delete(value); },
    },
    style: { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } },
    setAttribute(name, value) { this.attrs[name] = value; }, removeAttribute(name) { delete this.attrs[name]; },
    querySelector: () => null, querySelectorAll: () => [], focus() {},
  };
}
function fixture({ clampMenuScroll = true, menuTransition = {}, stageDuration = '1s' } = {}) {
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
  const ids = Object.fromEntries(['menuToggle', 'railMenu', 'mobileMenu', 'mobileMenuClose', 'bqPageStage', 'design', 'bio', 'blog', 'contact'].map(id => [id, element(id)]));
  const bioLink = element('bio-link'); bioLink.dataset.route = 'bio';
  ids.mobileMenu.querySelectorAll = () => [bioLink];
  const body = element('body'); body.dataset.room = 'design';
  const root = element('html'); root.scrollTop = 0;
  const location = { pathname: '/ku/design' };
  const window = {
    ...events(), scrollY: 5239, innerHeight: 760, setTimeout: schedule, clearTimeout: cancel,
    matchMedia: () => ({ matches: false }), __bqPlayRoomCurtain: () => true,
    scrollTo({ top }) { this.scrollY = top; this.fire('scroll'); },
  };
  const work = { getBoundingClientRect: () => ({ top: 1000 - window.scrollY }) };
  const afterWork = { getBoundingClientRect: () => ({ top: 8000 - window.scrollY }) };
  const document = {
    ...events(), body, documentElement: root, activeElement: ids.menuToggle,
    getElementById: id => ids[id], contains: () => true,
    querySelector: selector => ({ '.lux-transition': {}, '.section.work': work, '.service-showcase': afterWork })[selector] || null,
    querySelectorAll: () => [],
    dispatchEvent(event) { if (event.type === 'bq:menu-closed') closed.push(now); this.fire(event.type, event); },
  };
  const context = {
    getComputedStyle(element) {
      return element === ids.mobileMenu
        ? { transitionProperty: 'clip-path, opacity, visibility', transitionDuration: '1.15s, .6s, 0s',
          transitionDelay: '0s, 0s, 1.15s', ...menuTransition }
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

test('ordinary menu dismissal restores the reading position once and keeps close guards until completion', () => {
  const page = fixture();
  page.open();
  page.ids.mobileMenuClose.fire('click');
  page.advance(400);
  page.window.__bqPanels.menu();
  assert.equal(page.body.classList.contains('menu-closing'), true);
  assert.equal(page.window.scrollY, 0);
  page.advance(830);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.closed.length, 1);
  assert.equal(page.body.classList.contains('menu-open'), false);
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
