import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('  const PAPER_FIT_MIN = 0.5;');
const end = main.indexOf('  /* Chapters of one group', start);
assert.ok(start > 0 && end > start);
const source = main.slice(start, end);

// A paper whose copy fits once the applied zoom is at or below `limit`.
function paper(limit, widthLimit = Infinity) {
  const state = { limit, widthLimit, applied: 1, layouts: 0 };
  const sheet = {
    hasAttribute: () => true,
    classList: { add() {}, toggle() {} },
    style: { setProperty(_, value) { state.applied = Number(value); } },
  };
  const scroller = {
    querySelector: () => null,
    clientHeight: 600,
    clientWidth: 900,
    get scrollWidth() { return state.applied <= state.widthLimit ? 900 : 980; },
    get scrollHeight() { state.layouts += 1; return state.applied <= state.limit ? 600 : 640; },
  };
  return { sheet, scroller, state };
}

// The search as it was before the warm start, for comparison.
function bisect(limit) {
  const fits = (f) => Number(f === 1 ? '1' : f.toFixed(4)) <= limit;
  if (fits(1)) return 1;
  let low = 0.5, high = 1;
  if (fits(low)) for (let step = 0; step < 7; step += 1) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid; }
  return low;
}

const fitPaper = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap });
const limits = [1.2, 1, 0.9999, 0.97, 0.9141, 0.85, 0.8086, 0.7, 0.6, 0.5021, 0.5, 0.4, 0.1];

test('a re-measure confirms the previous fit in two layouts and returns the same size', () => {
  for (const limit of limits) {
    const { sheet, scroller, state } = paper(limit);
    fitPaper(sheet, scroller);
    const cold = state.applied;
    assert.equal(cold, Number(bisect(limit) === 1 ? 1 : bisect(limit).toFixed(4)), `cold ${limit}`);
    state.layouts = 0;
    fitPaper(sheet, scroller);
    assert.equal(state.applied, cold, `warm ${limit}`);
    if (cold < 1 && limit >= 0.5) assert.equal(state.layouts, 2, `warm reads for ${limit}`);
  }
});

test('a short wide window fits horizontal overflow as well as the paper height', () => {
  const { sheet, scroller, state } = paper(1.2, 0.8);
  fitPaper(sheet, scroller);
  assert.equal(state.applied, Number(bisect(0.8).toFixed(4)));
  assert.ok(scroller.scrollWidth <= scroller.clientWidth);
  state.widthLimit = 1.2;
  fitPaper(sheet, scroller);
  assert.equal(state.applied, 1, 'restoring width restores the original type and shape scale');
});

test('height and width changes choose the largest scale that fits both dimensions', () => {
  const { sheet, scroller, state } = paper(0.92, 0.74);
  for (const [height, width] of [[0.92, 0.74], [0.61, 0.74], [0.88, 0.96], [1.2, 1.2]]) {
    state.limit = height;
    state.widthLimit = width;
    fitPaper(sheet, scroller);
    const expected = bisect(Math.min(height, width));
    assert.equal(state.applied, Number(expected === 1 ? 1 : expected.toFixed(4)));
  }
});

const groupStart = main.indexOf('  const fitGroups = (entries) => {');
const groupEnd = main.indexOf('  const paperLabel = ', groupStart);
assert.ok(groupStart > 0 && groupEnd > groupStart);
const fitGroups = vm.runInNewContext(`${source}\n${main.slice(groupStart, groupEnd)}\nfitGroups;`, { WeakMap, Map });
function chapter(fit, overflow = false) {
  const state = { fit };
  const sheet = {
    dataset: { paperFitGroup: 'bio' },
    hasAttribute: () => true,
    classList: { toggle() {} },
    style: {
      getPropertyValue: () => String(state.fit),
      setProperty(_, value) { state.fit = Number(value); },
    },
  };
  const scroller = { clientHeight: 600, scrollHeight: overflow ? 800 : 600, clientWidth: 900, scrollWidth: 900 };
  return { sheet, scroller, state };
}

test('a chapter fitting at the minimum still shares its scale with the biography', () => {
  const entries = [chapter(0.5), chapter(0.8), chapter(1)];
  fitGroups(entries);
  assert.deepEqual(entries.map(entry => entry.state.fit), [0.5, 0.5, 0.5]);
});

test('an overflowing chapter at the minimum retains its reading track without shrinking other chapters', () => {
  const entries = [chapter(0.5, true), chapter(0.8), chapter(1)];
  fitGroups(entries);
  assert.deepEqual(entries.map(entry => entry.state.fit), [0.5, 0.8, 0.8]);
});

test('hero and terminal footer resize with the active room without gaining inner scroll ownership', () => {
  const measurementsStart = main.indexOf('      const rootSheets = sheets.filter');
  const measurementsEnd = main.indexOf('      /* Give the final card', measurementsStart);
  assert.ok(measurementsStart > 0 && measurementsEnd > measurementsStart);
  const measurementsSource = main.slice(measurementsStart, measurementsEnd);
  const root = {};
  function frame(contentHeight, parentElement = root) {
    const state = { height: 600, fit: 1 };
    const classes = new Set();
    const sheet = {
      parentElement, dataset: {},
      hasAttribute: name => name === 'data-paper-fit',
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      },
      style: {
        getPropertyValue: name => name === '--bq-paper-fit' ? String(state.fit) : '',
        setProperty(name, value) { if (name === '--bq-paper-fit') state.fit = Number(value); },
      },
    };
    const scroller = {
      dataset: {}, classList: { toggle() {} }, querySelector: () => null,
      removeAttribute() {}, setAttribute() {},
      get clientHeight() { return state.height; },
      get scrollHeight() { return Math.max(state.height, Math.ceil(contentHeight * state.fit)); },
      clientWidth: 900, scrollWidth: 900,
    };
    sheet.querySelector = () => scroller;
    return { sheet, scroller, state, classes };
  }
  const hero = frame(450), terminal = frame(390, {});
  const context = {
    WeakMap, Map, root, sheets: [hero.sheet], terminalSheet: terminal.sheet,
    ensures: [], ensurePaperMeter: () => null,
    allowsInnerScroll: () => false, paperLabel: () => 'Frame', updatePaperMeter() {},
  };
  vm.runInNewContext(`${source}\n${main.slice(groupStart, groupEnd)}`, context);
  const measure = () => vm.runInNewContext(`{${measurementsSource}}`, context);
  measure();
  for (const target of [hero, terminal]) assert.equal(target.state.fit, 1);
  hero.state.height = terminal.state.height = 270;
  measure();
  for (const target of [hero, terminal]) {
    assert.ok(target.state.fit < 1, 'the active frame responds to height reduction');
    assert.ok(target.scroller.scrollHeight - target.scroller.clientHeight <= 2);
    assert.equal(target.classes.has('is-paper-measuring'), false, 'temporary measuring styles are always cleared');
    assert.equal(target.scroller.dataset.paperScroll, undefined, 'the frame remains owned by native page scroll');
  }
  assert.equal(hero.scroller.dataset.paperOverflow, '0');
  hero.state.height = terminal.state.height = 600;
  measure();
  for (const target of [hero, terminal]) assert.equal(target.state.fit, 1, 'height restoration restores the original scale');
});

test('when the copy grows or shrinks between measures the result matches a fresh search', () => {
  for (const before of limits) for (const after of limits) {
    const { sheet, scroller, state } = paper(before);
    fitPaper(sheet, scroller);
    state.limit = after;
    fitPaper(sheet, scroller);
    const expected = bisect(after);
    assert.equal(state.applied, Number(expected === 1 ? 1 : expected.toFixed(4)), `${before} -> ${after}`);
  }
});
