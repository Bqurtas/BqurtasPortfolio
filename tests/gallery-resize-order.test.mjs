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

const scheduler = section('(function viewportLayoutScheduler() {', '\ndocument.addEventListener(\'DOMContentLoaded\'');
const columnCount = section('  const colCountForWidth = ', '  let portfolioRevealObserver = ');
const resizeEnd = main.indexOf('  const clearWorkOverflowFloor = ');
const resizeStart = main.lastIndexOf('\n  /*', resizeEnd);
assert.ok(resizeStart >= 0 && resizeEnd > resizeStart);
const resizeGallery = main.slice(resizeStart, resizeEnd);

function fixture() {
  const listeners = new Map();
  const frames = [];
  const timers = new Map();
  const readings = [];
  const rebuilds = [];
  const catalogue = Array.from({ length: 80 }, (_, id) => ({ id }));
  let timerId = 0;
  const window = {
    innerWidth: 320, innerHeight: 568,
    matchMedia: () => ({ matches: false }),
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
  };
  const context = vm.createContext({
    window,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { frames.push(callback); },
    catalogue, rebuilds,
    recordReading(owner, columns, shown, placed) {
      readings.push({ owner, columns, shown, ids: Array.from(placed, entry => entry.id) });
    },
  });
  vm.runInContext(scheduler + columnCount + `
    const gridEl = {};
    let mCols = Array.from({ length: colCountForWidth() }, () => ({}));
    let currentShown = 48;
    let placed = catalogue.slice(0, currentShown);
    const matchingCards = () => catalogue;
    const buildColumns = count => {
      rebuilds.push(count);
      mCols = Array.from({ length: count }, () => ({}));
      placed = [];
    };
    const placeCards = entries => { placed = entries; };
    const updateLoadMore = () => {};
    // The real scheduler registers before the gallery's resize handler.
    // Both geometry owners read in their queued frames, as in the page.
    for (const owner of ['paper', 'portfolio']) {
      window.__bqViewportLayout.subscribe(() => requestAnimationFrame(() => {
        recordReading(owner, mCols.length, currentShown, placed);
      }));
    }
  ` + resizeGallery, context);
  return {
    readings, rebuilds,
    resize(width, height = window.innerHeight) {
      window.innerWidth = width;
      window.innerHeight = height;
      for (const callback of listeners.get('resize') || []) callback();
    },
    paint() { frames.splice(0).forEach(callback => callback()); },
    settleTimers() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach(callback => callback());
    },
  };
}

test('phone-to-desktop resize rebuilds masonry before either queued track measurement', () => {
  const page = fixture();
  page.resize(1280, 800);
  page.paint();
  assert.deepEqual(page.readings, ['paper', 'portfolio'].map(owner => ({
    owner, columns: 4, shown: 48, ids: Array.from({ length: 48 }, (_, id) => id),
  })), 'the first measurements must see desktop columns with the entire existing batch in its original order');
  assert.deepEqual(page.rebuilds, [4]);
  page.settleTimers();
  assert.deepEqual(page.rebuilds, [4], 'no delayed rebuild may invalidate the measured track');

  page.readings.length = 0;
  page.resize(320, 568);
  page.paint();
  assert.ok(page.readings.every(reading => reading.columns === 2 && reading.shown === 48));
  assert.deepEqual(page.rebuilds, [4, 2]);
});

test('width changes within a column breakpoint and height-only resizes do not rebuild masonry', () => {
  const page = fixture();
  for (const width of [390, 420, 560]) page.resize(width);
  page.resize(560, 844);
  page.paint();
  assert.deepEqual(page.rebuilds, []);

  for (const width of [561, 820, 1024, 1025, 1200, 1280, 1281, 1450, 1451, 1600]) page.resize(width);
  page.paint();
  assert.deepEqual(page.rebuilds, [3, 4, 5, 6], 'only a real column-count change rebuilds the existing cards');
});
