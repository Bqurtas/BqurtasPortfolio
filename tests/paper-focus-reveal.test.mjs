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
