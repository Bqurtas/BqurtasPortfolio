import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const helper = main.match(/    const portfolioEntryClip = [^\n]+;/)?.[0];
assert.ok(helper);
const clip = vm.runInNewContext(`${helper}\nportfolioEntryClip;`);

test('an entering portfolio paints only inside the shared paper frame', () => {
  for (const height of [360, 680, 824]) {
    const pin = 10;
    for (const top of [pin, pin + 1, pin + height / 2, pin + height, pin + height + 120]) {
      const inset = clip(top, pin, height);
      assert.ok(inset >= 0 && inset <= height, 'the inset stays within the card');
      const visibleHeight = height - inset;
      if (visibleHeight > 0) assert.equal(top + visibleHeight, pin + height,
        'the incoming surface ends at the current shell rim, never below it');
      else assert.ok(top >= pin + height, 'a card below the shell is fully clipped');
    }
    assert.equal(clip(pin - 100, pin, height), 0, 'a pinned or departing card is not clipped');
  }
});

const entryStart = main.indexOf('      let entryClip = 0;');
const entryEnd = main.indexOf('      let y = ', entryStart);
assert.ok(entryStart > 0 && entryEnd > entryStart);
const entry = main.slice(entryStart, entryEnd);
function frame({ cardHeight = 680, viewportHeight = 700, cachedTop = 210, actualTop = cachedTop,
  local = 10 - cachedTop, previousClip = 0, phone = true } = {}) {
  let reads = 0;
  const value = vm.runInNewContext(`${helper}\n${entry}\nentryClip;`, {
    Math, phoneEntry: { matches: phone }, g: 10, cardH: cardHeight, cardTop: cachedTop,
    local, paintedEntryClip: previousClip,
    window: { innerHeight: 700, __bqPaperViewport: { height: viewportHeight } },
    card: { getBoundingClientRect() { reads++; return { top: actualTop }; } },
  });
  return { value, reads };
}

test('settled entry uses cached geometry without a scroll-time layout read', () => {
  assert.deepEqual(frame(), { value: 200, reads: 0 });
  assert.deepEqual(frame({ cachedTop: 10, local: 200 }), { value: 0, reads: 0 });
});

test('toolbar expansion clips against the live entering card before the delayed refit', () => {
  assert.deepEqual(frame({ viewportHeight: 800, actualTop: 310 }), { value: 300, reads: 1 });
  assert.deepEqual(frame({ viewportHeight: 600, actualTop: 110 }), { value: 100, reads: 1 });
  assert.deepEqual(frame({ viewportHeight: 800, cachedTop: 10, actualTop: 70, local: 40 }),
    { value: 60, reads: 1 }, 'a taller hero can move the card back into entry while cached geometry says pinned');
});

test('a gallery already pinned through toolbar motion adds no rectangle reads', () => {
  assert.deepEqual(frame({ viewportHeight: 800, cachedTop: 10, local: 400 }), { value: 0, reads: 0 });
  assert.deepEqual(frame({ viewportHeight: 600, cachedTop: 10, local: 400 }), { value: 0, reads: 0 });
  assert.deepEqual(frame({ phone: false }), { value: 0, reads: 0 });
});

test('a viewport-only clip update leaves native-scroll preservation state untouched', () => {
  const start = main.indexOf('    const onEntryFrameResize = () => {');
  const end = main.indexOf('    const remeasure = () => {', start);
  assert.ok(start > 0 && end > start);
  let queued = 0;
  const context = {
    phoneEntry: { matches: true }, raf: 0, workMeasureFrame: 0, scrollPending: false,
    drive() {}, requestAnimationFrame() { queued++; return queued; },
  };
  const resize = vm.runInNewContext(`${main.slice(start, end)}\nonEntryFrameResize;`, context);
  resize(); resize();
  assert.equal(queued, 1, 'viewport events share one immediate paint');
  assert.equal(context.scrollPending, false, 'viewport movement must not masquerade as a user scroll');
});
