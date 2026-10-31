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
function paper(limit, widthLimit = Infinity, { section = true, room = null, service = false, summary = null } = {}) {
  const state = { limit, widthLimit, applied: 1, layouts: 0 };
  const sheet = {
    hasAttribute: () => true,
    classList: { add() {}, toggle() {}, contains: name => (section && name === 'section') || (service && name === 'service-showcase') || name === summary },
    closest: () => room ? { id: room } : null,
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
function bisect(limit, ceiling = 1, floor = 0.5) {
  const fits = (f) => Number(f === 1 ? '1' : f.toFixed(4)) <= limit;
  if (fits(ceiling)) return ceiling;
  let low = floor, high = ceiling;
  if (fits(low)) for (let step = 0; step < 7; step += 1) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid; }
  return low;
}

const fitWindow = { innerHeight: 720 };
const fitPaper = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: fitWindow });
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

test('all section content shrinks continuously with viewport height even when it fits', () => {
  const viewport = { innerHeight: 720 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const { sheet, scroller, state } = paper(1.2);
  for (const height of [720, 660, 600, 480, 360, 240, 600, 900]) {
    viewport.innerHeight = height;
    fit(sheet, scroller);
    assert.equal(state.applied, Number(Math.min(1, Math.max(0.5, height / 720)).toFixed(4)), `${height}px window`);
  }
});

test('a changing viewport ceiling performs a fresh fit search and restores warm fitting', () => {
  const viewport = { innerHeight: 720 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const { sheet, scroller, state } = paper(0.71);
  for (const height of [720, 576, 648, 432, 720]) {
    viewport.innerHeight = height;
    const ceiling = Math.min(1, Math.max(0.5, height / 720));
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(state.limit, ceiling).toFixed(4)), `${height}px cold fit`);
    state.layouts = 0;
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(state.limit, ceiling).toFixed(4)), `${height}px warm fit`);
    assert.equal(state.layouts, state.limit >= ceiling ? 1 : 2, 'a settled fit avoids an unnecessary full search');
  }
});

test('the shared viewport scale is used for sections while heroes retain their intrinsic fitting', () => {
  const viewport = { innerHeight: 720, __bqViewportScale: 0.75 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const section = paper(1.2), hero = paper(1.2, Infinity, { section: false });
  fit(section.sheet, section.scroller);
  fit(hero.sheet, hero.scroller);
  assert.equal(section.state.applied, 0.75);
  assert.equal(hero.state.applied, 1);
  viewport.__bqViewportScale = undefined;
  viewport.innerHeight = 432;
  fit(section.sheet, section.scroller);
  assert.equal(section.state.applied, 0.6, 'the height fallback agrees with the shared scale');
});

test('short viewport content that exceeds the minimum remains at the readable floor for the reading fallback', () => {
  const viewport = { innerHeight: 240 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const { sheet, scroller, state } = paper(0.4);
  fit(sheet, scroller);
  assert.equal(state.applied, 0.5);
  assert.ok(scroller.scrollHeight > scroller.clientHeight, 'the measurement still exposes the remainder to the reading track');
});

test('portrait phone room chapters shrink to fit like the hero instead of opening an inner scroller', () => {
  const viewport = { innerWidth: 390, innerHeight: 844 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  for (const room of ['blog', 'bio', 'contact']) {
    const { sheet, scroller, state } = paper(0.6, Infinity, { room });
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(0.6).toFixed(4)), `${room} scales until the copy fits`);
    assert.ok(scroller.scrollHeight <= scroller.clientHeight, `${room} has no inner reading remainder`);
    state.layouts = 0;
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(0.6).toFixed(4)), `${room} keeps that fit after a re-measure`);
    assert.equal(state.layouts, 2);
  }
});

test('portrait room chapters follow the viewport ceiling and shrink only until the copy fits', () => {
  const viewport = { innerWidth: 390, innerHeight: 600, __bqViewportScale: 0.75 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const { sheet, scroller, state } = paper(0.9, Infinity, { room: 'bio' });
  fit(sheet, scroller);
  assert.equal(state.applied, Number(bisect(0.9, 0.75).toFixed(4)));
  assert.ok(scroller.scrollHeight <= scroller.clientHeight);
  viewport.innerHeight = 680;
  fit(sheet, scroller);
  assert.equal(state.applied, Number(bisect(0.9, 0.75).toFixed(4)), 'mobile browser chrome changes do not change the stable scale');
  viewport.__bqViewportScale = 0.6;
  fit(sheet, scroller);
  assert.equal(state.applied, 0.6, 'an actual viewport ceiling change scales the complete chapter');
});

test('services retain their authored scale and expose genuine overflow on phones, tablets, desktop and landscape', () => {
  for (const viewport of [
    { innerWidth: 390, innerHeight: 844, __bqViewportScale: 1 },
    { innerWidth: 320, innerHeight: 568, __bqViewportScale: 568 / 720 },
    { innerWidth: 1024, innerHeight: 1366, __bqViewportScale: 1 },
    { innerWidth: 1280, innerHeight: 900, __bqViewportScale: 1 },
    { innerWidth: 740, innerHeight: 430, __bqViewportScale: 430 / 720 },
    { innerWidth: 1440, innerHeight: 500, __bqViewportScale: 500 / 720 },
  ]) {
    const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
    const { sheet, scroller, state } = paper(0.4, Infinity, { room: 'design', service: true });
    const expected = Number(viewport.__bqViewportScale.toFixed(4));
    fit(sheet, scroller);
    assert.equal(state.applied, expected, `${viewport.innerWidth}px retains the compact authored service size`);
    assert.ok(scroller.scrollHeight > scroller.clientHeight, 'long copy remains reachable through the existing native reading track');
    viewport.innerHeight += 60;
    fit(sheet, scroller);
    assert.equal(state.applied, expected, 'browser toolbar movement does not shrink the service text again');
  }
});

test('services still fit excess width without squeezing away vertical reading content', () => {
  const viewport = { innerWidth: 1024, innerHeight: 768, __bqViewportScale: 1 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  const { sheet, scroller, state } = paper(0.4, 0.8, { room: 'design', service: true });
  for (const widthLimit of [0.8, 0.8, 0.92, 1.2]) {
    state.widthLimit = widthLimit;
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(widthLimit).toFixed(4)));
    assert.ok(scroller.scrollWidth <= scroller.clientWidth, 'the content stays inside its card width');
    assert.ok(scroller.scrollHeight > scroller.clientHeight, 'remaining height stays readable instead of being shrunk away');
  }
});

test('phone room chapters and brief summaries fit their paper', () => {
  const viewport = { innerWidth: 320, innerHeight: 568, __bqViewportScale: 568 / 720 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  for (const [room, summary] of [
    ['contact', 'contact-reach-sheet'], ['blog', 'blog-subscribe-sheet'], ['bio', 'bio-education-sheet'],
  ]) {
    const brief = paper(0.72, Infinity, { room, summary });
    const long = paper(0.55, Infinity, { room });
    fit(brief.sheet, brief.scroller);
    fit(long.sheet, long.scroller);
    const ceiling = viewport.__bqViewportScale;
    assert.equal(brief.state.applied, Number(bisect(0.72, ceiling).toFixed(4)), summary);
    assert.ok(brief.scroller.scrollHeight <= brief.scroller.clientHeight, `${summary} has no unnecessary inner reading distance`);
    assert.equal(long.state.applied, Number(bisect(0.55, ceiling).toFixed(4)), `${room} long copy scales until it fits`);
    assert.ok(long.scroller.scrollHeight <= long.scroller.clientHeight);
  }
});

test('biography chapters fit their own paper on a portrait phone', () => {
  const viewport = { innerWidth: 428, innerHeight: 926, __bqViewportScale: 1 };
  const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: viewport });
  for (const summary of [
    'bio-kit-sheet', 'bio-record-sheet', 'bio-education-sheet', 'bio-honors-sheet',
    'bio-world-sheet', 'bio-connect-sheet', 'bio-docs-sheet',
    'bio-story-sheet', 'bio-proof-sheet',
  ]) {
    const chapter = paper(0.91, Infinity, { room: 'bio', summary });
    fit(chapter.sheet, chapter.scroller);
    assert.equal(chapter.state.applied, Number(bisect(0.91, 1, 0.5).toFixed(4)), summary);
    assert.ok(chapter.scroller.scrollHeight <= chapter.scroller.clientHeight, `${summary} removes overflow`);
    chapter.state.layouts = 0;
    fit(chapter.sheet, chapter.scroller);
    assert.equal(chapter.state.layouts, 2, `${summary} keeps the warm fit efficient`);
    chapter.state.limit = 0.7;
    fit(chapter.sheet, chapter.scroller);
    assert.equal(chapter.state.applied, Number(bisect(0.7).toFixed(4)), `${summary} shrinks with the copy`);
    assert.ok(chapter.scroller.scrollHeight <= chapter.scroller.clientHeight, `${summary} still has no inner scroller`);
  }
});

test('compact biography papers fit independently and never shrink the long story through its fit group', () => {
  const groupStart = main.indexOf('        // Certificates and compact biography directories fit independently;');
  const groupEnd = main.indexOf('      } else {', groupStart);
  assert.ok(groupStart >= 0 && groupEnd > groupStart);
  for (const className of [
    'bio-education-sheet', 'bio-proof-sheet', 'bio-story-sheet', 'bio-record-sheet',
    'bio-kit-sheet', 'bio-honors-sheet', 'bio-world-sheet', 'bio-connect-sheet', 'bio-docs-sheet',
  ]) {
    const sheet = { dataset: { paperFitGroup: 'bio' }, classList: { contains: name => name === className } };
    vm.runInNewContext(`${source}\n${main.slice(groupStart, groupEnd)}`, { sheet, id: 'bio', WeakMap });
    assert.equal(sheet.dataset.paperFitGroup, className === 'bio-story-sheet' ? 'bio' : undefined);
  }
});

test('desktop, landscape, homepage and hero content retain measured fitting', () => {
  for (const fixture of [
    { viewport: { innerWidth: 1280, innerHeight: 900 }, room: 'blog', section: true },
    { viewport: { innerWidth: 740, innerHeight: 430 }, room: 'contact', section: true },
    { viewport: { innerWidth: 390, innerHeight: 844 }, room: 'design', section: true },
    { viewport: { innerWidth: 390, innerHeight: 844 }, room: null, section: true },
    { viewport: { innerWidth: 390, innerHeight: 844 }, room: 'bio', section: false },
  ]) {
    const fit = vm.runInNewContext(`${source}\nfitPaper;`, { WeakMap, window: fixture.viewport });
    const { sheet, scroller, state } = paper(0.7, Infinity, fixture);
    const ceiling = fixture.section ? Math.min(1, Math.max(0.5, fixture.viewport.innerHeight / 720)) : 1;
    fit(sheet, scroller);
    assert.equal(state.applied, Number(bisect(0.7, ceiling).toFixed(4)), JSON.stringify(fixture));
    assert.ok(scroller.scrollHeight <= scroller.clientHeight, 'existing fitting still contains the copy');
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
    WeakMap, Map, root, sheets: [hero.sheet], terminalSheet: terminal.sheet, serviceSequences: new WeakMap(),
    window: { innerWidth: 1280, innerHeight: 720 },
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
