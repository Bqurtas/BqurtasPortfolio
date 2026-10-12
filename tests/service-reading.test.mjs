import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function section(from, to) {
  const start = main.indexOf(from);
  const end = main.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  return main.slice(start, end);
}
function classList(...initial) {
  const values = new Set(initial);
  return {
    contains: value => values.has(value),
    toggle(value, enabled) { if (enabled) values.add(value); else values.delete(value); },
  };
}

test('opening and resizing service details refreshes reading distance inside an unchanged layout wrapper', () => {
  const observers = [], frames = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    resized(target) { if (this.targets.has(target)) this.callback([{ target }]); }
  }
  const root = {};
  const details = Array.from({ length: 4 }, () => ({ height: 0 }));
  const layout = { clientHeight: 600, classList: classList() };
  const scroller = {
    dataset: { paperStart: '1000' }, children: [layout], classList: classList(),
    clientHeight: 600, scrollTop: 0,
    get scrollHeight() { return 600 + details.reduce((sum, detail) => sum + detail.height, 0); },
    querySelector: () => null, querySelectorAll: selector => selector === '.service-detail' ? details : [],
    addEventListener() {}, removeAttribute() {}, setAttribute() {},
  };
  const sheet = {
    parentElement: root, dataset: {}, classList: classList('service-showcase'),
    style: { setProperty() {} }, querySelector: () => scroller,
  };
  const measurement = section('      const rootSheets = sheets.filter', '      /* Give the final card');
  const registration = section("    const resizeObserver = typeof ResizeObserver === 'function'", '\n    document.fonts?.ready?.then(queueMeasure');
  const renderStart = main.indexOf('      sheets.forEach((sheet) => {', main.indexOf('/* Every long paper follows'));
  const renderEnd = main.indexOf('\n      if (sheets.length < 2', renderStart);
  assert.ok(renderStart > 0 && renderEnd > renderStart);
  const context = {
    root, sheets: [sheet], window: { scrollY: 1000 }, ResizeObserver: Observer,
    allowsInnerScroll: () => true, ensurePaperMeter: () => null,
    paperLabel: () => 'What I do', updatePaperMeter() {},
    queueMeasure() { frames.push(() => vm.runInNewContext(`{${measurement}}`, context)); },
  };
  const flush = () => { while (frames.length) frames.shift()(); };
  vm.runInNewContext(registration, context);
  context.queueMeasure(); flush();
  assert.equal(scroller.dataset.paperOverflow, '0');

  for (const height of [8, 220, 410, 0]) {
    // Opening, narrower wrapping, longer translated text, then closing.
    // The outer boxes remain 600px throughout all four changes.
    details[0].height = height;
    observers[0].resized(details[0]);
    flush();
    assert.equal(scroller.dataset.paperOverflow, String(height));
    if (height) {
      context.window.scrollY = 1000 + height;
      vm.runInNewContext(main.slice(renderStart, renderEnd), context);
      assert.equal(scroller.scrollTop, height, 'document scrolling must reach the complete expanded content');
    }
  }
  assert.equal(layout.clientHeight, 600);
  assert.equal(scroller.clientHeight, 600);
  assert.ok(details.every(detail => observers[0].targets.has(detail)), 'all four accordion panels need size observation');
});

test('keyboard focus can reveal the last 8px of a paper while subpixel overflow stays ignored', () => {
  const source = section('  window.__bqScrollPaperTarget = ', "  document.addEventListener('focusin'");
  for (const overflow of [8, 0.5]) {
    const scrolls = [];
    const scroller = {
      dataset: { paperStart: '1000' }, clientHeight: 600, scrollHeight: 600 + overflow, scrollTop: 0,
      getBoundingClientRect: () => ({ top: 0 }),
    };
    const sheet = { querySelector: () => scroller };
    const target = {
      closest: () => sheet, matches: () => false,
      getBoundingClientRect: () => ({ top: 560, height: 40 + overflow }),
    };
    const window = {
      matchMedia: () => ({ matches: false }), scrollTo: options => scrolls.push(options.top),
    };
    vm.runInNewContext(source, { window, allowsInnerScroll: () => true, performance: { now: () => 0 } });
    assert.equal(window.__bqScrollPaperTarget(target, { block: 'nearest', behavior: 'auto' }), true);
    assert.deepEqual(scrolls, [overflow > 1 ? 1008 : 1000]);
  }
});
