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
function paper(limit) {
  const state = { limit, applied: 1, layouts: 0 };
  const sheet = {
    hasAttribute: () => true,
    classList: { add() {}, toggle() {} },
    style: { setProperty(_, value) { state.applied = Number(value); } },
  };
  const scroller = {
    querySelector: () => null,
    clientHeight: 600,
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
