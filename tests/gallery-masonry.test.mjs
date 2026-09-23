import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('  /* ===== JS MASONRY =====');
const end = main.indexOf('  const freezeWorkTrack = ', start);
assert.ok(start >= 0 && end > start);
const source = main.slice(start, end);

function fixture() {
  const events = [];
  const element = (label, height = 0) => ({
    label, height, children: [], className: '', style: {},
    get offsetHeight() { events.push(`read:${label}`); return this.height; },
    setAttribute() {},
    appendChild(child) {
      const spacer = child.className === 'grid-level-spacer';
      events.push(`append:${label}:${spacer ? 'spacer' : child.label}`);
      this.height += 16 + (spacer ? parseFloat(child.style.height) : child.height);
      this.children.push(child);
    },
  });
  const grid = element('grid');
  grid.clientWidth = 400;
  const columns = [element('left', 1700), element('right', 800)];
  const entries = Array.from({ length: 8 }, (_, index) => ({
    cat: 'design', type: 'image', item: { width: 400, height: 500 },
    el: {
      label: `card-${index}`, height: 288, isConnected: true,
      classList: { add() {}, remove() {} }, style: { setProperty() {} },
      querySelector: () => ({ tagName: 'IMG', getAttribute: name => name === 'width' ? '400' : '500' }),
    },
  }));
  const context = {
    window: { innerWidth: 400, BQ_ALL_CARDS: entries },
    document: { getElementById: () => grid, createElement: () => element('new-column') },
    matchMedia: () => ({ matches: true }), requestAnimationFrame: () => 1,
    updateTabHeader() {}, updateLoadMore() {},
  };
  vm.runInNewContext(`
    let currentFilter = 'all', currentShown = 2;
    const PAGE_SIZE = 2;
    ${source}
    globalThis.setColumns = (cols, heights) => { mCols = cols; mHeights = heights; };
    globalThis.state = () => ({ heights: [...mHeights], shown: currentShown, columns: mCols });
  `, context);
  context.setColumns(columns, [900, 1000]);
  return { context, columns, entries, events, render: context.window.__bqRenderGallery };
}

test('load more levels against rendered columns after a late media ratio correction', () => {
  const { render, columns, entries, events, context } = fixture();
  render(false);

  assert.deepEqual(events.slice(0, 2), ['read:left', 'read:right'],
    'all existing column heights must be captured before any spacer or card writes');
  assert.equal(events.filter(event => event.startsWith('read:')).length, 2,
    'a batch must not read a height for each card');
  assert.equal(columns[0].children.some(child => child.className === 'grid-level-spacer'), false,
    'the corrected tallest column needs no spacer, even if its old estimate was shorter');
  assert.equal(columns[1].children[0].style.height, '900px',
    'the spacer must close the actual 1700px to 800px gap');
  assert.equal(columns[0].children[0], entries[2].el);
  assert.equal(columns[1].children[1], entries[3].el);
  assert.deepEqual(Array.from(context.state().heights), [2004, 2004]);
  assert.equal(context.state().shown, 4);
});

test('each appended batch refreshes column heights after subsequent media changes', () => {
  const { render, columns, entries, events } = fixture();
  render(false);
  columns[0].height = 1100;
  columns[1].height = 2600;
  events.length = 0;
  render(false);

  assert.deepEqual(events.slice(0, 2), ['read:left', 'read:right']);
  assert.equal(events.filter(event => event.startsWith('read:')).length, 2);
  assert.equal(columns[0].children.at(-2).style.height, '1500px');
  assert.equal(columns[0].children.at(-1), entries[4].el);
  assert.equal(columns[1].children.at(-1), entries[5].el);
});

test('a reset rebuilds columns without reading discarded or freshly inserted card heights', () => {
  const { render, events, context } = fixture();
  render(true);
  assert.equal(events.some(event => event.startsWith('read:')), false);
  assert.equal(context.state().shown, 2);
  assert.equal(context.state().columns.length, 2);
  assert.ok(context.state().columns.every(column => column.children.length === 1));
});
