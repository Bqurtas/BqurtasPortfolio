import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const enhance = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const scrollScript = html.slice(html.indexOf('<!-- Explicit go-up controls'))
  .match(/<script>([\s\S]*?)<\/script>/)[1];

function loadScrollAuthority(initialRoute) {
  const listeners = {}, calls = [];
  const root = { dataset: { initialRoute }, scrollTop: 99 };
  const window = {
    scrollTo: (...args) => calls.push(args),
    addEventListener: (type, callback) => (listeners[type] ||= []).push(callback),
  };
  vm.runInNewContext(scrollScript, {
    window, document: { documentElement: root, addEventListener() {} },
    history: {}, navigator: {}, requestAnimationFrame: callback => callback(),
    setTimeout: callback => callback(),
  });
  return { calls, root, fire: (type, event = {}) => listeners[type]?.forEach(callback => callback(event)) };
}

test('load and pageshow preserve direct portfolio routes and back-forward state', () => {
  for (const route of ['design', 'bio', 'contact', 'blog']) {
    const page = loadScrollAuthority(route);
    page.fire('load');
    page.fire('pageshow', { persisted: false });
    page.fire('pageshow', { persisted: true });
    assert.equal(page.calls.length, 0, `${route} scroll belongs to its router`);
    assert.equal(page.root.scrollTop, 99);
  }
  const restoredHome = loadScrollAuthority('home');
  restoredHome.fire('pageshow', { persisted: true });
  assert.equal(restoredHome.calls.length, 0, 'bfcache must preserve the current room');
});

test('a fresh homepage still starts at its hero', () => {
  const page = loadScrollAuthority('home');
  page.fire('load');
  page.fire('pageshow', { persisted: false });
  assert.ok(page.calls.length > 0);
  assert.equal(page.root.scrollTop, 0);
  assert.ok(page.calls.every(([options]) => options.top === 0));
});

test('initial gallery navigation waits for full CSS and runs once', () => {
  const source = main.slice(main.indexOf("  if (normalizedStartRoom === 'design') {"), main.indexOf('  routerReady = true;'));
  let pending = true, resets = 0;
  const listeners = {};
  vm.runInNewContext(source, {
    normalizedStartRoom: 'design',
    document: { body: { dataset: { room: 'design' } }, documentElement: { classList: { contains: () => pending } } },
    window: {
      addEventListener: (type, callback) => { listeners[type] = callback; },
      __bqResetWorkReel: () => { resets++; },
    },
    requestAnimationFrame: callback => callback(), setTimeout: callback => callback(),
    scrollToGridTop: () => assert.fail('the work reel owns gallery positioning'),
  });
  assert.equal(resets, 0);
  pending = false;
  listeners['bq:css-ready']();
  listeners.load();
  assert.equal(resets, 1);
});

function loadResumePolicy(path, storedAway = '1000') {
  const listeners = {}, timers = [];
  const storage = new Map([['bq_last_away_at', storedAway]]);
  let now = 86_400_000, resets = 0;
  const location = { pathname: path };
  const document = {
    hidden: false,
    addEventListener: (type, callback) => { listeners[type] = callback; },
  };
  const start = enhance.indexOf("    if ('scrollRestoration' in history)");
  const end = enhance.indexOf('    /* Some in-app browsers swallow', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(enhance.slice(start, end), {
    history: { scrollRestoration: 'auto' }, document,
    window: {
      scrollTo() {}, matchMedia: () => ({ matches: false }),
      addEventListener: (type, callback) => { listeners[type] = callback; },
      __bqResetToHomeHero: () => { resets++; location.pathname = '/'; },
    },
    sessionStorage: {
      getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    Date: { now: () => now }, setAppVhSoon() {},
    setTimeout: callback => timers.push(callback),
  });
  return {
    location, document, storage, get resets() { return resets; },
    elapse: ms => { now += ms; },
    fire: (type, event = {}) => listeners[type]?.(event),
    flush: () => { while (timers.length) timers.shift()(); },
  };
}

test('fresh deep links discard an earlier document away timer without resetting the requested room', () => {
  for (const path of ['/contact', '/design', '/ku/contact', '/ku/design']) {
    const page = loadResumePolicy(path);
    // Enhancements may arrive after pageshow, so even focus before/without that
    // event must not consume the stale timer from yesterday's document.
    page.fire('focus');
    page.fire('pageshow', { persisted: false });
    page.flush();
    assert.equal(page.location.pathname, path);
    assert.equal(page.resets, 0);
    assert.equal(page.storage.has('bq_last_away_at'), false);
  }
});

test('bfcache resumes keep the five-minute threshold and reset only a long absence', () => {
  for (const duration of [60_000, 5 * 60_000 + 1]) {
    const page = loadResumePolicy('/contact');
    page.fire('pagehide');
    page.elapse(duration);
    page.fire('pageshow', { persisted: true });
    page.flush();
    assert.equal(page.resets, duration > 5 * 60_000 ? 1 : 0);
    assert.equal(page.location.pathname, duration > 5 * 60_000 ? '/' : '/contact');
    assert.equal(page.storage.has('bq_last_away_at'), false);
  }
});

test('visibility and focus resumes still return a long-backgrounded current tab to its hero', () => {
  for (const mechanism of ['visibility', 'focus']) {
    const page = loadResumePolicy('/design');
    page.fire('pageshow', { persisted: false });
    if (mechanism === 'visibility') {
      page.document.hidden = true;
      page.fire('visibilitychange');
    } else page.fire('blur');
    page.elapse(5 * 60_000 + 1);
    page.document.hidden = false;
    page.fire(mechanism === 'visibility' ? 'visibilitychange' : 'focus');
    page.flush();
    assert.equal(page.resets, 1);
    assert.equal(page.location.pathname, '/');
  }
});
