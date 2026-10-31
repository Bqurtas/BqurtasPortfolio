import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
const start = html.indexOf('(function viewportPaperFrame() {');
const end = html.indexOf('\n    }());', start) + '\n    }());'.length;
assert.ok(start > 0 && end > start);
const source = html.slice(start, end);

function target() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) { (handlers.get(type) || handlers.set(type, []).get(type)).push(handler); },
    fire(type) { for (const handler of handlers.get(type) || []) handler({ type }); },
  };
}

function fixture({ width = 390, height = 700, smallHeight = height, visualViewport = true, resizeObserver = true } = {}) {
  const frames = new Map(), changes = [], writes = [], properties = new Map();
  const cssViewport = { height: smallHeight, reads: 0 };
  const observers = [];
  let id = 0;
  const view = visualViewport ? { ...target(), width, height, scale: 1 } : undefined;
  const query = target();
  const window = {
    ...target(), innerWidth: width, innerHeight: height, visualViewport: view,
    matchMedia: () => query,
    dispatchEvent(event) {
      changes.push({ type: event.type, frame: this.__bqPaperViewport && { ...this.__bqPaperViewport }, css: properties.get('--bq-frame-height') });
      this.fire(event.type);
    },
  };
  Object.defineProperty(query, 'matches', { get: () => window.innerWidth <= 820 });
  const probe = {
    style: {}, setAttribute() {},
    getBoundingClientRect() { cssViewport.reads++; return { height: cssViewport.height }; },
  };
  const body = { appendChild: node => assert.equal(node, probe) };
  const document = {
    ...target(), readyState: 'loading', activeElement: null,
    documentElement: {
      appendChild: node => assert.equal(node, probe),
      style: {
        setProperty(name, value) { writes.push([name, value]); properties.set(name, value); },
        removeProperty(name) { writes.push([name, null]); properties.delete(name); },
      },
    },
    createElement(tag) { assert.equal(tag, 'span'); return probe; },
    get body() {
      assert.notEqual(this.readyState, 'loading', 'the first frame must not wait for or measure the document body');
      return body;
    },
  };
  vm.runInNewContext(source, {
    window, document,
    CustomEvent: class { constructor(type) { this.type = type; } },
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    ResizeObserver: resizeObserver ? class {
      constructor(callback) { observers.push(callback); }
      observe(node) { assert.equal(node, probe); }
    } : undefined,
  });
  return {
    window, document, view, query, frames, changes, writes, properties, cssViewport, probe,
    domReady() { document.readyState = 'interactive'; document.fire('DOMContentLoaded'); },
    resizeSmallViewport(height) {
      cssViewport.height = height;
      observers.forEach(callback => callback([{ contentRect: { height } }]));
    },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
  };
}

test('the phone paper gets a measured frame synchronously before DOM readiness', () => {
  const page = fixture();
  assert.equal(page.document.readyState, 'loading');
  assert.equal(page.frames.size, 1, 'the first sample is followed by bounded layout reconciliation');
  assert.equal(page.properties.get('--bq-frame-height'), '700px');
  assert.deepEqual(page.changes, [{ type: 'bq:frame-resize', frame: { width: 390, height: 700 }, css: '700px' }],
    'the event is delivered only after both state and CSS have the same dimensions');
});

test('a cold visual viewport cannot shorten the paper below the CSS small viewport', () => {
  const page = fixture({ height: 500, smallHeight: 750 });
  assert.equal(page.properties.get('--bq-frame-height'), '750px');
  assert.equal(page.window.__bqPaperViewport.height, 750);
  assert.match(page.probe.style.cssText, /height:100svh/);
  assert.doesNotMatch(page.probe.style.cssText, /height:100vh/,
    'the expanded-toolbar bound must not reserve the larger collapsed-toolbar frame');
});

test('a viewport that settles without a resize event is reconciled in the first two frames', () => {
  const page = fixture({ height: 500 });
  page.view.height = page.cssViewport.height = 750;
  page.paint();
  assert.equal(page.properties.get('--bq-frame-height'), '750px');
  page.view.height = page.cssViewport.height = 780;
  page.paint();
  assert.equal(page.properties.get('--bq-frame-height'), '780px');
  assert.equal(page.frames.size, 0, 'startup sampling stops after two animation frames');
  page.paint();
  assert.equal(page.frames.size, 0);
});

test('DOM and shell preparation refresh a late viewport before fitting and reveal', () => {
  const page = fixture({ height: 500 });
  page.paint(); page.paint();
  page.view.height = page.cssViewport.height = 750;
  page.domReady();
  assert.equal(page.properties.get('--bq-frame-height'), '750px', 'DOM readiness needs no resize event');
  page.view.height = page.cssViewport.height = 780;
  page.window.fire('bq:shell-prepare');
  assert.equal(page.properties.get('--bq-frame-height'), '780px', 'preparation updates the frame before fitting');
  page.view.height = page.cssViewport.height = 800;
  page.window.fire('bq:shell-ready');
  assert.equal(page.properties.get('--bq-frame-height'), '780px', 'revealing the fitted shell cannot mutate its frame');
  page.window.fire('bq:shell-prepare');
  assert.equal(page.properties.get('--bq-frame-height'), '800px', 'a pending second fit can refresh again');
  assert.equal(page.frames.size, 0, 'readiness does not start ongoing polling');
});

test('the stable CSS bound rejects anomalous shrink but follows a genuine viewport reduction', () => {
  const page = fixture({ height: 780, smallHeight: 700 });
  page.paint(); page.paint();
  page.view.height = 500;
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 700, 'a short visual reading cannot open a black lower gap');
  page.resizeSmallViewport(500); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 500, 'a real CSS viewport resize can make the frame shorter');
});

test('toolbar tracking uses the cached small viewport without recurring layout reads', () => {
  const page = fixture();
  page.paint(); page.paint();
  const settledReads = page.cssViewport.reads;
  for (const height of [720, 750, 780, 760, 730, 700]) {
    page.view.height = height;
    page.view.fire('resize'); page.paint();
    assert.equal(page.window.__bqPaperViewport.height, height);
  }
  assert.equal(page.cssViewport.reads, settledReads);
});

test('browsers without a resize observer still refresh the CSS bound on resize', () => {
  const page = fixture({ resizeObserver: false });
  page.paint(); page.paint();
  page.view.height = page.cssViewport.height = 600;
  page.window.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 600);
});

test('unsupported small viewport units retain visual viewport sizing', () => {
  const page = fixture({ smallHeight: 0 });
  assert.equal(page.window.__bqPaperViewport.height, 700);
  page.view.height = 650;
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 650);
});

test('toolbar visual-height updates share one paint while innerHeight remains stale', () => {
  const page = fixture();
  for (const height of [711, 720, 738, 760, 784.4]) {
    page.view.height = height;
    page.view.fire('resize');
    page.window.fire('resize');
  }
  assert.equal(page.frames.size, 1);
  assert.equal(page.changes.length, 1, 'no layout is published inside the resize burst');
  page.paint();
  assert.equal(page.window.innerHeight, 700);
  assert.equal(page.window.__bqPaperViewport.height, 784);
  assert.equal(page.properties.get('--bq-frame-height'), '784px');
  assert.equal(page.changes.length, 2);
});

test('unchanged and subpixel viewport noise causes no style write or layout event', () => {
  const page = fixture();
  for (let i = 0; i < 15; i++) {
    page.view.height = 700.4;
    page.window.innerWidth = 390.2;
    page.view.fire('resize');
    page.window.fire('pageshow');
    page.query.fire('change');
    page.paint();
  }
  assert.equal(page.writes.length, 1);
  assert.equal(page.changes.length, 1);
});

test('pinch zoom never shrinks the page frame and normal toolbar tracking resumes afterward', () => {
  const page = fixture();
  Object.assign(page.view, { scale: 2, width: 195, height: 350 });
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 700);
  assert.equal(page.changes.length, 1);
  Object.assign(page.view, { scale: 1, width: 390, height: 780 });
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 780);
  assert.equal(page.changes.length, 2);
});

test('editing freezes the paper until blur and the closing keyboard have recovered', () => {
  const page = fixture();
  page.document.activeElement = { tagName: 'INPUT', type: 'text', matches: () => true };
  page.view.height = 390;
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 700);
  page.document.activeElement = null;
  page.document.fire('focusout'); page.paint();
  assert.equal(page.changes.length, 1, 'blur alone cannot shrink the paper while the keyboard is still visible');
  page.view.height = 520;
  page.view.fire('resize'); page.paint();
  assert.equal(page.changes.length, 1, 'the middle of the closing animation remains frozen');
  page.view.height = 700;
  page.view.fire('resize'); page.paint();
  assert.equal(page.changes.length, 1, 'restoring the same frame is a no-op');
  page.view.height = 780;
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 780, 'later browser-toolbar movement is no longer frozen');
});

test('phone rotation changes the frame even when a form field is focused', () => {
  const page = fixture();
  page.document.activeElement = { tagName: 'TEXTAREA', matches: () => true };
  page.view.height = 400;
  page.view.fire('resize'); page.paint();
  page.window.innerWidth = 780;
  page.cssViewport.height = 360;
  Object.assign(page.view, { width: 780, height: 360 });
  page.window.fire('orientationchange'); page.view.fire('resize');
  assert.equal(page.frames.size, 1);
  page.paint();
  assert.deepEqual({ ...page.window.__bqPaperViewport }, { width: 780, height: 360 });
});

for (const type of ['checkbox', 'radio', 'file', 'color', 'range', 'submit']) {
  test(`a focused ${type} input cannot freeze the paper while browser controls retract`, () => {
    const page = fixture();
    // These are still input elements, but none opens a text keyboard.
    page.document.activeElement = { tagName: 'INPUT', type, matches: () => true };
    for (const height of [744, 780]) {
      page.view.height = height;
      page.view.fire('resize'); page.paint();
      assert.equal(page.window.__bqPaperViewport.height, height);
      assert.equal(page.properties.get('--bq-frame-height'), `${height}px`);
    }
    assert.equal(page.changes.length, 3);
  });
}

test('editable content inherits the keyboard guard even when focus is on its nested element', () => {
  const page = fixture();
  page.document.activeElement = { tagName: 'SPAN', isContentEditable: true, matches: () => false };
  page.view.height = 390;
  page.view.fire('resize'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 700);
  assert.equal(page.changes.length, 1);
});

test('leaving the phone breakpoint removes its frame and returning publishes a fresh measurement', () => {
  const page = fixture();
  page.window.innerWidth = 1024;
  page.query.fire('change'); page.window.fire('orientationchange'); page.paint();
  assert.equal(page.window.__bqPaperViewport, null);
  assert.equal(page.properties.has('--bq-frame-height'), false);
  assert.equal(page.changes.length, 2);
  page.window.fire('resize'); page.paint();
  assert.equal(page.changes.length, 2, 'desktop resize does not repeatedly remove an absent frame');
  page.window.innerWidth = 390;
  page.view.height = 810;
  page.query.fire('change'); page.paint();
  assert.equal(page.window.__bqPaperViewport.height, 810);
  assert.equal(page.properties.get('--bq-frame-height'), '810px');
});

test('desktop cold loads keep CSS sizing, and browsers without visualViewport use innerHeight', () => {
  const desktop = fixture({ width: 1200 });
  assert.equal(desktop.writes.length, 0);
  assert.equal(desktop.changes.length, 0);
  const fallback = fixture({ visualViewport: false });
  fallback.window.innerHeight = 780;
  fallback.window.fire('resize'); fallback.paint();
  assert.equal(fallback.window.__bqPaperViewport.height, 780);
});
