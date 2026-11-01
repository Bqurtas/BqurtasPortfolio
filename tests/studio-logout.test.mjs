import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = authored.indexOf('(function dashboard() {');
const end = authored.indexOf('\n  })();', start) + '\n  })();'.length;
assert.ok(start >= 0 && end > start);
const source = authored.slice(start, end);
const pendingKey = 'bq_dash_logout_pending';

function events() {
  const handlers = new Map();
  return {
    addEventListener(type, callback) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(callback);
    },
    fire(type, event = {}) { return Promise.all((handlers.get(type) || []).map(callback => callback(event))); }
  };
}
function element() {
  const attributes = new Map(), names = new Set();
  return {
    ...events(), attributes, value:'', textContent:'', innerHTML:'', hidden:false, disabled:false,
    classList:{ add:name => names.add(name), remove:name => names.delete(name), contains:name => names.has(name), toggle(name, on) { if (on) names.add(name); else names.delete(name); } },
    setAttribute:(name, value) => attributes.set(name, value), removeAttribute:name => attributes.delete(name),
    focus() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  };
}
const response = (data, status = 200) => ({ ok:status >= 200 && status < 300, status, json:async () => data });
function fixture({ store = new Map(), lang = 'en', consent = true, fetcher } = {}) {
  const nodes = Object.fromEntries(['dash', 'dashGate', 'dashMain', 'dashView', 'dashHint', 'dashKey', 'dashLoginForm', 'dash2faChoice', 'dashGateClose', 'dashLogout'].map(id => [`#${id}`, element()]));
  const title = element(), note = element(), submit = element();
  nodes['#dashGate'].querySelector = selector => selector === 'h3' ? title : selector === 'p.mono' ? note : selector === 'button[type="submit"]' ? submit : null;
  nodes['#dashGate'].appendChild = item => { nodes['#' + item.id] = item; };
  nodes['#dashLoginForm button[type="submit"]'] = submit;
  const calls = [], timers = new Map();
  let timerId = 0;
  const storage = { getItem:key => store.get(key) || null, setItem:(key, value) => store.set(key, value), removeItem:key => store.delete(key) };
  const document = { ...events(), documentElement:{ dataset:{ lang }, getAttribute:() => lang }, querySelector:selector => nodes[selector] || null, querySelectorAll:() => [], createElement:() => element() };
  const window = { ...events() };
  vm.runInNewContext(source, {
    $:selector => nodes[selector] || null, $$:() => [], document, window, location:{ hash:'', hostname:'bqurtas.com', protocol:'https:' },
    localStorage:{ removeItem() {} }, sessionStorage:storage, URL, AbortController, AbortSignal, confirm:() => consent,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout:id => timers.delete(id),
    fetch:async (url, options) => { calls.push({ url, options }); return fetcher ? fetcher(url, options) : response({ ok:true, configured:true, authenticated:true }); }
  });
  return {
    nodes, calls, store, window, title, note, timers,
    open:() => window.__bqOpenStudio(),
    close:() => nodes['#dashGateClose'].fire('click'),
    logout:() => nodes['#dashLogout'].fire('click'),
    retry:() => nodes['#dashLogoutRetry'].fire('click'),
    submitLogin(value) { nodes['#dashKey'].value = value; return nodes['#dashLoginForm'].fire('submit', { preventDefault() {} }); }
  };
}
function assertLocked(page) {
  assert.equal(page.nodes['#dashMain'].hidden, true);
  assert.equal(page.nodes['#dashGate'].hidden, false);
  assert.equal(page.nodes['#dashLoginForm'].hidden, true);
  assert.equal(page.nodes['#dash'].classList.contains('is-full'), false);
  for (const key of ['bq_dash_ok', 'bq_edit_token', 'bq_stats_token']) assert.equal(page.store.has(key), false, `${key} must be erased`);
  assert.equal(page.store.get(pendingKey), '1');
}
const privateCredentials = () => new Map([['bq_dash_ok', '1'], ['bq_edit_token', 'editor-secret'], ['bq_stats_token', 'stats-secret']]);

test('sign-out hides private content and clears credentials before waiting for server revocation', async () => {
  let finish;
  const page = fixture({ store:privateCredentials(), fetcher:(url, options) => options.method === 'GET'
    ? response({ ok:true, configured:true, authenticated:true }) : new Promise(resolve => { finish = resolve; }) });
  await page.open();
  assert.equal(page.nodes['#dashMain'].hidden, false);
  page.nodes['#dashKey'].value = 'unsubmitted secret';
  const pending = page.logout();
  assertLocked(page);
  assert.equal(page.nodes['#dashView'].innerHTML, '');
  assert.equal(page.nodes['#dashKey'].value, '');
  assert.equal(page.nodes['#dashLogoutRetry'].disabled, true);
  assert.match(page.nodes['#dashHint'].textContent, /Finishing secure sign-out/);
  assert.deepEqual(JSON.parse(page.calls.at(-1).options.body), { action:'logout' });
  assert.equal(page.calls.at(-1).options.credentials, 'same-origin');
  assert.equal(page.calls.at(-1).options.cache, 'no-store');
  finish(response({ ok:true }));
  await pending;
  assert.equal(page.store.has(pendingKey), false);
  assert.equal(page.nodes['#dash'].classList.contains('is-open'), false);
  assert.equal(page.nodes['#dashMain'].hidden, true);
  assert.equal(page.timers.size, 0);
});

test('503, network, invalid JSON and unsuccessful bodies all retain a locked gate and visible retry', async () => {
  const failures = [
    () => response({ ok:false, error:'session-revocation-unavailable' }, 503),
    () => response({ ok:true }, 503),
    () => response({ ok:false }, 200),
    () => response(null, 200),
    () => ({ ok:true, json:async () => { throw new SyntaxError('HTML instead of JSON'); } }),
    () => { throw new Error('offline'); }
  ];
  for (const fail of failures) {
    const page = fixture({ store:privateCredentials(), fetcher:(url, options) => options.method === 'GET'
      ? response({ ok:true, configured:true, authenticated:true }) : fail() });
    await page.open(); await page.logout();
    assertLocked(page);
    assert.equal(page.nodes['#dash'].classList.contains('is-open'), true);
    assert.equal(page.nodes['#dashLogoutRetry'].hidden, false);
    assert.equal(page.nodes['#dashLogoutRetry'].disabled, false);
    assert.match(page.nodes['#dashHint'].textContent, /could not be confirmed/);
    assert.equal(page.nodes['#dashHint'].attributes.get('role'), 'alert');
    assert.equal(page.timers.size, 0);
  }
});

test('closing and reopening after failed logout never checks or reuses the existing cookie', async () => {
  const page = fixture({ store:privateCredentials(), fetcher:(url, options) => options.method === 'GET'
    ? response({ ok:true, configured:true, authenticated:true })
    : response({ ok:false, error:'session-revocation-unavailable' }, 503) });
  await page.open(); await page.logout(); await page.close();
  const callsBeforeReopen = page.calls.length;
  assert.equal(page.nodes['#dash'].classList.contains('is-open'), false);
  await page.open();
  assertLocked(page);
  assert.equal(page.calls.length, callsBeforeReopen);
  await page.submitLogin('must-not-reopen');
  assert.equal(page.calls.length, callsBeforeReopen, 'a hidden login form cannot bypass pending sign-out');
});

test('pending logout survives reload and erases any stale tab credentials without a session check', async () => {
  const store = privateCredentials(); store.set(pendingKey, '1');
  const page = fixture({ store });
  await page.open();
  assertLocked(page);
  assert.equal(page.calls.length, 0);
  assert.equal(page.nodes['#dashLogoutRetry'].disabled, false);
});

test('a confirmed retry clears the pending state and closes without reopening private content', async () => {
  const store = new Map([[pendingKey, '1']]);
  const page = fixture({ store, fetcher:(url, options) => response(options.method === 'POST'
    ? { ok:true } : { ok:true, configured:true, authenticated:false }) });
  await page.open(); await page.retry();
  assert.equal(page.store.has(pendingKey), false);
  assert.equal(page.nodes['#dash'].classList.contains('is-open'), false);
  assert.equal(page.nodes['#dashMain'].hidden, true);
  await page.open();
  assert.equal(page.calls.length, 2, 'normal session checks resume only after confirmed sign-out');
  assert.equal(page.nodes['#dashLogoutRetry'].hidden, true);
  assert.equal(page.nodes['#dashLoginForm'].hidden, false);
});

test('timeout retains a retry, and repeated retry clicks cannot overlap revocation requests', async () => {
  const store = new Map([[pendingKey, '1']]);
  const page = fixture({ store, fetcher:(url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('request timed out')));
  }) });
  await page.open();
  const first = page.retry(), second = page.retry();
  assert.equal(page.calls.length, 1);
  assert.equal(page.nodes['#dashLogoutRetry'].disabled, true);
  [...page.timers.values()][0]();
  await Promise.all([first, second]);
  assertLocked(page);
  assert.equal(page.calls[0].options.signal.aborted, true);
  assert.equal(page.nodes['#dashLogoutRetry'].disabled, false);
});

test('sign-out cancels a pending session check so its late authenticated response cannot unlock', async () => {
  let finishStatus;
  const page = fixture({ fetcher:(url, options) => options.method === 'GET'
    ? new Promise(resolve => { finishStatus = resolve; }) : response({ ok:false }, 503) });
  const opening = page.open();
  await page.logout();
  assert.equal(page.calls[0].options.signal.aborted, true);
  finishStatus(response({ ok:true, configured:true, authenticated:true }));
  await opening;
  assertLocked(page);
});

test('declining logout preserves the open console without sending a revocation request', async () => {
  const page = fixture({ consent:false });
  await page.open(); await page.logout();
  assert.equal(page.calls.length, 1);
  assert.equal(page.nodes['#dashMain'].hidden, false);
  assert.equal(page.store.has(pendingKey), false);
});

test('locked sign-out status and retry are localized in English, Sorani and Arabic', async () => {
  for (const [lang, title, retry] of [
    ['en', 'Console locked', 'Retry sign-out'],
    ['ku', 'کۆنسۆڵ قفڵ کرا', 'دووبارە هەوڵی چوونەدەرەوە بدە'],
    ['ar', 'اللوحة مقفلة', 'إعادة محاولة تسجيل الخروج']
  ]) {
    const page = fixture({ lang, store:new Map([[pendingKey, '1']]) });
    await page.open();
    assert.equal(page.title.textContent, title);
    assert.equal(page.nodes['#dashLogoutRetry'].textContent, retry);
    assert.equal(page.nodes['#dashHint'].textContent.includes('logoutFailed'), false);
  }
});
