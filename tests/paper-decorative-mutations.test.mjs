import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('    const mutationObserver = typeof MutationObserver');
const end = main.indexOf('\n\n    sheets.forEach(', start);
assert.ok(start >= 0 && end > start, 'The actual paper mutation observer declaration exists');
const observerSource = main.slice(start, end);

function element(classes = '', parentElement = null) {
  const names = new Set(classes.split(/\s+/).filter(Boolean));
  const node = {
    nodeType: 1, parentElement,
    classList: { contains: name => names.has(name) },
    closest(selectors) {
      const wanted = selectors.split(',').map(selector => selector.trim().replace(/^\./, ''));
      for (let current = this; current; current = current.parentElement) {
        if (wanted.some(name => current.classList?.contains(name))) return current;
      }
      return null;
    },
  };
  return node;
}

function mutation(target, addedNodes = [], removedNodes = []) {
  return { type: 'childList', target, addedNodes, removedNodes };
}

function fixture() {
  let callback = null, measurements = 0;
  const observed = [];
  const context = {
    MutationObserver: class { constructor(handler) { callback = handler; } },
    resizeObserver: { observe: node => observed.push(node) },
    queueMeasure: () => { measurements++; },
  };
  vm.runInNewContext(observerSource, context);
  assert.equal(typeof callback, 'function');
  return {
    deliver: records => callback(records), observed,
    get measurements() { return measurements; },
  };
}

test('hero print insertion, image readiness and detached-print removal do not refit the deck', () => {
  const f = fixture();
  const paper = element('paper-scroll');
  const trail = element('hero-work-trail', paper);
  const print = element('hero-work-print', trail);
  const image = element('', print);
  const detachedPrint = element('hero-work-print');
  f.deliver([
    mutation(trail, [print]),
    mutation(print, [image]),
    mutation(trail, [], [detachedPrint]),
  ]);
  assert.equal(f.measurements, 0, 'Decorative work has no effect on paper flow or gallery geometry');
  assert.deepEqual(f.observed, [], 'Transient decorative nodes never become resize targets');
});

test('hero counter and translated hint text changes do not refit the deck', () => {
  const f = fixture();
  const paper = element('paper-scroll');
  const folio = element('hero-work-folio', paper);
  const counter = element('hero-work-folio-counter', folio);
  const discover = element('hero-work-discover', paper);
  const hint = element('hero-work-discover-copy', discover);
  const text = parentElement => ({ nodeType: 3, parentElement });
  f.deliver([
    mutation(counter, [text(counter)], [text(null)]),
    mutation(hint, [text(hint)], [text(null)]),
  ]);
  assert.equal(f.measurements, 0);
  assert.deepEqual(f.observed, []);
});

test('real gallery and recent-work content changes still request one paper measurement per delivery', () => {
  const f = fixture();
  const galleryPaper = element('paper-scroll');
  const grid = element('grid', galleryPaper);
  const card = element('card', grid);
  const recentPaper = element('paper-scroll');
  const stage = element('recent-stage', recentPaper);
  const art = element('recent-art', stage);
  f.deliver([mutation(grid, [card]), mutation(stage, [art])]);
  assert.equal(f.measurements, 1, 'A content batch schedules one fit, retaining dynamic gallery and exhibition updates');
  assert.deepEqual(f.observed, [], 'Nested artwork does not add redundant direct-child resize observers');
});

test('mixed decorative and authored mutations retain observation of real direct paper children', () => {
  const f = fixture();
  const paper = element('paper-scroll');
  const trail = element('hero-work-trail', paper);
  const print = element('hero-work-print', trail);
  const authored = element('recent-shell', paper);
  const spacer = element('paper-reading-spacer', paper);
  f.deliver([
    mutation(trail, [print]),
    mutation(paper, [authored, spacer]),
  ]);
  assert.equal(f.measurements, 1);
  assert.deepEqual(f.observed, [authored], 'New authored content keeps its resize observation; breathing spacers do not');
});
