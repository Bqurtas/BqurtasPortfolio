import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function source(from, to) {
  const start = main.indexOf(from), end = main.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  return main.slice(start, end);
}
const position = vm.runInNewContext(source('  const serviceSequencePosition = ', '  const serviceSequences = ') + '\nserviceSequencePosition;');

test('native service reading visits all four chapters and reverses without trapping document scroll', () => {
  const offsets = [-100, 0, 350, 700, 1050, 1500, 1050, 700, 350, 0];
  assert.deepEqual(offsets.map(offset => position(offset, 350, 4, 0).index), [0, 0, 1, 2, 3, 3, 3, 2, 1, 0]);
  assert.ok(offsets.every(offset => position(offset, 350, 4, 0).inner === 0));
});

test('short-screen copy can finish its reading distance in every service, including the last', () => {
  for (let index = 0; index < 4; index++) {
    for (const [delta, inner] of [[0, 0], [100, 100], [200, 200], [349, 200]]) {
      const actual = position(index * 350 + delta, 350, 4, 200);
      assert.equal(actual.index, index);
      assert.equal(actual.inner, inner);
    }
  }
  assert.equal(position(2000, 350, 4, 200).inner, 200);
});

test('readable phone service fitting leaves enough native track to finish every long chapter', () => {
  let zoom = 1;
  const viewport = { innerWidth: 320, innerHeight: 568, __bqViewportScale: 568 / 720 };
  const panels = Array.from({ length: 4 }, () => ({ dataset: {}, querySelector: () => ({ addEventListener() {} }) }));
  const scroller = {
    dataset: {}, clientHeight: 548, clientWidth: 280,
    get scrollHeight() { return Math.ceil(1000 * zoom); },
    get scrollWidth() { return this.clientWidth; },
    querySelector: () => null, querySelectorAll: () => panels,
  };
  const sheet = {
    dataset: {}, hasAttribute: () => true, closest: () => ({ id: 'design' }),
    classList: { contains: name => ['section', 'service-showcase'].includes(name), add() {}, toggle() {} },
    style: { setProperty(_name, value) { zoom = Number(value); } },
    after(node) { this.nextElementSibling = node; },
  };
  const context = {
    window: viewport, document: { createElement: () => ({ setAttribute() {}, style: { setProperty() {} } }) },
  };
  const fit = vm.runInNewContext(source('  const PAPER_FIT_MIN = 0.5;', '  /* Chapters of one group') + '\nfitPaper;', context);
  const setup = vm.runInNewContext(source('  const serviceSequences = ', '  window.__bqScrollPaperTarget = ') + '\nsetupServiceSequence;', context);
  fit(sheet, scroller);
  assert.equal(zoom, 0.7889, 'fitting retains the phone viewport scale, rather than shrinking to fit all the copy');
  const overflow = scroller.scrollHeight - scroller.clientHeight;
  assert.equal(overflow, 241);
  const sequence = setup(sheet, scroller);
  sequence.measure(overflow);
  assert.equal(sequence.range, sequence.step * 4);
  assert.ok(sequence.step > overflow, 'every chapter retains a hold after its readable content');
  for (let index = 0; index < 4; index++) {
    assert.equal(position(index * sequence.step, sequence.step, 4, overflow).inner, 0);
    const lastLine = position(index * sequence.step + overflow, sequence.step, 4, overflow);
    assert.equal(lastLine.index, index, 'the following chapter must not replace a description before its last line');
    assert.equal(lastLine.inner, overflow);
  }
  assert.equal(position(sequence.range, sequence.step, 4, overflow).inner, overflow, 'the last chapter finishes before the next paper arrives');
});

test('service chapter changes keep disclosure state aligned and avoid unchanged writes', () => {
  let writes = 0;
  const panels = Array.from({ length: 4 }, (_, index) => {
    let active = index === 0;
    const attrs = { 'aria-expanded': String(active) };
    return {
      dataset: {},
      classList: { contains: () => active, toggle: (_, value) => { active = value; writes++; } },
      querySelector: () => ({ setAttribute: (name, value) => { attrs[name] = value; writes++; }, addEventListener() {} }),
      attrs,
    };
  });
  const sheet = { dataset: {}, classList: { contains: () => true } };
  const setup = vm.runInNewContext(source('  const serviceSequences = ', '  window.__bqScrollPaperTarget = ') + '\nsetupServiceSequence;', { window: {} });
  const sequence = setup(sheet, { querySelectorAll: () => panels });
  sequence.activate(2);
  assert.deepEqual(panels.map(panel => panel.attrs['aria-expanded']), ['false', 'false', 'true', 'false']);
  const firstWrites = writes;
  sequence.activate(2);
  assert.equal(writes, firstWrites);
  sequence.activate(1);
  assert.deepEqual(panels.map(panel => panel.attrs['aria-expanded']), ['false', 'true', 'false', 'false']);
});

test('service chapters hold their sticky paper with a sibling track and keep the next paper anchor aligned', () => {
  const style = () => ({ setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } });
  const classes = { contains: () => true, remove() {}, toggle() {} };
  const panels = Array.from({ length: 4 }, () => ({
    dataset: {}, classList: classes, querySelector: () => ({ setAttribute() {}, addEventListener() {} }),
  }));
  const scroller = {
    dataset: {}, clientHeight: 824, scrollHeight: 824, classList: classes,
    querySelectorAll: () => panels, querySelector: () => null, removeAttribute() {}, setAttribute() {},
  };
  const root = { getBoundingClientRect: () => ({ top: 10 }) };
  const sheet = {
    dataset: {}, classList: classes, style: style(), parentElement: root, offsetHeight: 824,
    querySelector: () => scroller, after(node) { this.nextElementSibling = node; },
  };
  const next = { ...sheet, dataset: {}, style: style(), querySelector: () => next.scroller,
    scroller: { ...scroller, dataset: {}, querySelectorAll: () => [] } };
  const created = [];
  const context = {
    window: { scrollY: 0 }, root, sheets: [sheet, next], pin: 10, terminalSheet: null,
    document: { createElement() {
      const node = { style: style(), attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
      created.push(node); return node;
    } },
    allowsInnerScroll: () => true, fitPaper() {}, fitGroups() {}, ensurePaperMeter: () => null,
    updatePaperMeter() {}, paperLabel: () => 'Services',
    getComputedStyle: node => ({ borderTopWidth: '0px', paddingTop: '0px', marginTop: '0px',
      marginBottom: `${10 + (parseFloat(node.style?.['--bq-flow-extra']) || 0)}px` }),
  };
  vm.runInNewContext(source('  const serviceSequences = ', '  window.__bqScrollPaperTarget = ')
    + '\nglobalThis.setup = setupServiceSequence;', context);
  const sequence = context.setup(sheet, scroller);
  const measure = () => vm.runInNewContext(`{
    ${source('      const rootSheets = sheets.filter', '      /* Give the final card')}
    ${source('      const rootStyle = getComputedStyle(root);', '\n      hasMeasured = true;')}
  }`, context);
  measure();
  assert.equal(sequence.step, 198, 'a fitting phone chapter needs a short native scroll, not a full viewport');
  assert.equal(sequence.range, 792);
  assert.equal(sheet.style['--bq-flow-extra'], '0px', 'own margins must not subtract the chapter distance from sticky travel');
  assert.equal(sheet.nextElementSibling, created[0]);
  assert.equal(created[0].className, 'paper-sequence-track');
  assert.equal(created[0].attrs['aria-hidden'], 'true');
  assert.equal(created[0].style.height, '792px');
  assert.equal(next.scroller.dataset.paperStart, '1626', 'the next paper starts after the entire chapter track');
  scroller.clientHeight = 340;
  scroller.scrollHeight = 475;
  measure();
  assert.equal(created.length, 1, 'viewport changes reuse the track rather than accumulating spacers');
  assert.equal(sequence.step, 255, 'short screens retain 135px of readable overflow plus a brief chapter hold');
  assert.equal(created[0].style.height, '1020px');
  assert.equal(next.scroller.dataset.paperStart, '1854');
  for (let index = 0; index < 4; index++) {
    assert.equal(position(index * sequence.step + 135, sequence.step, 4, 135).inner, 135);
  }
});

test('explicit service selection navigates to its chapter rather than reverting on the next scroll', () => {
  const scrolls = [];
  const scroller = { dataset: { paperStart: '1000.75', paperSequenceStep: '350' }, scrollHeight: 600, clientHeight: 600 };
  const sheet = { querySelector: () => scroller };
  const panel = { dataset: { serviceStep: '2' } };
  const target = { matches: selector => selector === '.service-trigger', closest: selector => selector === '.service-panel' ? panel : sheet };
  const window = { scrollTo: options => scrolls.push(options) };
  vm.runInNewContext(source('  window.__bqScrollPaperTarget = ', "  document.addEventListener('focusin'"), { window, allowsInnerScroll: () => true });
  assert.equal(window.__bqScrollPaperTarget(target), true);
  assert.equal(scrolls[0].top, 1701);
  assert.equal(scrolls[0].behavior, 'auto');
  assert.equal(position(scrolls[0].top + 20 - 1000.75, 350, 4, 0).index, 2);
});


test('keyboard focus inside a long service reveals its nearest edge without rewinding the chapter', () => {
  const scrolls = [];
  const scroller = {
    dataset: { paperStart: '1000', paperSequenceStep: '350' },
    scrollHeight: 800, clientHeight: 600, scrollTop: 100,
    getBoundingClientRect: () => ({ top: 0 }),
  };
  const sheet = { querySelector: () => scroller };
  const panel = { dataset: { serviceStep: '3' } };
  const target = {
    matches: () => false, closest: selector => selector === '.service-panel' ? panel : sheet,
    getBoundingClientRect: () => ({ top: 560, height: 50 }),
  };
  const window = { matchMedia: () => ({ matches: false }), scrollTo: options => scrolls.push(options) };
  vm.runInNewContext(source('  window.__bqScrollPaperTarget = ', "  document.addEventListener('focusin'"), {
    window, allowsInnerScroll: () => true, performance: { now: () => 0 },
  });
  window.__bqScrollPaperTarget(target, { block: 'nearest', behavior: 'auto' });
  assert.equal(scrolls[0].top, 2160);
});
