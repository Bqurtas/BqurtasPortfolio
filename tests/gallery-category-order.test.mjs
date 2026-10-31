import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = source.indexOf('  let categoryOrderSource = ');
const end = source.indexOf('  const freezeWorkTrack = ', start);
assert.ok(start >= 0 && end > start);

const entries = () => ['logo', 'official', 'video'].flatMap((cat, group) =>
  Array.from({ length: cat === 'official' ? 85 : 4 }, (_, i) => ({
    cat, type: cat === 'video' ? 'video' : 'image',
    item: { coll: cat, index: i * 3 + 1, width: 400 + i, height: 500 + group, url: `/media/${cat}/work${i}.webp` },
    el: { id: `${cat}-${i}` }
  })));

function fixture(items = entries(), random = () => 0.99999) {
  const placed = [], context = {
    window: { BQ_ALL_CARDS: items }, Math: Object.assign(Object.create(Math), { random }),
    gridEl: {}, mCols: [], mHeights: [],
    colCountForWidth: () => 2, buildColumns: () => {},
    placeCards: (batch, rank) => placed.push({ batch: [...batch], rank }),
    updateTabHeader: () => {}, updateLoadMore: () => {}
  };
  vm.runInNewContext(`
    let currentFilter = 'all', currentShown = 0;
    const PAGE_SIZE = 40;
    ${source.slice(start, end)}
    globalThis.enter = filter => { currentFilter = filter; window.__bqRenderGallery(true); };
    globalThis.order = () => matchingCards();
    globalThis.shown = () => currentShown;
  `, context);
  return { context, placed };
}

test('returning to each category starts with a different work without mixing categories or mutating work identity', () => {
  const items = entries(), original = items.map(entry => ({ entry, item: { ...entry.item }, el: entry.el }));
  const { context } = fixture(items);
  context.enter('logo');
  const firstLogo = [...context.order()];
  context.enter('official');
  const firstOfficial = [...context.order()];
  const catalogue = [...items];
  // The fixed random source deliberately produces the same shuffle. A return
  // must still visibly change, even when the random draw repeats its order.
  context.enter('logo');
  const secondLogo = [...context.order()];
  assert.notEqual(secondLogo[0], firstLogo[0]);
  assert.deepEqual(new Set(secondLogo), new Set(firstLogo));
  assert.ok(secondLogo.every(entry => entry.cat === 'logo'));
  context.enter('official');
  const secondOfficial = [...context.order()];
  assert.notEqual(secondOfficial[0], firstOfficial[0]);
  assert.deepEqual(new Set(secondOfficial), new Set(firstOfficial));
  assert.deepEqual(items, catalogue, 'return visits never shuffle the source catalogue');
  for (const before of original) {
    assert.deepEqual(before.entry.item, before.item, 'canonical index, URL and dimensions stay attached to their work');
    assert.equal(before.entry.el, before.el, 'decoded media cards remain reusable');
  }
});

test('load more and layout resets keep the current visit order and append every work exactly once', () => {
  const { context, placed } = fixture();
  context.enter('official');
  const order = [...context.order()];
  context.window.__bqRenderGallery(false);
  context.window.__bqRenderGallery(false);
  assert.deepEqual(placed.flatMap(item => item.batch), order);
  assert.deepEqual(placed.map(item => item.rank), [0, 40, 80]);
  assert.equal(new Set(placed.flatMap(item => item.batch)).size, 85);
  assert.equal(context.shown(), 85);
  context.window.__bqRenderGallery(true);
  assert.deepEqual([...context.order()], order, 'a render reset without a category change is not a new visit');
  assert.deepEqual(placed.at(-1).batch, order.slice(0, 40));
});

test('initial ordering stays reproducible and all-work revisits keep films after the still images', () => {
  const a = fixture(), b = fixture();
  a.context.enter('all'); b.context.enter('all');
  const first = [...a.context.order()];
  assert.deepEqual(first.map(entry => entry.el.id), [...b.context.order()].map(entry => entry.el.id));
  a.context.enter('logo'); a.context.enter('all');
  const returned = [...a.context.order()];
  assert.notEqual(returned[0], first[0]);
  const firstVideo = returned.findIndex(entry => entry.type === 'video');
  assert.ok(returned.slice(0, firstVideo).every(entry => entry.type === 'image'));
  assert.ok(returned.slice(firstVideo).every(entry => entry.type === 'video'));
});

test('empty, single-work and refreshed catalogues remain valid without preserving removed entries', () => {
  const only = entries()[0], { context } = fixture([only]);
  context.enter('logo'); context.enter('official');
  assert.deepEqual([...context.order()], []);
  context.enter('logo');
  assert.deepEqual([...context.order()], [only]);
  const replacement = entries().filter(entry => entry.cat === 'logo').slice(1);
  context.window.BQ_ALL_CARDS = replacement;
  context.window.__bqRenderGallery(true);
  assert.deepEqual(new Set(context.order()), new Set(replacement));
  assert.equal(context.order().includes(only), false);
});
