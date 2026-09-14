import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
function moduleSource(name, indentation = '') {
  const start = main.indexOf(`(function ${name}() {`);
  const end = main.indexOf(`\n${indentation}})();`, start);
  assert.ok(start >= 0 && end > start, `${name} is available in the actual application`);
  return main.slice(start, end + indentation.length + 7);
}

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      const list = listeners.get(type) || [];
      list.push(callback);
      listeners.set(type, list);
    },
    fire(type, event = {}) { for (const callback of listeners.get(type) || []) callback({ type, ...event }); }
  };
}

function frames() {
  const queued = new Map();
  let id = 0;
  return {
    request(callback) { queued.set(++id, callback); return id; },
    cancel(key) { queued.delete(key); },
    flush() {
      for (let pass = 0; queued.size && pass < 10; pass++) {
        const pending = [...queued.values()];
        queued.clear();
        pending.forEach(callback => callback(16 * (pass + 1)));
      }
      assert.equal(queued.size, 0, 'scroll work should settle without a permanent animation loop');
    }
  };
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add(...items) { items.forEach(item => values.add(item)); },
    remove(...items) { items.forEach(item => values.delete(item)); },
    contains(value) { return values.has(value); },
    toggle(value, force) {
      const on = force === undefined ? !values.has(value) : force;
      if (on) values.add(value); else values.delete(value);
      return on;
    }
  };
}

function style() {
  return {
    setProperty(name, value) { this[name] = value; },
    removeProperty(name) { delete this[name]; },
    getPropertyValue(name) { return this[name] || ''; }
  };
}

test('gallery progress uses the outer sticky pin and matches its visible handoff', () => {
  const animation = frames();
  const pin = 16, height = 800;
  const starts = [0, 1000, 3000, 4500];
  const outerSheets = starts.map(start => ({
    top: `${pin}px`,
    scroller: { top: 'auto', dataset: { paperStart: String(start) } },
    querySelector() { return this.scroller; }
  }));
  const ring = { style: style() };
  const button = { ...eventTarget(), classList: classList() };
  const root = { scrollHeight: 6000, clientHeight: height };
  const document = {
    ...eventTarget(), documentElement: root, body: { dataset: { room: 'design' } },
    getElementById: id => ({ toTop: button, toTopProg: ring, design: { querySelectorAll: () => outerSheets } })[id],
    querySelector: () => null
  };
  const window = {
    ...eventTarget(), scrollY: 650, innerHeight: height, __bqTopClickBound: true,
    matchMedia: () => ({ matches: false })
  };
  vm.runInNewContext(moduleSource('globalGoUp'), {
    window, document, requestAnimationFrame: callback => animation.request(callback),
    getComputedStyle: element => ({ top: element.top, getPropertyValue: () => String(pin) })
  });

  // The incoming sheet is at y=366. Its 434px reveal occupies 434/783 of
  // the available handoff, and that handoff is one of four equal ring steps.
  const expected = (434 / 783) / 4;
  const actual = 1 - Number(ring.style.strokeDashoffset) / (2 * Math.PI * 20);
  assert.ok(Math.abs(actual - expected) < 1e-10, `expected ${expected}, received ${actual}`);

  window.scrollY = 1600;
  window.fire('scroll');
  animation.flush();
  assert.ok(Math.abs(1 - Number(ring.style.strokeDashoffset) / (2 * Math.PI * 20) - .25) < 1e-10,
    'reading a long gallery keeps the same sheet step until the next sheet arrives');
});

function workFixture() {
  const animation = frames();
  const scrollCalls = [];
  let visualShift = 0, documentTop = 1000;
  const window = {
    ...eventTarget(), scrollY: 0, innerHeight: 632, visualViewport: eventTarget(),
    matchMedia: () => ({ matches: false }),
    scrollTo(options) { scrollCalls.push(options.top); this.scrollY = options.top; }
  };
  const body = { dataset: { room: 'design' }, classList: classList() };
  const stage = { parentElement: body };
  const design = { id: 'design', parentElement: stage, classList: classList() };
  const reel = { style: style(), scrollHeight: 2600, contains: () => false };
  const viewport = { clientHeight: 600, querySelector: () => reel };
  const track = {
    dataset: {}, style: style(), parentElement: design, classList: classList(['paper-sheet', 'work']),
    nextElementSibling: { style: style(), classList: classList(['paper-sheet']) },
    getBoundingClientRect: () => ({ top: documentTop - window.scrollY + visualShift }),
    closest: () => design
  };
  const card = {
    dataset: {}, style: style(), clientHeight: 600, classList: classList(),
    parentElement: track,
    querySelector: selector => selector.includes('.work-vp') ? viewport : null,
    getBoundingClientRect: () => ({ top: Math.max(16, documentTop - window.scrollY) + visualShift })
  };
  track.querySelector = () => card;
  const document = {
    ...eventTarget(), body, documentElement: { classList: classList(), scrollHeight: 10000, clientHeight: 632 },
    querySelector: selector => selector.includes('.section.work') ? track : null,
    getElementById: id => ({ design, bqPageStage: stage })[id]
  };
  vm.runInNewContext(moduleSource('portfolioMagicScroll', '  '), {
    window, document, clamp01: value => Math.min(1, Math.max(0, value)),
    getComputedStyle: element => ({ top: element === card ? '16px' : '0px', position: 'relative' }),
    requestAnimationFrame: callback => animation.request(callback), cancelAnimationFrame: id => animation.cancel(id),
    performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout() {}
  });
  return {
    window, document, body, stage, design, track, reel, scrollCalls,
    flush: () => animation.flush(),
    requestFrame: callback => animation.request(callback),
    setVisualShift(value) { visualShift = value; },
    setDocumentTop(value) { documentTop = value; },
    scrollTo(top) { window.scrollY = top; window.fire('scroll'); animation.flush(); }
  };
}

function focusedGalleryControl({ keyboard }) {
  const page = workFixture();
  const loadMore = {
    contentTop: 1950,
    closest: selector => selector.includes('.section.work') ? page.track : null,
    matches: selector => selector === ':focus-visible' && keyboard,
    getBoundingClientRect() { return { top: this.contentTop, height: 48 }; }
  };
  page.reel.contains = target => target === loadMore;
  page.reel.getBoundingClientRect = () => ({ top: 0 });
  // Allow the complete appended gallery in the real mapper, with the reader
  // still at their old position and the button initially visible there.
  page.reel.scrollHeight = 4600;
  page.window.fire('bq:gallery-built');
  page.flush();
  page.scrollTo(2484);
  const start = main.indexOf("  document.addEventListener('focusin', (event) => {", main.indexOf('(function featuredPaperStack() {'));
  const end = main.indexOf('\n  const bindStack =', start);
  assert.ok(start >= 0 && end > start, 'the actual paper focus listener is available');
  vm.runInNewContext(main.slice(start, end), {
    window: page.window, document: page.document, requestAnimationFrame: page.requestFrame
  });
  return { page, loadMore };
}

test('pointer focus does not follow Load more after appended cards move the button', () => {
  const { page, loadMore } = focusedGalleryControl({ keyboard: false });
  page.document.fire('focusin', { target: loadMore });
  // The click appends new cards before a queued focus frame could run.
  loadMore.contentTop += 2000;
  page.flush();
  assert.equal(page.window.scrollY, 2484, 'pointer activation must keep the current gallery reading position');
  assert.deepEqual(page.scrollCalls, [], 'pointer focus must not issue a second scroll to the moved Load more button');
});

test('keyboard focus still maps an offscreen gallery control into view', () => {
  const { page, loadMore } = focusedGalleryControl({ keyboard: true });
  page.document.fire('focusin', { target: loadMore });
  loadMore.contentTop += 2000;
  page.flush();
  // Button bottom 3998 minus the viewport's safe bottom 504 gives a reel
  // offset of 3494; the work track starts at document y=984.
  assert.equal(page.window.scrollY, 4478, 'keyboard navigation must reveal its focused control');
  assert.deepEqual(page.scrollCalls, [4478]);
});

test('Load more during the end hold preserves the old images instead of jumping to the new reel end', () => {
  const page = workFixture();
  page.scrollTo(3034); // 50px into the hold after the old 2000px reel end.
  assert.equal(page.reel.style.transform, 'translate3d(0,-2000px,0)');
  const loadMore = eventTarget();
  page.window.__bqRenderGallery = () => { page.reel.scrollHeight = 4600; };
  const start = main.indexOf("  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {");
  const end = main.indexOf('\n  /* Show fewer', start);
  assert.ok(start >= 0 && end > start, 'the actual Load more click handler is available');
  vm.runInNewContext(main.slice(start, end), {
    window: page.window,
    document: { getElementById: id => id === 'loadMoreBtn' ? loadMore : null },
    clearWorkOverflowFloor() {}
  });
  loadMore.fire('click');
  page.flush();
  assert.equal(page.track.style['--work-track-h'], '5200px', 'the appended cards extend the gallery track');
  assert.equal(page.reel.style.transform, 'translate3d(0,-2000px,0)', 'the same images remain under the reader after append');
  assert.equal(page.window.scrollY, 2984, 'only the old 50px hold is released, without jumping to the new bottom');
  assert.deepEqual(page.scrollCalls, [2984]);

  page.scrollTo(3234);
  page.reel.scrollHeight = 4800;
  page.window.fire('bq:gallery-counts');
  page.flush();
  assert.equal(page.window.scrollY, 3234, 'later measurements must preserve the new reading position, not reuse the append snapshot');
  assert.equal(page.reel.style.transform, 'translate3d(0,-2250px,0)');
});

test('resetting the gallery clears a pending append reading position', () => {
  const page = workFixture();
  page.scrollTo(2484);
  page.window.__bqPrepareWorkAppend();
  page.window.__bqResetWorkReel();
  page.reel.scrollHeight = 4600;
  page.flush();
  assert.equal(page.window.scrollY, 984, 'a category reset must retain the start of the reel');
  assert.equal(page.reel.style.transform, 'translate3d(0,0px,0)');
});

test('menu transitions freeze portfolio geometry and refresh it after closure', () => {
  const page = workFixture();
  page.scrollTo(1484);
  assert.equal(page.reel.style.transform, 'translate3d(0,-500px,0)');
  page.body.classList.add('menu-open', 'menu-revealed');
  page.setVisualShift(-240);
  page.reel.scrollHeight = 3000;
  page.window.fire('resize');
  page.window.visualViewport.fire('resize');
  page.window.fire('scroll');
  page.flush();
  assert.equal(page.reel.style.transform, 'translate3d(0,-500px,0)', 'the transformed menu preview must retain its reading position');
  assert.equal(page.track.style['--work-track-h'], '3200px', 'menu geometry must not be measured during the transition');
  assert.deepEqual(page.scrollCalls, [], 'resizing the menu must not compensate for its temporary visual shift');
  page.body.classList.remove('menu-open', 'menu-revealed');
  page.body.classList.add('menu-closing');
  page.window.fire('resize');
  page.window.fire('scroll');
  page.flush();
  assert.equal(page.reel.style.transform, 'translate3d(0,-500px,0)');
  assert.equal(page.track.style['--work-track-h'], '3200px');
  assert.deepEqual(page.scrollCalls, []);
  page.body.classList.remove('menu-closing');
  page.setVisualShift(0);
  page.document.fire('bq:menu-closed');
  page.flush();
  assert.equal(page.track.style['--work-track-h'], '3600px', 'closing the menu must measure gallery content that changed while it was open');
  assert.equal(page.window.scrollY, 1484, 'closing the menu must preserve the same gallery image under the reader');
  assert.equal(page.reel.style.transform, 'translate3d(0,-500px,0)');
  page.scrollTo(1564);
  assert.equal(page.reel.style.transform, 'translate3d(0,-580px,0)', 'the reel must not retain a rectangle measured while the menu was transformed');
});

test('returning to design refreshes work offsets without waiting for a ResizeObserver', () => {
  const page = workFixture();
  page.body.dataset.room = 'bio';
  page.design.classList.add('is-hidden');
  page.reel.scrollHeight = 0;
  page.document.fire('bq:route', { detail: { room: 'bio' } });
  page.window.fire('resize');
  page.flush();
  assert.equal(page.track.style['--work-track-h'], '3200px', 'hidden route geometry must not replace the visible gallery measurement');
  page.setDocumentTop(1200);
  page.reel.scrollHeight = 3000;
  page.body.dataset.room = 'design';
  page.design.classList.remove('is-hidden');
  page.document.fire('bq:route', { detail: { room: 'design' } });
  page.flush();
  assert.equal(page.track.style['--work-track-h'], '3600px', 'route entry must measure the updated gallery height without an observer');
  page.scrollTo(1684);
  assert.equal(page.reel.style.transform, 'translate3d(0,-500px,0)', 'route entry must refresh the 200px origin change');
  page.scrollTo(3384);
  assert.equal(page.reel.style.transform, 'translate3d(0,-2200px,0)', 'new gallery content must remain reachable beyond the previous scroll limit');
});

test('footer colour writes occur only when its visible state changes', () => {
  const animation = frames();
  const writes = [], classChanges = [];
  let footerTop = 3000;
  const footer = { getBoundingClientRect: () => ({ top: footerTop }) };
  const root = { style: { setProperty(name, value) { writes.push([name, value]); } } };
  const body = { classList: { toggle(name, value) { classChanges.push([name, value]); } } };
  const document = { ...eventTarget(), documentElement: root, body, querySelector: () => footer };
  const window = { ...eventTarget(), innerHeight: 800, matchMedia: () => ({ matches: false }) };
  vm.runInNewContext(moduleSource('footerColourScene'), {
    window, document, requestAnimationFrame: callback => animation.request(callback), setTimeout: () => 1
  });
  const initialWrites = writes.length, initialClasses = classChanges.length;
  for (let index = 0; index < 20; index++) { window.fire('scroll'); animation.flush(); }
  assert.equal(writes.length, initialWrites);
  assert.equal(classChanges.length, initialClasses);
  footerTop = 624;
  window.fire('scroll'); animation.flush();
  assert.deepEqual(writes.slice(-2), [['--bq-footer-progress', '0.5000'], ['--bq-footer-mix', '50.00%']]);
  const changedWrites = writes.length, changedClasses = classChanges.length;
  window.fire('scroll'); animation.flush();
  assert.equal(writes.length, changedWrites);
  assert.equal(classChanges.length, changedClasses);
});
