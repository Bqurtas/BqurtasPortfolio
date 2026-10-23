import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = authored.indexOf('(function dashboard() {');
const end = authored.indexOf('\n  })();', start) + '\n  })();'.length;
assert.ok(start >= 0 && end > start);
const source = authored.slice(start, end);

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
function fixture({ flag = false, lang = 'en', protocol = 'https:', setupUI = false, fetcher } = {}) {
  const nodes = Object.fromEntries(['dash', 'dashGate', 'dashMain', 'dashView', 'dashHint', 'dashKey', 'dashLoginForm', 'dash2faChoice', 'dashGateClose'].map(id => [`#${id}`, element()]));
  if (setupUI) {
    for (const id of ['dashSetup', 'dashSetupTitle', 'dashSetupNote', 'dashSetupLogin', 'dashSetupLoginLabel', 'dashSetupLoginMissing', 'dashSetupPublishing', 'dashSetupPublishingLabel', 'dashSetupPublishingMissing', 'dashSetupGuide', 'dashSetupRetry']) {
      nodes['#' + id] = element();
      nodes['#' + id].firstChild = { textContent:'' };
    }
  }
  const title = element(), note = element(), submit = element();
  nodes['#dashGate'].querySelector = selector => selector === 'h3' ? title : selector === 'p.mono' ? note : selector === 'button[type="submit"]' ? submit : null;
  nodes['#dashLoginForm button[type="submit"]'] = submit;
  const store = new Map(flag ? [['bq_dash_ok', '1']] : []);
  const calls = [], timers = new Map();
  let timerId = 0;
  const storage = { getItem:key => store.get(key) || null, setItem:(key, value) => store.set(key, value), removeItem:key => store.delete(key) };
  nodes['#dashHint'].appendChild = item => { nodes['#dashHint'].link = item; };
  const document = { ...events(), documentElement:{ dataset:{}, getAttribute:() => lang }, querySelector:selector => nodes[selector] || null, querySelectorAll:() => [], createElement:() => element() };
  const window = { ...events() };
  vm.runInNewContext(source, {
    $, $$:() => [], document, window, location:{ hash:'', href:'https://bqurtas.com/', protocol },
    localStorage:storage, sessionStorage:storage, URL, AbortController, AbortSignal,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout:id => timers.delete(id),
    fetch:async (url, options) => { calls.push({ url, options }); return fetcher ? fetcher(url, options) : { json:async () => ({ ok:true, configured:true, authenticated:false }) }; }
  });
  function $(selector) { return nodes[selector] || null; }
  return {
    nodes, calls, store, window, document, title, note, submit, timers,
    open:() => window.__bqOpenStudio(),
    close:() => nodes['#dashGateClose'].fire('click'),
    submitLogin(value) { nodes['#dashKey'].value = value; return nodes['#dashLoginForm'].fire('submit', { preventDefault() {} }); }
  };
}
const response = data => ({ json:async () => data });

test('a saved tab hint never unlocks the console without a verified server session', async () => {
  const f = fixture({ flag:true });
  await f.open();
  assert.equal(f.nodes['#dashMain'].hidden, true);
  assert.equal(f.nodes['#dashGate'].hidden, false);
  assert.equal(f.store.has('bq_dash_ok'), false);
  assert.equal(f.calls[0].options.credentials, 'same-origin');
  assert.equal(f.calls[0].options.cache, 'no-store');
});

test('a valid HttpOnly session opens in a new tab without a sessionStorage hint', async () => {
  const f = fixture({ fetcher:() => response({ ok:true, configured:true, authenticated:true }) });
  await f.open();
  assert.equal(f.nodes['#dashMain'].hidden, false);
  assert.equal(f.nodes['#dashGate'].hidden, true);
});

test('missing deployment prerequisites are named without asking for a different password', async () => {
  const f = fixture({ fetcher:() => response({ ok:true, configured:false, authenticated:false, requirements:{ pin:false, session:false, database:true, secondFactor:true } }) });
  await f.open();
  assert.match(f.nodes['#dashHint'].textContent, /DASH_PIN/);
  assert.match(f.nodes['#dashHint'].textContent, /SESSION_SECRET/);
  assert.doesNotMatch(f.nodes['#dashHint'].textContent, /D1 \/ DB/);
  assert.equal(f.nodes['#dashMain'].hidden, true);
});

test('a local file preview links to HTTPS Studio instead of issuing unusable login requests', async () => {
  const f = fixture({ protocol:'file:' });
  await f.open();
  assert.equal(f.calls.length, 0);
  assert.match(f.nodes['#dashHint'].textContent, /file preview cannot sign in/);
  assert.equal(f.nodes['#dashHint'].link.href, 'https://bqurtas.com/#studio');
  assert.equal(f.nodes['#dashMain'].hidden, true);
});

test('closing during the status check prevents a late response reopening privileged content', async () => {
  let finish;
  const f = fixture({ fetcher:() => new Promise(resolve => { finish = resolve; }) });
  const pending = f.open();
  await f.close();
  finish(response({ ok:true, configured:true, authenticated:true }));
  await pending;
  assert.equal(f.nodes['#dash'].classList.contains('is-open'), false);
  assert.equal(f.nodes['#dashMain'].hidden, true);
  assert.equal(f.calls[0].options.signal.aborted, true);
});

test('double submission does not send duplicate verification emails', async () => {
  let finish;
  const f = fixture({ fetcher:(url, options) => options.method === 'GET'
    ? response({ ok:true, configured:true, authenticated:false })
    : new Promise(resolve => { finish = resolve; }) });
  await f.open();
  const first = f.submitLogin('access-password');
  const second = f.submitLogin('access-password');
  assert.equal(f.calls.length, 2, 'one GET status and exactly one POST');
  assert.equal(f.submit.disabled, true);
  finish(response({ ok:true, id:'challenge', via:'email' }));
  await Promise.all([first, second]);
  assert.equal(f.submit.disabled, false);
  assert.equal(f.nodes['#dashKey'].autocomplete, 'one-time-code');
});

test('Kurdish and Arabic verification digits are normalized while PINs stay exact', async () => {
  const f = fixture({ fetcher:(url, options) => response(options.method === 'GET'
    ? { ok:true, configured:true, authenticated:false }
    : JSON.parse(options.body).action === 'send' ? { ok:true, id:'totp', via:'totp' } : { ok:true }) });
  await f.open();
  await f.submitLogin('secret-۱۲');
  await f.submitLogin('١۲٣۴٥۶');
  assert.equal(JSON.parse(f.calls[1].options.body).pin, 'secret-۱۲');
  assert.equal(JSON.parse(f.calls[2].options.body).code, '123456');
  assert.equal(f.nodes['#dashMain'].hidden, false);
});

test('closing during verification prevents the success response from reopening the console', async () => {
  let finish;
  const f = fixture({ fetcher:(url, options) => options.method === 'GET'
    ? response({ ok:true, configured:true, authenticated:false })
    : JSON.parse(options.body).action === 'send' ? response({ ok:true, id:'totp', via:'totp' })
      : new Promise(resolve => { finish = resolve; }) });
  await f.open();
  await f.submitLogin('access-password');
  const pending = f.submitLogin('123456');
  await f.close();
  finish(response({ ok:true }));
  await pending;
  assert.equal(f.nodes['#dash'].classList.contains('is-open'), false);
  assert.equal(f.nodes['#dashMain'].hidden, true);
  assert.equal(f.nodes['#dashKey'].value, '');
});

test('network and delivery failures are distinguished from wrong access credentials', async () => {
  const f = fixture({ fetcher:(url, options) => options.method === 'GET'
    ? response({ ok:true, configured:true, authenticated:false }) : response({ error:'email-failed' }) });
  await f.open();
  await f.submitLogin('access-password');
  assert.match(f.nodes['#dashHint'].textContent, /could not be delivered/);
  const offline = fixture({ fetcher:() => { throw new Error('offline'); } });
  await offline.open();
  assert.match(offline.nodes['#dashHint'].textContent, /could not be reached/);
  assert.equal(offline.submit.disabled, false);
});

test('privileged publishing never falls back to a cross-origin service on proxy errors', async () => {
  const helperStart = authored.indexOf('const studioCall = async (service, payload) => {');
  const helperEnd = authored.indexOf('\n    const cmsApi =', helperStart);
  const helper = authored.slice(helperStart, helperEnd).replace('const studioCall =', 'globalThis.studioCall =');
  for (const status of [503, 401, 502, 429]) {
    const calls = [];
    const context = {
      editToken:() => 'private-editor-key', DT:key => key, AbortSignal,
      invalidateDashboardSession() {}, hint:{},
      fetch:async (url, options) => {
        calls.push({ url, options });
        return { status, json:async () => ({ error:status === 503 ? 'studio-proxy-not-configured' : 'unauthorized' }) };
      }
    };
    vm.runInNewContext(helper, context);
    await context.studioCall('work-upload', { action:'list', folder:'Book' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/studio/work-upload');
    assert.equal(calls[0].options.credentials, 'same-origin');
  }
});

test('a publishing network failure never sends the editor password to Supabase', async () => {
  const helperStart = authored.indexOf('const studioCall = async (service, payload) => {');
  const helperEnd = authored.indexOf('\n    const cmsApi =', helperStart);
  const helper = authored.slice(helperStart, helperEnd).replace('const studioCall =', 'globalThis.studioCall =');
  const calls = [];
  const context = {
    editToken:() => 'private-editor-key', DT:key => key, AbortSignal,
    invalidateDashboardSession() {}, hint:{},
    fetch:async (url, options) => { calls.push({ url, options }); throw new Error('offline'); }
  };
  vm.runInNewContext(helper, context);
  const result = await context.studioCall('work-upload', { action:'list', folder:'Book' });
  assert.equal(result.error, 'studio-unavailable');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/studio/work-upload');
});

test('unconfigured Studio shows exact sign-in and publishing prerequisites without a usable PIN form', async () => {
  const f = fixture({ setupUI:true, fetcher:() => response({ ok:true, configured:false, authenticated:false,
    requirements:{ pin:false, session:false, database:true, secondFactor:false, editor:false, upstream:false } }) });
  await f.open();
  assert.equal(f.nodes['#dashSetup'].hidden, false);
  assert.equal(f.nodes['#dashLoginForm'].hidden, true);
  assert.equal(f.nodes['#dash2faChoice'].hidden, true);
  assert.match(f.nodes['#dashSetupLoginMissing'].textContent, /DASH_PIN.*SESSION_SECRET.*second factor/);
  assert.doesNotMatch(f.nodes['#dashSetupLoginMissing'].textContent, /D1/);
  assert.match(f.nodes['#dashSetupPublishingMissing'].textContent, /EDIT_TOKEN.*SUPABASE_EDIT_TOKEN/);
  await f.submitLogin('a-code-that-cannot-work-yet');
  assert.equal(f.calls.length, 1, 'typing or submitting cannot mutate authentication before server setup');
});

test('setup recheck sends only a fresh GET and restores sign-in when the server becomes ready', async () => {
  let checks = 0;
  const f = fixture({ setupUI:true, fetcher:() => response(++checks === 1
    ? { ok:true, configured:false, authenticated:false, requirements:{ pin:false, editor:false, upstream:false } }
    : { ok:true, configured:true, authenticated:false, requirements:{ pin:true, session:true, database:true, secondFactor:true, editor:true, upstream:true } }) });
  await f.open();
  f.nodes['#dashKey'].value = 'discarded-local-input';
  await f.nodes['#dashSetupRetry'].fire('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.calls.length, 2);
  for (const call of f.calls) {
    assert.equal(call.options.method, 'GET');
    assert.equal('body' in call.options, false);
  }
  assert.equal(f.nodes['#dashKey'].value, '');
  assert.equal(f.nodes['#dashSetup'].hidden, true);
  assert.equal(f.nodes['#dashLoginForm'].hidden, false);
  assert.equal(f.nodes['#dashMain'].hidden, true, 'readiness alone must never authenticate');
});

test('publishing setup remains visible without blocking an otherwise configured login', async () => {
  const f = fixture({ setupUI:true, fetcher:() => response({ ok:true, configured:true, authenticated:false,
    requirements:{ pin:true, session:true, database:true, secondFactor:true, editor:false, upstream:false } }) });
  await f.open();
  assert.equal(f.nodes['#dashSetup'].hidden, false);
  assert.equal(f.nodes['#dashSetupLogin'].hidden, true);
  assert.equal(f.nodes['#dashLoginForm'].hidden, false);
  assert.match(f.nodes['#dashSetupNote'].textContent, /Sign-in is ready/);
  assert.equal(f.nodes['#dashMain'].hidden, true);
});

test('a setup recheck cancelled by closing the dashboard cannot reveal the console later', async () => {
  let finish, checks = 0;
  const f = fixture({ setupUI:true, fetcher:() => ++checks === 1
    ? response({ ok:true, configured:false, authenticated:false, requirements:{ pin:false } })
    : new Promise(resolve => { finish = resolve; }) });
  await f.open();
  await f.nodes['#dashSetupRetry'].fire('click');
  await f.close();
  finish(response({ ok:true, configured:true, authenticated:true }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.calls[1].options.signal.aborted, true);
  assert.equal(f.nodes['#dash'].classList.contains('is-open'), false);
  assert.equal(f.nodes['#dashMain'].hidden, true);
});

test('opening Studio releases any public menu keyboard trap first', async () => {
  const f = fixture();
  const closed = [];
  f.window.__bqExclusive = panel => closed.push(panel);
  await f.open();
  assert.deepEqual(closed, ['studio']);
  assert.equal(f.nodes['#dash'].classList.contains('is-open'), true);
  assert.equal(f.nodes['#dashMain'].hidden, true);
});
