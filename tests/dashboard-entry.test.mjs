import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
const start = html.indexOf('      var loaded = false, loading = false, ready = []');
const end = html.indexOf('    }());', start);
assert.ok(start > 0 && end > start);
const source = html.slice(start, end);

function target() {
  const events = new Map();
  return {
    addEventListener(name, fn) { (events.get(name) || events.set(name, []).get(name)).push(fn); },
    fire(name, args = {}) {
      const event = { preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...args };
      for (const fn of events.get(name) || []) fn(event);
      return event;
    }
  };
}
function fixture(hash = '') {
  const scripts = [], timers = new Map();
  let opened = 0, timer = 0;
  const location = { pathname: '/', hash };
  const document = {
    ...target(), documentElement: { classList: { add() {} } },
    body: { appendChild(script) { scripts.push(script); } },
    createElement: () => ({ remove() {} })
  };
  const window = { ...target(), __bqOpenStudio() { opened++; } };
  vm.runInNewContext(source, {
    document, window, location,
    setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); }
  });
  return { document, window, location, scripts,
    get opened() { return opened; },
    load() { scripts.at(-1).onload(); },
    expireClicks() { [...timers.values()].forEach(fn => fn()); timers.clear(); },
    shortcut() { return document.fire('keydown', { key: 'b', metaKey: true }); },
    logo() { return document.fire('click', { target: { closest: selector => selector === '.rail-logo' ? {} : null } }); }
  };
}

test('cold home keeps the dashboard lazy, while its keyboard shortcut opens after loading once', () => {
  const page = fixture();
  assert.equal(page.scripts.length, 0);
  const key = page.shortcut();
  page.shortcut();
  assert.equal(key.prevented, true);
  assert.equal(key.stopped, true);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.opened, 0);
  page.load();
  assert.equal(page.opened, 1);
  assert.equal(page.shortcut().prevented, undefined, 'loaded dashboard handlers own later shortcuts');
});

test('an initial Studio bookmark or a later hash change starts the optional bundle', () => {
  assert.equal(fixture('#studio').scripts.length, 1);
  const page = fixture();
  page.location.hash = '#studio';
  page.window.fire('hashchange');
  page.window.fire('hashchange');
  assert.equal(page.scripts.length, 1);
});

test('five quick logo clicks work on a cold home without changing ordinary clicks', () => {
  const page = fixture();
  for (let i = 0; i < 4; i++) assert.equal(page.logo().prevented, undefined);
  assert.equal(page.scripts.length, 0);
  assert.equal(page.logo().prevented, true);
  page.load();
  assert.equal(page.opened, 1);
  const expired = fixture();
  for (let i = 0; i < 4; i++) expired.logo();
  expired.expireClicks();
  expired.logo();
  assert.equal(expired.scripts.length, 0);
});

test('failed dashboard loading can be retried without replaying stale open callbacks', () => {
  const page = fixture();
  page.shortcut();
  page.scripts[0].onerror();
  page.shortcut();
  assert.equal(page.scripts.length, 2);
  page.load();
  assert.equal(page.opened, 1);
});

test('the access password field accepts a password manager without an OTP keyboard', () => {
  const input = html.match(/<input[^>]+id="dashKey"[^>]*>/)?.[0];
  assert.match(input, /type="password"/);
  assert.match(input, /inputmode="text"/);
  assert.match(input, /autocomplete="current-password"/);
});
