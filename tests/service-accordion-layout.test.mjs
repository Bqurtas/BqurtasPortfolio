import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const motion = await readFile(new URL('../preview_site/js/motion.js', import.meta.url), 'utf8');
function source(from, to, input = main) {
  const start = input.indexOf(from), end = input.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  return input.slice(start, end);
}
const allowsInnerScroll = vm.runInNewContext(source('  const allowsInnerScroll = ', '  /* Short home papers fit') + '\nallowsInnerScroll;');

function classes(...names) {
  const values = new Set(names);
  return {
    contains: name => values.has(name),
    add: name => values.add(name), remove: name => values.delete(name),
    toggle(name, on) { if (on) values.add(name); else values.delete(name); },
  };
}

test('the fallback accordion remains usable when the native sequence is unavailable', () => {
  const panels = Array.from({ length: 4 }, (_, index) => {
    const attrs = { 'aria-expanded': String(index === 0) }, handlers = {};
    const trigger = {
      setAttribute(name, value) { attrs[name] = value; },
      addEventListener(name, handler) { handlers[name] = handler; },
    };
    return { attrs, handlers, classList: classes(...(index === 0 ? ['is-active'] : [])), querySelector: () => trigger };
  });
  vm.runInNewContext(source('    /* ---- service accordion ---- */', '    /* ---- software lines', motion), {
    document: { querySelectorAll: () => panels },
    window: { scrollTo() { throw new Error('Selecting an accordion row must not move the document'); } },
  });
  for (const index of [3, 1, 0, 2]) {
    panels[index].handlers.click();
    assert.deepEqual(panels.map(panel => panel.attrs['aria-expanded']), panels.map((_, i) => String(i === index)));
    assert.deepEqual(panels.map(panel => panel.classList.contains('is-active')), panels.map((_, i) => i === index));
  }
  panels[0].handlers.focus();
  assert.equal(panels[0].attrs['aria-expanded'], 'true');
  assert.equal(panels[2].attrs['aria-expanded'], 'false');
});

test('services share native reading ownership with other long papers while portfolio keeps its own reel', () => {
  for (const extra of [[], ['room-sheet--one'], ['room-sheet--scroll']]) {
    assert.equal(allowsInnerScroll({ classList: classes('service-showcase', ...extra), dataset: { paperScroll: 'inner' } }), true);
  }
  assert.equal(allowsInnerScroll({ classList: classes('work'), dataset: { paperScroll: 'inner' } }), false);
  for (const roomClass of ['room-sheet--one', 'room-sheet--scroll']) {
    assert.equal(allowsInnerScroll({ classList: classes(roomClass), dataset: {} }), true);
  }
  assert.equal(allowsInnerScroll({ classList: classes('section'), dataset: { paperScroll: 'inner' } }), true);
});

test('ordinary reading papers hold only their actual overflow before the following paper', () => {
  const style = () => ({ setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } });
  const scroller = {
    dataset: {}, clientHeight: 824, scrollHeight: 824, classList: classes(),
    querySelector: () => null, removeAttribute() {}, setAttribute() {},
  };
  const root = { getBoundingClientRect: () => ({ top: 10 }) };
  const sheet = {
    dataset: { paperScroll: 'inner' }, classList: classes('section'), style: style(), parentElement: root, offsetHeight: 824,
    querySelector: () => scroller,
    after() { throw new Error('Services must not insert a multi-chapter spacer'); },
  };
  const next = { ...sheet, classList: classes('section'), dataset: {}, style: style(), querySelector: () => next.scroller,
    scroller: { ...scroller, dataset: {}, classList: classes() } };
  const context = {
    window: { scrollY: 0 }, serviceSequences: new WeakMap(), root, sheets: [sheet, next], pin: 10, terminalSheet: null,
    allowsInnerScroll, fitPaper() {}, fitGroups() {}, ensurePaperMeter: () => null,
    updatePaperMeter() {}, paperLabel: () => 'Services',
    getComputedStyle: node => ({ borderTopWidth: '0px', paddingTop: '0px', marginTop: '0px',
      marginBottom: `${10 + (parseFloat(node.style?.['--bq-flow-extra']) || 0)}px` }),
  };
  const measure = () => vm.runInNewContext(`{
    ${source('      const rootSheets = sheets.filter', '      /* Give the final card')}
    ${source('      const rootStyle = getComputedStyle(root);', '\n      hasMeasured = true;')}
  }`, context);
  for (const contentHeight of [824, 1100, 824]) {
    scroller.scrollHeight = contentHeight;
    measure();
    const overflow = Math.max(0, contentHeight - 824);
    assert.equal(scroller.dataset.paperOverflow, String(overflow));
    assert.equal(sheet.style['--bq-flow-extra'], `${overflow}px`);
    assert.equal(next.scroller.dataset.paperStart, String(834 + overflow), 'only real content adds reading distance, never a chapter hold');
    assert.equal(scroller.classList.contains('is-window-driven'), overflow > 0);
    assert.equal(scroller.classList.contains('is-paper-scrollable'), overflow > 0);
  }
});

test('native page scrolling reads service overflow in both directions and releases at the last line', () => {
  const scroller = { dataset: { paperStart: '1000', paperOverflow: '276' }, scrollTop: 0 };
  const sheet = { classList: classes('section', 'service-showcase'), dataset: { paperScroll: 'inner' }, querySelector: () => scroller };
  const writes = [];
  const context = {
    sheets: [sheet], allowsInnerScroll, serviceSequences: new WeakMap(),
    window: { scrollY: 0, scrollTo() { throw new Error('Reading must never hijack native document momentum'); } },
    updatePaperMeter(_sheet, current, overflow) { writes.push([current.scrollTop, overflow]); },
  };
  const renderReading = source('      /* Gather reading positions before writing', '      /* Read every geometry value')
    + source('      reading.forEach(({ sheet, scroller, overflow, sequence, position, innerY, scrollTop }) => {', '      if (sheets.length < 2');
  for (const [pageY, innerY] of [[900, 0], [1000, 0], [1100, 100], [1276, 276], [1350, 276], [1200, 200], [900, 0]]) {
    context.window.scrollY = pageY;
    vm.runInNewContext(`{${renderReading}}`, context);
    assert.equal(scroller.scrollTop, innerY, `${pageY}: real content reads once, then the page hands over`);
    assert.deepEqual(writes.at(-1), [innerY, 276]);
  }
});
