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

for (const mobile of [true, false]) {
  test(`${mobile ? 'phone' : 'desktop'} dock follows sustained direction without reacting to tiny reversals or rubber band`, () => {
    const page = fixture(mobile);
    page.run('dockScrollState', '  ');
    page.scroll(100);
    assert.equal(page.body.classList.contains('nav-compact'), true, 'downward scroll makes the dock compact');
    for (const y of [96, 100, 97, 101]) page.scroll(y);
    assert.equal(page.body.classList.contains('nav-compact'), true, 'tiny reversals do not expand the dock');
    page.scroll(60);
    assert.equal(page.body.classList.contains('nav-compact'), false, 'deliberate upward scroll expands the dock');
    page.scroll(2200);
    for (const y of [2250, 2300, 2220, 2200]) page.scroll(y);
    assert.equal(page.body.classList.contains('nav-compact'), true, 'bottom rubber band is not upward intent');
    page.scroll(2160);
    assert.equal(page.body.classList.contains('nav-compact'), false, 'upward scroll away from the bottom still works');
    page.scroll(2200);
    page.window.innerHeight = 720;
    page.root.clientHeight = 720;
    page.window.fire('resize');
    page.flush();
    assert.equal(page.body.classList.contains('nav-compact'), true, 'a viewport resize preserves the current dock state');
    page.scroll(-60);
    for (const y of [-20, -45, 0, 10, 0]) page.scroll(y);
    assert.equal(page.body.classList.contains('nav-compact'), false, 'the top of the document keeps the dock expanded');
  });
}

test('menu opening, closing and restored scroll do not reverse the dock state', () => {
  const page = fixture();
  page.run('dockScrollState', '  ');
  page.scroll(200);
  assert.equal(page.body.classList.contains('nav-compact'), true);
  page.body.classList.toggle('menu-open', true);
  page.scroll(0);
  page.scroll(55);
  assert.equal(page.body.classList.contains('nav-compact'), true, 'menu scroll lock cannot expand a compact dock');
  page.body.classList.remove('menu-open');
  page.body.classList.toggle('menu-closing', true);
  page.scroll(199);
  page.scroll(40);
  assert.equal(page.body.classList.contains('nav-compact'), true, 'closing transition cannot change the dock size');
  page.scroll(200);
  page.body.classList.remove('menu-closing');
  page.document.fire('bq:menu-closed');
  page.flush();
  for (const y of [196, 199, 195]) page.scroll(y);
  assert.equal(page.body.classList.contains('nav-compact'), true, 'restored document position starts a fresh direction measurement');
  page.scroll(160);
  assert.equal(page.body.classList.contains('nav-compact'), false, 'real upward scrolling works after the menu closes');
});

test('continuous toolbar resizing does not erase upward dock expansion intent', () => {
  const page = fixture();
  page.run('dockScrollState', '  ');
  page.scroll(200);
  assert.equal(page.body.classList.contains('nav-compact'), true);
  for (let step = 1; step <= 12; step += 1) {
    page.window.innerHeight = 800 - step * 8;
    page.root.clientHeight = page.window.innerHeight;
    page.window.fire('resize');
    page.observed[0].callback();
    page.scroll(200 - step * 8);
    if (step >= 3) assert.equal(page.body.classList.contains('nav-compact'), false,
      '24px of sustained upward travel expands even during toolbar movement');
  }
  for (let step = 1; step <= 12; step += 1) {
    page.window.innerHeight = 704 + step * 8;
    page.root.clientHeight = page.window.innerHeight;
    page.scroll(104 + step * 8);
    page.window.fire('resize');
    page.observed[0].callback();
    if (step >= 3) assert.equal(page.body.classList.contains('nav-compact'), true,
      'downward intent also survives resize events in the opposite order');
  }
});

test('loading more portfolio content updates the dock scroll bounds without changing its state', () => {
  const page = fixture();
  page.run('dockScrollState', '  ');
  page.scroll(2200);
  assert.equal(page.body.classList.contains('nav-compact'), true);
  page.root.scrollHeight = 6000;
  const contentResize = page.observed.find(({ element }) => element === page.body || element === page.root);
  assert.ok(contentResize, 'document growth must invalidate cached scroll bounds');
  contentResize.callback();
  page.flush();
  assert.equal(page.body.classList.contains('nav-compact'), true, 'appending content does not expand the dock');
  page.scroll(4800);
  page.scroll(4760);
  assert.equal(page.body.classList.contains('nav-compact'), false, 'upward intent works past the previous document end');
  page.scroll(5200);
  for (const y of [5270, 5250, 5200]) page.scroll(y);
  assert.equal(page.body.classList.contains('nav-compact'), true, 'the new document end also ignores rubber band');
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
