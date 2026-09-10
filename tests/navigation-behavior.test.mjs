import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
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
