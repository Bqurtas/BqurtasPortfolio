import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { PAGE_GUARD_JS } from '../functions/_page-guard.js';

/* archive.js opens with the shared page guard (tests/page-guard.test.mjs);
   these fixtures exercise only the motion that follows it. */
const file = await readFile(new URL('../preview_site/js/archive.js', import.meta.url), 'utf8');
assert.ok(file.includes(PAGE_GUARD_JS));
const source = file.replace(PAGE_GUARD_JS, '');

function eventTarget() {
  const handlers = new Map();
  return {
    handlers,
    addEventListener(type, callback) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(callback);
    },
    removeEventListener(type, callback) { handlers.get(type)?.delete(callback); },
    fire(type, event = {}) {
      for (const callback of [...(handlers.get(type) || [])]) callback(event);
    },
  };
}

function classList(...initial) {
  const names = new Set(initial);
  return {
    writes: 0,
    contains: name => names.has(name),
    add(...values) { this.writes++; values.forEach(value => names.add(value)); },
    remove(...values) { this.writes++; values.forEach(value => names.delete(value)); },
    toggle(name, on = !names.has(name)) { this.writes++; if (on) names.add(name); else names.delete(name); },
  };
}

function element(name, top, height = 300) {
  const attributes = new Map(), styles = new Map();
  const item = {
    name, classList: classList(name), top, height, reads: 0,
    dataset: {},
    style: {
      setProperty: (key, value) => styles.set(key, value),
      removeProperty: key => styles.delete(key),
    },
    getBoundingClientRect() { this.reads++; return { top: this.top, bottom: this.top + this.height, height: this.height }; },
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
    closest(selector) {
      return selector.split(',').some(value => this.classList.contains(value.trim().match(/^\.([\w-]+)/)?.[1])) ? this : null;
    },
  };
  return item;
}

function fixture({ reduced = false, intersectionObserver = true, observeError = false } = {}) {
  const media = { ...eventTarget(), matches: reduced };
  media.addListener = handler => media.addEventListener('change', handler);
  media.removeListener = handler => media.removeEventListener('change', handler);
  const visible = element('archive-stats', 80);
  const spanning = element('card', -400, 2200);
  const nearEdge = element('category-card', 767);
  const edge = element('category-card', 768);
  const below = element('card', 1200);
  const footer = element('footer', 2200);
  const items = [visible, spanning, nearEdge, edge, below, footer];
  const observers = [], selectors = [];
  class Observer {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      this.unobserved = [];
      this.disconnects = 0;
      this.observeCalls = 0;
      observers.push(this);
    }
    observe(target) {
      this.observeCalls++;
      if (observeError && this.observeCalls === 2) throw new Error('IntersectionObserver failed after partial setup');
      this.observed.add(target);
    }
    unobserve(target) { this.unobserved.push(target); this.observed.delete(target); }
    disconnect() { this.disconnects++; this.observed.clear(); }
    intersect(target, isIntersecting = true) { this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }], this); }
  }
  const document = {
    ...eventTarget(), readyState: 'complete', documentElement: { classList: classList() },
    querySelectorAll(selector) { selectors.push(selector); return items; },
  };
  const window = {
    ...eventTarget(), innerHeight: 800,
    matchMedia(query) { assert.match(query, /prefers-reduced-motion/); return media; },
  };
  if (intersectionObserver) window.IntersectionObserver = Observer;
  const context = {
    document, window, innerHeight: window.innerHeight, matchMedia: window.matchMedia,
    requestAnimationFrame() { assert.fail('archive reveals must not create an animation frame loop'); },
    setTimeout() { assert.fail('archive reveals must not require a timer to make content readable'); },
  };
  if (intersectionObserver) context.IntersectionObserver = Observer;
  vm.runInNewContext(source, context);
  return { document, window, media, items, visible, spanning, nearEdge, edge, below, footer, observers, selectors };
}

const hiddenByReveal = item => item.classList.contains('reveal-pending') && !item.classList.contains('is-visible');

test('archive motion leaves visible and viewport-spanning content readable and observes only offscreen surfaces', () => {
  const page = fixture();
  assert.equal(hiddenByReveal(page.visible), false);
  assert.equal(hiddenByReveal(page.spanning), false, 'a tall card already covering the viewport must not disappear');
  assert.equal(hiddenByReveal(page.nearEdge), false);
  assert.ok(hiddenByReveal(page.edge));
  assert.ok(hiddenByReveal(page.below));
  assert.ok(hiddenByReveal(page.footer));
  assert.equal(page.observers.length, 1);
  assert.deepEqual([...page.observers[0].observed], [page.edge, page.below, page.footer]);
  assert.equal(page.observers[0].options.rootMargin, '0px 0px -32px 0px');
  assert.equal(page.observers[0].options.threshold, 0);
  for (const target of [page.window, page.document]) {
    for (const type of ['scroll', 'wheel', 'touchmove']) assert.equal(target.handlers.get(type)?.size || 0, 0, `${type} remains native`);
  }
});

test('an archive surface reveals on entry once and remains visible after leaving the viewport', () => {
  const page = fixture(), observer = page.observers[0];
  observer.intersect(page.below, false);
  assert.ok(hiddenByReveal(page.below), 'non-intersecting observer records do not reveal content early');
  observer.intersect(page.below);
  assert.equal(hiddenByReveal(page.below), false);
  assert.equal(page.below.classList.contains('is-visible'), true);
  assert.equal(observer.observed.has(page.below), false);
  assert.equal(observer.unobserved.filter(item => item === page.below).length, 1);
  observer.intersect(page.below, false);
  assert.equal(hiddenByReveal(page.below), false, 'leaving the viewport must not restart the entrance');
});

test('keyboard focus immediately reveals its pending archive card', () => {
  const page = fixture(), observer = page.observers[0];
  page.document.fire('focusin', { target: { closest: selector => page.below.closest(selector) } });
  assert.equal(hiddenByReveal(page.below), false);
  assert.equal(observer.observed.has(page.below), false);
  assert.equal(hiddenByReveal(page.footer), true, 'focusing one card does not animate unrelated content');
});

test('reduced motion and unsupported intersection observers never conceal archive content', () => {
  for (const options of [{ reduced: true }, { intersectionObserver: false }]) {
    const page = fixture(options);
    assert.equal(page.items.some(hiddenByReveal), false);
    assert.equal(page.observers.length, 0);
  }
});

test('a live reduced-motion change restores all pending content and disconnects observation', () => {
  const page = fixture(), observer = page.observers[0];
  page.media.matches = true;
  page.media.fire('change', { matches: true });
  assert.equal(page.items.some(hiddenByReveal), false);
  assert.ok(observer.disconnects > 0);
  assert.equal(observer.observed.size, 0);
  page.media.matches = false;
  page.media.fire('change', { matches: false });
  assert.equal(page.items.some(hiddenByReveal), false, 'returning to motion must not re-hide content already restored');
});

test('pagehide restores pending content before a back-forward cache snapshot', () => {
  const page = fixture(), observer = page.observers[0];
  page.window.fire('pagehide', { persisted: true });
  assert.equal(page.items.some(hiddenByReveal), false);
  assert.ok(observer.disconnects > 0);
  assert.equal(observer.observed.size, 0);
});

test('a partial observer setup failure restores both enrolled and newly pending archive content', () => {
  const page = fixture({ observeError: true }), observer = page.observers[0];
  assert.equal(observer.observeCalls, 2, 'one surface was successfully enrolled before the API failed');
  assert.equal(page.items.some(hiddenByReveal), false, 'an exception must never strand an invisible card');
  assert.ok(observer.disconnects > 0);
  assert.equal(observer.observed.size, 0);
});
