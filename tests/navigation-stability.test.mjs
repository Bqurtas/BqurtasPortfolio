import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function source(name, indent = '') {
  const start = main.indexOf(`(function ${name}() {`);
  const end = main.indexOf(`\n${indent}})();`, start);
  assert.ok(start >= 0 && end > start);
  return main.slice(start, end + indent.length + 7);
}
function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) || []), callback]); },
    fire(type) { for (const callback of listeners.get(type) || []) callback(); }
  };
}
function classes() {
  const names = new Set();
  return {
    contains: name => names.has(name),
    remove: name => names.delete(name),
    toggle(name, on) { if (on) names.add(name); else names.delete(name); }
  };
}
function fixture(mobile = true) {
  const queue = new Map();
  let id = 0;
  const media = { ...events(), matches: mobile };
  const body = { classList: classes(), dataset: {} };
  const root = { scrollHeight: 3000, clientHeight: 800, style: { setProperty(name, value) { this[name] = value; } } };
  const button = { ...events(), classList: classes() };
  const cookie = { getBoundingClientRect: () => ({ height: 178 }) };
  const ring = { style: {} };
  const document = { ...events(), body, documentElement: root, scrollingElement: root, hidden: false,
    getElementById: id => ({ toTop: button, toTopProg: ring, cookieCard: cookie })[id] };
  const window = { ...events(), scrollY: 0, innerHeight: 800, matchMedia: () => media, __bqTopClickBound: true };
  const observed = [];
  const context = { document, window, requestAnimationFrame: callback => { queue.set(++id, callback); return id; },
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe(element) { observed.push({ element, callback: this.callback }); } } };
  const flush = () => { const pending = [...queue.values()]; queue.clear(); pending.forEach(callback => callback()); };
  return { ...context, media, root, body, button, observed, queue, flush,
    run(name, indent) { vm.runInNewContext(source(name, indent), context); },
    scroll(y) { window.scrollY = y; window.fire('scroll'); flush(); } };
}

test('phone dock remains full size throughout a swipe, reversal and bottom rubber band', () => {
  const page = fixture();
  page.run('dockScrollState', '  ');
  for (const y of [0, 100, 700, 1200, 2200, 2250, 2195, 2210, 2150, 300, -60, 0]) {
    page.scroll(y);
    assert.equal(page.body.classList.contains('nav-compact'), false);
    assert.equal(page.queue.size, 0);
  }
  page.window.innerHeight = 720;
  page.window.fire('resize');
  assert.equal(page.body.classList.contains('nav-compact'), false);
});

test('desktop intent ignores small reversals and overscroll; changing to mobile clears compaction', () => {
  const page = fixture(false);
  page.run('dockScrollState', '  ');
  page.scroll(100);
  assert.equal(page.body.classList.contains('nav-compact'), true);
  for (const y of [96, 100, 97, 101]) page.scroll(y);
  assert.equal(page.body.classList.contains('nav-compact'), true);
  page.scroll(60);
  assert.equal(page.body.classList.contains('nav-compact'), false);
  page.scroll(2200);
  for (const y of [2250, 2300, 2200]) page.scroll(y);
  assert.equal(page.body.classList.contains('nav-compact'), true, 'rubber band is not upward intent');
  page.media.matches = true;
  page.media.fire('change');
  assert.equal(page.body.classList.contains('nav-compact'), false);
});

test('go-up stays available across threshold corrections and refreshes after menu/foreground restoration', () => {
  const page = fixture();
  page.run('globalGoUp');
  page.scroll(220);
  for (const y of [159, 170, 120, 50]) {
    page.scroll(y);
    assert.equal(page.button.classList.contains('is-shown'), true);
  }
  page.scroll(0);
  assert.equal(page.button.classList.contains('is-shown'), false);
  page.window.scrollY = 600;
  page.document.fire('bq:menu-closed');
  page.flush();
  assert.equal(page.button.classList.contains('is-shown'), true);
  page.window.scrollY = 0;
  page.document.fire('visibilitychange');
  page.flush();
  assert.equal(page.button.classList.contains('is-shown'), false);
  page.observed[0].callback();
  assert.equal(page.root.style['--bq-cookie-height'], '178px', 'cookie clearance uses its rendered height');
});
