import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const enhance = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const progressStart = enhance.indexOf('  (function scrollProgress() {');
const progressEnd = enhance.indexOf('  /* =======================================================\n     3', progressStart);
assert.ok(progressStart >= 0 && progressEnd > progressStart);
const progressSource = enhance.slice(progressStart, progressEnd);

function progressFixture({ delegated = true, visibleRail = false } = {}) {
  const events = () => {
    const listeners = new Map();
    return {
      addEventListener(type, callback) { const list = listeners.get(type) || []; list.push(callback); listeners.set(type, list); },
      fire(type, event = {}) { for (const callback of listeners.get(type) || []) callback(event); }
    };
  };
  const frames = new Map();
  let frameId = 0, coreFrame = 0, corePaints = 0, layoutReads = 0, rootWrites = 0, topWrites = 0;
  let extent = 1800;
  const raf = callback => { frames.set(++frameId, callback); return frameId; };
  const ring = { style: { strokeDashoffset: 'core-ring' } };
  const rail = { style: {}, getClientRects: () => visibleRail ? [{}] : [] };
  const toTop = { ...events(), classList: { toggle() { topWrites++; } } };
  const root = {
    scrollTop: 0,
    style: { setProperty() { rootWrites++; } },
    get scrollHeight() { layoutReads++; return extent; },
    get clientHeight() { layoutReads++; return 800; }
  };
  const document = { ...events(), documentElement: root, scrollingElement: root, body: {}, hidden: false };
  const window = {
    ...events(), scrollY: 0, innerHeight: 800, visualViewport: events(),
    __bqDeckRing: delegated, __bqTopClickBound: true,
    __bqCoreGoUpUpdate() {
      if (!coreFrame) coreFrame = raf(() => { coreFrame = 0; corePaints++; });
    },
    matchMedia: () => ({ matches: true }), scrollTo() {}
  };
  vm.runInNewContext(progressSource, {
    window, document, history: {}, performance: { now: () => 0 },
    $: selector => ({ '#railProgress': rail, '#toTop': toTop, '#toTopProg': ring })[selector],
    requestAnimationFrame: raf, cancelAnimationFrame: id => frames.delete(id),
    setTimeout: () => 1, clearTimeout() {},
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }
  });
  return {
    window, document, ring, rail, frames,
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(5000)); },
    setExtent(value) { extent = value; },
    get corePaints() { return corePaints; },
    get layoutReads() { return layoutReads; },
    get rootWrites() { return rootWrites; },
    get topWrites() { return topWrites; }
  };
}

test('delegated progress avoids legacy layout reads, button writes and interaction sampling', () => {
  const page = progressFixture();
  page.flush();
  const firstPaints = page.corePaints;
  for (let index = 1; index <= 40; index++) {
    page.window.scrollY = index * 20;
    for (const event of ['scroll', 'touchmove', 'touchstart', 'pointerdown', 'wheel']) page.window.fire(event);
  }
  assert.equal(page.frames.size, 1, 'only the core queued paint should remain');
  assert.equal(page.layoutReads, 0);
  assert.equal(page.topWrites, 0);
  assert.equal(page.ring.style.strokeDashoffset, 'core-ring');
  page.flush();
  assert.equal(page.corePaints, firstPaints + 1);
  assert.equal(page.frames.size, 0, 'the legacy sampler must not keep another frame alive');
});

test('visible rail progress remains correct without layout reads during scrolling', () => {
  const page = progressFixture({ visibleRail: true });
  page.flush();
  const initialReads = page.layoutReads;
  page.window.scrollY = 250;
  for (let index = 0; index < 20; index++) page.window.fire('scroll');
  page.flush();
  assert.equal(page.rail.style.height, '25%');
  assert.equal(page.layoutReads, initialReads);
  assert.equal(page.topWrites, 0, 'a visible legacy rail must not retake the core button');
  page.setExtent(2800);
  page.window.fire('resize');
  page.flush();
  assert.equal(page.rail.style.height, '12.5%');
});

test('viewport position changes do not rewrite an unchanged app height', () => {
  const page = progressFixture();
  assert.equal(page.rootWrites, 1);
  for (let index = 0; index < 30; index++) {
    page.window.visualViewport.fire('scroll');
    page.window.visualViewport.fire('resize');
  }
  assert.equal(page.rootWrites, 1);
  page.window.innerHeight = 760;
  page.window.visualViewport.fire('resize');
  assert.equal(page.rootWrites, 2);
});

test('legacy progress still paints when the core module is unavailable', () => {
  const page = progressFixture({ delegated: false });
  page.flush();
  const initialReads = page.layoutReads;
  page.window.scrollY = 500;
  page.window.fire('scroll');
  page.flush();
  assert.ok(Math.abs(page.ring.style.strokeDashoffset - Math.PI * 20) < 0.001);
  assert.ok(page.topWrites > 0);
  assert.equal(page.layoutReads, initialReads);
});

test('lux ignores portfolio mutations while preserving colour reveals for other cards', async () => {
  const lux = await readFile(new URL('../preview_site/js/lux.js', import.meta.url), 'utf8');
  const start = lux.indexOf('  /* The portfolio explicitly paints');
  const end = lux.indexOf('  /* ---- reveal-on-scroll', start);
  const cards = [], observed = [], timers = new Map();
  let mutationCallback, timerId = 0;
  const card = inGrid => {
    const element = {
      nodeType: 1, inGrid, dataset: {}, classes: new Set(),
      classList: { add(value) { element.classes.add(value); } },
      closest: () => inGrid ? {} : null,
      matches: selector => !element.dataset.lux && (!inGrid || !selector.includes(':not(#grid .card)')),
      querySelector: () => null
    };
    cards.push(element);
    return element;
  };
  const portfolio = card(true), other = card(false);
  vm.runInNewContext(lux.slice(start, end), {
    reduce: false,
    document: { body: {}, querySelectorAll: selector => cards.filter(element => element.matches(selector)) },
    IntersectionObserver: class { observe(element) { observed.push(element); } },
    MutationObserver: class { constructor(callback) { mutationCallback = callback; } observe() {} },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  const flush = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); };
  flush();
  assert.deepEqual(observed, [other]);
  assert.equal(portfolio.classes.size, 0);
  mutationCallback([{ target: portfolio, addedNodes: [card(true)] }]);
  assert.equal(timers.size, 0, 'masonry changes must not schedule a document scan');
  const incoming = card(false);
  mutationCallback([{ target: { closest: () => null }, addedNodes: [incoming] }]);
  flush();
  assert.deepEqual(observed, [other, incoming]);
});
