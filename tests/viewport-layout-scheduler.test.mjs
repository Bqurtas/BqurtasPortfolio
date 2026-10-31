import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('(function viewportLayoutScheduler() {');
const end = main.indexOf('\n})();', start) + '\n})();'.length;
assert.ok(start >= 0 && end > start);

function target() {
  const handlers = new Map();
  return {
    addEventListener(type, callback) { (handlers.get(type) || handlers.set(type, []).get(type)).push(callback); },
    fire(type) { handlers.get(type)?.forEach(callback => callback()); },
  };
}
function fixture({ touch = true } = {}) {
  const timers = new Map();
  let clock = 0, id = 0;
  const window = { ...target(), innerWidth: 390, innerHeight: 700, visualViewport: target(), matchMedia: () => ({ matches: touch }) };
  vm.runInNewContext(main.slice(start, end), {
    window,
    setTimeout(callback, ms) { timers.set(++id, { callback, at: clock + ms }); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  return {
    window, gate: window.__bqViewportLayout, timers,
    advance(ms) {
      clock += ms;
      for (const [key, timer] of [...timers]) if (timer.at <= clock) { timers.delete(key); timer.callback(); }
    },
  };
}

test('visual viewport noise does not refit an unchanged layout', () => {
  const page = fixture();
  let fits = 0;
  page.gate.subscribe(() => fits++);
  for (let i = 0; i < 80; i++) {
    page.window.fire('resize');
    page.window.visualViewport.fire('resize');
  }
  page.advance(200);
  assert.equal(fits, 0);
  assert.equal(page.timers.size, 0);
});

test('phone toolbar height animation coalesces both resize sources and observer work', () => {
  const page = fixture();
  let fits = 0, contentReads = 0;
  const fit = () => fits++;
  const content = () => contentReads++;
  page.gate.subscribe(fit);
  for (let i = 1; i <= 8; i++) {
    page.window.innerHeight = 700 + i * 10;
    page.window.fire('resize');
    page.window.visualViewport.fire('resize');
    assert.equal(page.gate.defer(fit), true, 'ResizeObserver must not bypass the settling gate');
    assert.equal(page.gate.defer(content), true);
    page.advance(16);
    assert.equal(fits, 0);
  }
  page.advance(120);
  assert.equal(fits, 1, 'a subscribed callback also queued by an observer runs only once');
  assert.equal(contentReads, 1, 'content updates are retained, not dropped');
  assert.equal(page.gate.defer(content), false, 'ordinary content changes resume immediately');
});

test('width changes and orientation cancel the pending delay and update immediately', () => {
  const page = fixture();
  let fits = 0;
  page.gate.subscribe(() => fits++);
  page.window.innerHeight += 10;
  page.window.fire('resize');
  page.window.innerWidth = 844;
  page.window.fire('resize');
  assert.equal(fits, 1);
  page.advance(200);
  assert.equal(fits, 1, 'the old height timer cannot refit after width already settled');
  page.window.innerHeight += 10;
  page.window.fire('resize');
  page.window.fire('orientationchange');
  assert.equal(fits, 2);
  assert.equal(page.timers.size, 0);
});

test('desktop height changes retain immediate responsive fitting', () => {
  const page = fixture({ touch: false });
  let fits = 0;
  page.gate.subscribe(() => fits++);
  page.window.innerHeight = 500;
  page.window.fire('resize');
  assert.equal(fits, 1);
  assert.equal(page.timers.size, 0);
});

test('early paper-frame events defer fitting until toolbar motion is quiet even with stale innerHeight', () => {
  const page = fixture();
  let fits = 0, observerFits = 0;
  const fit = () => fits++;
  const observerFit = () => observerFits++;
  page.gate.subscribe(fit);
  for (const height of [720, 740, 760, 780]) {
    page.window.__bqPaperViewport = { width: 390, height };
    page.window.fire('bq:frame-resize');
    page.window.visualViewport.fire('resize');
    page.window.fire('resize');
    assert.equal(page.gate.defer(fit), true);
    assert.equal(page.gate.defer(observerFit), true);
    page.advance(20);
    assert.equal(fits, 0);
  }
  assert.equal(page.window.innerHeight, 700);
  page.advance(99);
  assert.equal(fits, 0, 'the last frame has not yet been quiet for 120ms');
  page.advance(1);
  assert.equal(fits, 1);
  assert.equal(observerFits, 1, 'observer work survives the shared delay and runs once');
  for (let i = 0; i < 10; i++) page.window.fire('bq:frame-resize');
  page.advance(200);
  assert.equal(fits, 1, 'identical bridge notifications cannot start another fitting pass');
  assert.equal(page.timers.size, 0);
});

test('a measured width change supersedes a pending phone-height fit immediately', () => {
  const page = fixture();
  let fits = 0;
  page.gate.subscribe(() => fits++);
  page.window.__bqPaperViewport = { width: 390, height: 780 };
  page.window.fire('bq:frame-resize');
  page.advance(20);
  page.window.innerWidth = 780;
  page.window.__bqPaperViewport = { width: 780, height: 360 };
  page.window.fire('bq:frame-resize');
  assert.equal(fits, 1);
  assert.equal(page.timers.size, 0);
  page.advance(200);
  assert.equal(fits, 1);
});
