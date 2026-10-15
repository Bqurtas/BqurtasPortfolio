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
  const start = main.indexOf('  const signalPaperShellReady = () => {');
  const end = main.indexOf('\n  /* The portfolio gallery', start);
  assert.ok(start >= 0 && end > start);
  const root = { dataset: {} };
  const link = { sheet: null };
  const events = [];
  const window = { dispatchEvent: event => events.push(event.type) };
  const context = {
    window,
    shellDomReady: false,
    document: { documentElement: root, getElementById: () => link },
    CustomEvent: class { constructor(type) { this.type = type; } },
  };
  const signal = vm.runInNewContext(`${main.slice(start, end)}\nsignalPaperShellReady;`, context);
  signal();
  assert.deepEqual(events, []);
  assert.equal(root.dataset.bqShellReady, undefined);
  link.sheet = {};
  signal();
  assert.deepEqual(events, [], 'a later deferred script can still delay the DOM initialization');
  context.shellDomReady = true;
  signal();
  signal();
  assert.deepEqual(events, ['bq:shell-ready']);
  assert.equal(root.dataset.bqShellReady, '1');
  assert.equal(window.__bqShellReady, true);
  assert.match(main, /if \(hasMeasured\) signalPaperShellReady\(\);/,
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
