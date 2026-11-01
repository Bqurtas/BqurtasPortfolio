import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
const polish = await readFile(new URL('../preview_site/css/polish.css', import.meta.url), 'utf8');
const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const loaderStart = html.indexOf("      var link = document.getElementById('bqFullCss');");
const scriptStart = html.lastIndexOf('<script>', loaderStart) + '<script>'.length;
const loader = html.slice(scriptStart, html.indexOf('</script>', loaderStart));
assert.ok(loaderStart > 0);

function startup(route = 'home', shellAlreadyReady = false) {
  const classes = new Set(['bq-css-pending', ...(route === 'home' ? [] : ['bq-direct-route'])]);
  const root = {
    dataset: { initialRoute: route, ...(shellAlreadyReady ? { bqShellReady: '1' } : {}) },
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
    },
  };
  const documentListeners = {}, windowListeners = {}, linkListeners = {};
  const attrs = new Map([['href', 'css/style.v417.min.css'], ['data-href', 'css/style.v417.min.css'], ['as', 'style']]);
  const link = {
    rel: 'preload', sheet: null,
    getAttribute: name => attrs.get(name),
    setAttribute: (name, value) => attrs.set(name, value),
    removeAttribute: name => attrs.delete(name),
    addEventListener: (name, fn) => (linkListeners[name] ||= []).push(fn),
  };
  const document = {
    documentElement: root, readyState: 'loading',
    getElementById: id => id === 'bqFullCss' ? link : null,
    addEventListener: (name, fn) => (documentListeners[name] ||= []).push(fn),
  };
  const dispatches = [];
  const fire = (listeners, name) => listeners[name]?.forEach(fn => fn());
  const window = {
    addEventListener: (name, fn) => (windowListeners[name] ||= []).push(fn),
    dispatchEvent(event) { dispatches.push(event.type); fire(windowListeners, event.type); },
    requestAnimationFrame() { assert.fail('stylesheet application must not wait for a first-paint animation frame'); },
  };
  let now = 0;
  const timers = [];
  vm.runInNewContext(loader, {
    window, document,
    CustomEvent: class { constructor(type) { this.type = type; } },
    setTimeout: (fn, delay = 0) => timers.push({ fn, at: now + delay }),
  });
  return {
    classes, root, link, dispatches,
    domReady() { document.readyState = 'interactive'; fire(documentListeners, 'DOMContentLoaded'); },
    stylesheetReady() { link.sheet = {}; fire(linkListeners, 'load'); },
    stylesheetError() { fire(linkListeners, 'error'); },
    shellReady() { root.dataset.bqShellReady = '1'; fire(windowListeners, 'bq:shell-ready'); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        if (!timers.length || timers[0].at > end) break;
        const timer = timers.shift();
        now = timer.at;
        timer.fn();
      }
      now = end;
    },
  };
}

test('a cold homepage waits for its measured paper shell after CSS arrives', () => {
  const page = startup();
  assert.equal(page.link.rel, 'stylesheet', 'the base sheet applies before a legacy critical-only frame can paint');
  page.stylesheetReady();
  assert.ok(page.classes.has('bq-css-pending'));
  page.domReady();
  page.advance(120);
  assert.ok(page.classes.has('bq-css-pending'), 'DOMContentLoaded alone does not mean paper fitting has completed');
  page.shellReady();
  assert.equal(page.classes.has('bq-css-pending'), false);
  assert.ok(page.classes.has('bq-css-ready'));
  page.stylesheetReady();
  page.advance(8000);
  assert.deepEqual(page.dispatches, ['bq:css-ready'], 'observers receive one final layout event');
});

test('shell-first and already-ready startup orders still wait for the stylesheet', () => {
  for (const readyBeforeLoader of [false, true]) {
    const page = startup('home', readyBeforeLoader);
    if (!readyBeforeLoader) page.shellReady();
    assert.ok(page.classes.has('bq-css-pending'));
    page.stylesheetReady();
    assert.ok(page.classes.has('bq-css-ready'));
  }
});

test('the measured paper shell announces readiness once, after DOM setup and its stylesheet', () => {
  const start = main.indexOf('  const signalPaperShellReady = (measuredRevision) => {');
  const end = main.indexOf('\n  /* The portfolio gallery', start);
  assert.ok(start >= 0 && end > start);
  const root = { dataset: {} };
  const link = { sheet: null };
  const events = [];
  const window = { dispatchEvent: event => events.push(event.type) };
  const context = {
    window,
    shellDomReady: false,
    shellFontsReady: false,
    shellRevision: 0,
    document: { documentElement: root, getElementById: () => link },
    CustomEvent: class { constructor(type) { this.type = type; } },
  };
  const signal = vm.runInNewContext(`${main.slice(start, end)}\nsignalPaperShellReady;`, context);
  signal(0);
  assert.deepEqual(events, []);
  assert.equal(root.dataset.bqShellReady, undefined);
  link.sheet = {};
  signal(0);
  assert.deepEqual(events, [], 'a later deferred script can still delay the DOM initialization');
  context.shellDomReady = true;
  signal(0);
  assert.deepEqual(events, [], 'fallback-font geometry is not a ready initial shell');
  context.shellFontsReady = true;
  context.shellRevision = 1;
  signal(0);
  assert.deepEqual(events, [], 'font or viewport readiness invalidates an earlier measurement');
  signal(1);
  signal(1);
  assert.deepEqual(events, ['bq:shell-ready']);
  assert.equal(root.dataset.bqShellReady, '1');
  assert.equal(window.__bqShellReady, true);
  assert.match(main, /if \(hasMeasured\) signalPaperShellReady\(measuredShellRevision\);/,
    'the visible-shell handshake follows the first measured render');
});

test('direct room routes release only after their requested shell is measured', () => {
  for (const route of ['design', 'blog', 'bio', 'contact']) {
    const page = startup(route);
    page.stylesheetReady();
    page.domReady();
    assert.ok(page.classes.has('bq-direct-route'), route);
    page.advance(120);
    assert.ok(page.classes.has('bq-direct-route'), route);
    page.shellReady();
    assert.equal(page.classes.has('bq-direct-route'), false, route);
    assert.equal(page.classes.has('bq-css-pending'), false, route);
  }
});

test('a failed core bundle and a stalled stylesheet both have bounded recovery', () => {
  const missingCore = startup();
  missingCore.stylesheetReady();
  missingCore.advance(2000);
  assert.ok(missingCore.classes.has('bq-css-pending'), 'recovery does not race body parsing');
  missingCore.domReady();
  missingCore.advance(1499);
  assert.ok(missingCore.classes.has('bq-css-pending'));
  missingCore.advance(1);
  assert.ok(missingCore.classes.has('bq-shell-timeout'));
  assert.ok(missingCore.classes.has('bq-css-ready'));

  const missingDirectCore = startup('bio');
  missingDirectCore.stylesheetReady();
  missingDirectCore.domReady();
  missingDirectCore.advance(699);
  assert.ok(missingDirectCore.classes.has('bq-direct-route'));
  missingDirectCore.advance(1);
  assert.ok(missingDirectCore.classes.has('bq-css-ready'));

  const stalledSheet = startup();
  stalledSheet.advance(8000);
  assert.ok(stalledSheet.classes.has('bq-css-timeout'));
  assert.equal(stalledSheet.classes.has('bq-css-pending'), false);

  const failedSheet = startup('contact');
  failedSheet.stylesheetError();
  failedSheet.shellReady();
  assert.ok(failedSheet.classes.has('bq-css-error'));
  assert.ok(failedSheet.classes.has('bq-css-ready'));
});

test('a slow core can take over after the initial fallback without hiding or re-revealing the page', () => {
  const page = startup();
  page.stylesheetReady();
  page.advance(8000);
  assert.ok(page.classes.has('bq-css-timeout'));
  assert.equal(page.classes.has('bq-css-pending'), false);
  assert.equal(page.root.dataset.bqShellReady, undefined, 'the static hero frame is usable before deferred code arrives');
  page.domReady();
  page.shellReady();
  page.advance(2000);
  assert.equal(page.root.dataset.bqShellReady, '1', 'late measured geometry can retire the native fallback');
  assert.equal(page.classes.has('bq-css-pending'), false);
  assert.deepEqual(page.dispatches, ['bq:css-ready']);
});

function divBody(source, opening) {
  const begin = opening.index + opening[0].length;
  let depth = 1;
  for (const token of source.slice(begin).matchAll(/<\/?div\b[^>]*>/g)) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (!depth) return { body: source.slice(begin, begin + token.index), end: begin + token.index + token[0].length };
  }
  assert.fail('hero markup must have a balanced closing element');
}

test('all four room heroes have a complete paper frame before any deferred script runs', () => {
  for (const id of ['design', 'blog', 'bio', 'contact']) {
    const room = html.match(new RegExp(`<section\\b([^>]*\\bid="${id}"[^>]*)>([\\s\\S]*?)<\\/section>`));
    assert.ok(room, id);
    assert.match(room[1], /class="[^"]*\bpaper-stack\b/, `${id} has its sticky containing block before JavaScript`);
    assert.equal(/\bis-hidden\b/.test(room[1]), id !== 'design', 'static frames must preserve initial room selection');
    const hero = room[2].match(/<div\b[^>]*class="(?:hero hero-editorial|room-hero)\b[^"]*"[^>]*>/);
    assert.ok(hero, id);
    assert.match(hero[0], /\bpaper-sheet\b/);
    assert.match(hero[0], /\bdata-paper-fit\b/);
    const contents = divBody(room[2], hero).body;
    const wrapper = contents.match(/^\s*<div class="paper-scroll">/);
    assert.ok(wrapper, `${id} paints its rounded inner surface without waiting for main.js`);
    const frame = divBody(contents, wrapper);
    assert.match(frame.body, /<h1\b/, 'the readable title stays inside the frame');
    assert.match(frame.body, id === 'design' ? /id="heroPortrait"/ : /class="room-hero-return"/);
    assert.equal(contents.slice(frame.end).trim(), '', 'all hero content is in one frame, with no stray sibling');
    assert.equal((contents.match(/class="paper-scroll"/g) || []).length, 1);
    assert.doesNotMatch(contents, /class="section\b/, 'the incoming paper must remain a sibling of the hero');
  }
});

test('paper initialization reuses the pre-rendered hero surface instead of nesting or replacing it', () => {
  const start = main.indexOf('  const wrapPaperScroll = (sheet) => {');
  const end = main.indexOf('\n  const coverProgress = ', start);
  assert.ok(start > 0 && end > start);
  const wrapper = { scrollTop: 45 };
  let calls = 0;
  const sheet = {
    querySelector(selector) { assert.equal(selector, ':scope > .paper-scroll'); return wrapper; },
    appendChild() { assert.fail('late core must not create a second frame around visible content'); },
  };
  const wrap = vm.runInNewContext(`${main.slice(start, end)}\nwrapPaperScroll;`, {
    ensurePaperSpacer(actualSheet, actualWrapper) {
      assert.equal(actualSheet, sheet);
      assert.equal(actualWrapper, wrapper);
      calls++;
    },
    document: { createElement() { assert.fail('a static hero does not require a replacement wrapper'); } },
  });
  wrap(sheet);
  wrap(sheet);
  assert.equal(calls, 2);
  assert.equal(wrapper.scrollTop, 45, 'fallback reading is not reset by idempotent setup');
});

test('the initial phone frame and failure fallback do not depend on external core code', () => {
  const critical = html.match(/<style id="bqCriticalGuards">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(critical);
  assert.match(critical, /--bq-stack-sheet-h:calc\(max\(100svh,var\(--bq-frame-height,100dvh\)\)/);
  assert.match(polish, /--bq-stack-sheet-h:\s*calc\(max\(100svh,\s*var\(--bq-frame-height,\s*100dvh\)\)/,
    'the final cascade retains the same first-paint lower bound as the critical frame');
  assert.match(critical, /html:root,html:root\.bq-compact,html body :is\(#design,#blog,#bio,#contact\)\.paper-stack\{--bq-stack-top:/,
    'the early frame must override both local room and compact-root legacy heights if polish arrives late');
  assert.match(critical, /:is\(\.hero,\.room-hero\)\.paper-sheet\{position:sticky!important/);
  assert.match(critical, /\.bq-deck-edge\{display:block!important;position:fixed;[^}]*height:var\(--bq-stack-sheet-h\)/);
  assert.match(critical, /:not\(\[data-bq-shell-ready="1"\]\)[^{]+\.paper-scroll\{overflow-y:auto!important/,
    'long translated hero copy remains reachable if the measurement bundle fails, and normal setup retires that fallback');
  assert.ok(html.indexOf('id="bqCriticalGuards"') < html.indexOf('id="bqFullCss"'));
});

test('the pending gate retains paper geometry and the mobile gutter is stable before external CSS', () => {
  assert.match(html, /html\.bq-css-pending body\{visibility:hidden!important;opacity:0!important\}/,
    'descendants with explicit visibility:visible cannot escape the first-paint gate');
  assert.match(html, /html\.bq-css-pending,html\.bq-css-pending body\{background:var\(--bg,#f4f4f4\)!important\}/,
    'slow core downloads keep a theme-coloured canvas instead of flashing the dark paper underlay');
  assert.doesNotMatch(html, /html\.bq-css-pending \.main > :not\(#design\)/);
  assert.match(html, /:not\(\.bq-frame\):not\(\.bq-viewport-measure\)\{display:none!important\}/,
    'the hidden svh probe must retain its geometry while the startup gate is active');
  const critical = html.match(/<style id="bqCriticalGuards">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(critical);
  const frame = /html body > \.bq-frame\.bq-frame\.bq-frame\s*\{([^}]+)\}/;
  const normalize = source => source.replace(/\s+/g, '').replace(/;$/, '');
  assert.equal(normalize(critical.match(frame)?.[1] || ''), normalize(polish.match(frame)?.[1] || ''),
    'the critical frame must have the same geometry, colour and shadow reset as the final mobile cascade');
  assert.match(critical, /::after\{display:none!important\}/);
  assert.ok(html.indexOf('id="bqCriticalGuards"') < html.indexOf('id="bqFullCss"'));
});
