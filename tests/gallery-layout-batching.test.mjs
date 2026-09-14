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
const revealSource = section('  let portfolioRevealObserver = null;', '  const buildColumns = (n) => {');
function classList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
    toggle(name, on) { if (on) values.add(name); else values.delete(name); },
  };
}
function card() { return { isConnected: true, classList: classList(), style: { setProperty() {} } }; }
function revealFixture({ reduced = false, supported = true } = {}) {
  const frames = [], observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
  }
  const context = {
    window: supported ? { IntersectionObserver: Observer } : {}, IntersectionObserver: Observer,
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
  };
  vm.runInNewContext(revealSource + '\nglobalThis.prepare = prepPortfolioReveal;', context);
  return { prepare: context.prepare, frames, observers };
}

test('one gallery frame registers a whole batch and keeps intersection reveal behavior', () => {
  const { prepare, frames, observers } = revealFixture();
  const cards = Array.from({ length: 48 }, card);
  cards.forEach(prepare);
  assert.equal(frames.length, 1);
  assert.equal(observers.length, 0);
  assert.ok(cards.every(item => !item.classList.contains('portfolio-in')));
  cards[47].isConnected = false;
  frames[0]();
  assert.equal(observers.length, 1);
  assert.equal(observers[0].targets.size, 47, 'a card removed before the frame must not remain observed');
  assert.equal(observers[0].options.rootMargin, '0px 0px 18% 0px');
  observers[0].callback([{ target: cards[0], isIntersecting: true }, { target: cards[1], isIntersecting: false }]);
  assert.equal(cards[0].classList.contains('portfolio-in'), true);
  assert.equal(cards[1].classList.contains('portfolio-in'), false);
  assert.equal(observers[0].targets.has(cards[0]), false);
  prepare(cards[47]);
  assert.equal(frames.length, 2, 'a subsequent batch can schedule its own frame');
});

for (const mode of [{ reduced: true }, { supported: false }]) {
  test(`gallery batches retain immediate next-frame reveal with ${mode.reduced ? 'reduced motion' : 'no observer support'}`, () => {
    const { prepare, frames, observers } = revealFixture(mode);
    const cards = Array.from({ length: 48 }, card);
    cards.forEach(prepare);
    assert.equal(frames.length, 1);
    frames[0]();
    assert.ok(cards.every(item => item.classList.contains('portfolio-in')));
    assert.equal(observers.length, 0);
  });
}

test('paper measurement batches spacer reads and paints meters without further size reads', () => {
  const events = [], root = {}, spacers = [], sheets = [];
  const style = label => ({
    setProperty(name, value) { this[name] = value; events.push(`${label}:write:${name}`); },
    removeProperty(name) { delete this[name]; events.push(`${label}:remove:${name}`); },
  });
  [620, 608, 1000].forEach((height, index) => {
    const readingSpacer = { style: style(`spacer${index}`) };
    spacers.push(readingSpacer);
    const scroller = {
      dataset: {}, classList: classList(), querySelector: () => readingSpacer,
      removeAttribute() {}, setAttribute() {},
      get scrollHeight() {
        const hidden = readingSpacer.style.display === 'none';
        events.push(`${index}:${hidden ? 'natural' : 'restored'}:scrollHeight`);
        if (hidden) assert.ok(spacers.every(item => item.style.display === 'none'), 'all spacers must be hidden before any authored-size read');
        return height + (hidden ? 0 : 80);
      },
      get clientHeight() { events.push(`${index}:clientHeight`); return 600; },
      get scrollTop() { events.push(`${index}:scrollTop`); return 5; },
    };
    const meter = {
      dataset: {}, style: style(`meter${index}`),
      get clientHeight() { events.push(`${index}:meterHeight`); return 200; },
    };
    sheets.push({ parentElement: root, dataset: {}, classList: classList(), style: style(`sheet${index}`),
      querySelector: () => scroller, scroller, meter });
  });
  const meterSource = section('  const updatePaperMeter = ', '  const ensurePaperSpacer = ');
  const measurementSource = section('      const rootSheets = sheets.filter', '      /* Give the final card');
  const context = {
    sheets, root, ensurePaperMeter: sheet => sheet.meter,
    allowsInnerScroll: () => true, paperLabel: () => 'Reading section',
  };
  vm.runInNewContext(meterSource + measurementSource + '\nglobalThis.finalTailTrack = tailTrack;', context);
  assert.deepEqual(sheets.map(sheet => sheet.scroller.dataset.paperOverflow), ['20', '0', '400']);
  assert.equal(context.finalTailTrack, 400);
  assert.equal(sheets[0].meter.style['--bq-meter-h'], '171.43px', 'meter keeps its original ratio using restored scroller height');
  assert.equal(sheets[1].meter.dataset.trackHeight, undefined, 'fitting content keeps its meter inactive');
  const firstRestore = events.findIndex(event => event.endsWith(':remove:display'));
  const naturalReads = events.map((event, index) => event.includes(':natural:') ? index : -1).filter(index => index >= 0);
  assert.ok(naturalReads.every(index => index < firstRestore));
  const firstMeterWrite = events.findIndex(event => /^meter\d+:/.test(event));
  assert.ok(events.slice(firstMeterWrite).every(event => !/:(scrollHeight|clientHeight|scrollTop|meterHeight)$/.test(event)),
    'painting meters must not force another measurement between sheets');
  assert.equal(events.filter(event => event.endsWith(':scrollHeight')).length, 5,
    'three authored-size reads plus two active-meter reads; no unused rawOverflow reads');
});
