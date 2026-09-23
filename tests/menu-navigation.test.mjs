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
function fixture() {
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
    open() { ids.menuToggle.fire('click'); advance(16); window.scrollY = 0; window.fire('scroll'); },
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
  page.advance(440);
  assert.equal(page.window.scrollY, 5239);
  assert.equal(page.closed.length, 1);
  assert.equal(page.body.classList.contains('menu-open'), false);
});

test('a room selected beneath the curtain starts at its hero instead of restoring the old gallery offset', () => {
  const page = fixture();
  page.open();
  page.bioLink.fire('click');
  page.advance(680);
  assert.equal(page.body.dataset.room, 'bio');
  assert.equal(page.location.pathname, '/ku/bio');
  assert.equal(page.window.scrollY, 0);
  assert.equal(page.body.classList.contains('menu-closing'), true, 'the room swap must not end the menu animation early');
  page.advance(160);
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
  page.ids.mobileMenuClose.fire('click');
  page.advance(840);
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
  page.advance(840);
  assert.equal(page.location.pathname, '/ku/design');
  page.window.scrollTo({ top: 9000 });
  page.advance(180);
  assert.equal(page.location.pathname, '/ku');
});
