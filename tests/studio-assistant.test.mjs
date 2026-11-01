import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = source.indexOf('    const AT_I18N = {');
const end = source.indexOf('    const flag = ', start);
assert.ok(start > 0 && end > start);
const block = source.slice(start, end);
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(saved = []) {
  let nodes = {}, editor = 'editor-test', expired = 0;
  const requests = [], storage = new Map([['bq_assist', JSON.stringify(saved)]]), timeouts = [];
  const node = () => {
    const events = new Map();
    return { value:'', isConnected:true, innerHTML:'', attributes:{}, disabled:false,
      addEventListener:(name, fn) => events.set(name, fn),
      setAttribute(name, value) { this.attributes[name] = value; },
      fire(name) { return events.get(name)?.({ preventDefault() {} }); }
    };
  };
  const view = {};
  Object.defineProperty(view, 'innerHTML', { set(html) {
    for (const old of Object.values(nodes)) old.isConnected = false;
    nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => ['#' + match[1], node()]));
  } });
  const context = { view, TextEncoder, curLang:() => 'en', editToken:() => editor,
    esc:value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    $:selector => nodes[selector],
    localStorage:{ getItem:key => storage.get(key), setItem:(key, value) => storage.set(key, value) },
    sessionStorage:{ setItem:(key, value) => { editor = value; }, removeItem:() => { editor = ''; } },
    invalidateDashboardSession:() => { expired++; }, hint:{ textContent:'' }, DT:key => key,
    AbortSignal:{ timeout:duration => { timeouts.push(duration); return new AbortController().signal; } },
    fetch:(url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }))
  };
  vm.runInNewContext(block + '\nglobalThis.api = { render:renderAssistant, call:assistantCall, context:assistantContext };', context);
  return { ...context.api, requests, storage, timeouts, hint:context.hint,
    get nodes() { return nodes; }, get expired() { return expired; }, get editor() { return editor; },
    submit(value) { nodes['#asstInput'].value = value; return nodes['#asstForm'].fire('submit'); }
  };
}

test('assistant sends bounded recent context while retaining the saved conversation', async () => {
  const saved = Array.from({ length:40 }, (_, i) => ({ role:i % 2 ? 'assistant' : 'user', content:'ک'.repeat(1200) + i }));
  const f = fixture(saved); f.render();
  const job = f.submit('Reply in Kurdish');
  const request = f.requests[0];
  const messages = JSON.parse(request.options.body).messages;
  assert.ok(messages.length <= 20);
  assert.ok(messages.every(message => message.content.length <= 4000));
  assert.ok(messages.reduce((n, message) => n + message.content.length, 0) <= 20000);
  assert.ok(Buffer.byteLength(request.options.body) <= 24 * 1024);
  assert.equal(messages.at(-1).content, 'Reply in Kurdish');
  assert.equal(JSON.parse(f.storage.get('bq_assist')).length, 40);
  assert.equal(request.url, '/api/assistant');
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(request.options.cache, 'no-store');
  assert.deepEqual(f.timeouts, [35000]);
  request.resolve(Response.json({ ok:true, text:'A useful answer' })); await job;
  assert.equal(JSON.parse(f.storage.get('bq_assist')).at(-1).content, 'A useful answer');
});

test('one assistant request survives view rerenders and cannot be cleared or sent twice', async () => {
  const f = fixture(); f.render();
  const job = f.submit('Hello');
  await f.submit('Second request');
  f.nodes['#asstClear'].fire('click');
  assert.equal(f.requests.length, 1);
  assert.equal(JSON.parse(f.storage.get('bq_assist')).length, 1);
  f.render();
  assert.equal(f.nodes['#asstSend'].disabled, true);
  await f.submit('Third request');
  assert.equal(f.requests.length, 1);
  f.requests[0].resolve(Response.json({ ok:true, text:'Hello back' })); await job;
  assert.equal(f.nodes['#asstSend'].disabled, false);
  assert.match(f.nodes['#asstMsgs'].innerHTML, /Hello back/);
});

test('oversized drafts remain editable without making a request', async () => {
  const f = fixture(); f.render();
  for (const draft of ['a'.repeat(4001), '😀'.repeat(2001)]) {
    await f.submit(draft);
    assert.equal(f.requests.length, 0);
    assert.equal(f.nodes['#asstInput'].value, draft);
    assert.match(f.nodes['#asstMsgs'].innerHTML, /4,000/);
  }
});

test('assistant distinguishes timeout, network, unreadable, and upstream failures without reflecting server text', async () => {
  for (const [response, expected] of [
    [new Response('<h1>secret server trace</h1>', { status:200 }), /unreadable/],
    [Response.json({ error:'ai-upstream-failed', message:'secret upstream trace' }, { status:502 }), /Cloudflare AI could not answer/],
    [Response.json({ error:'secret exception', message:'secret server trace' }, { status:500 }), /temporarily unavailable/],
    [Response.json({ error:'rate-limited' }, { status:429 }), /Too many requests/]
  ]) {
    const f = fixture(); f.render(); const job = f.submit('Please help');
    f.requests[0].resolve(response); await job;
    assert.match(f.nodes['#asstMsgs'].innerHTML, expected);
    assert.doesNotMatch(f.nodes['#asstMsgs'].innerHTML, /secret|live site only/);
    assert.equal(JSON.parse(f.storage.get('bq_assist'))[0].content, 'Please help');
    assert.equal(f.nodes['#asstSend'].disabled, false);
  }
  for (const [name, expected] of [['TimeoutError', /too long/], ['TypeError', /connection/]]) {
    const f = fixture(); f.render(); const job = f.submit('Keep this question');
    const error = new Error('private exception'); error.name = name;
    f.requests[0].reject(error); await job;
    assert.match(f.nodes['#asstMsgs'].innerHTML, expected);
    assert.equal(JSON.parse(f.storage.get('bq_assist'))[0].content, 'Keep this question');
  }
});

test('expired secure sessions return to sign-in while editor rejection reconnects without losing history', async () => {
  const f = fixture(); f.render(); const job = f.submit('Keep this');
  f.requests[0].resolve(Response.json({ error:'session-required' }, { status:401 })); await job;
  assert.equal(f.expired, 1); assert.equal(f.hint.textContent, 'sessionExpired');
  assert.equal(JSON.parse(f.storage.get('bq_assist'))[0].content, 'Keep this');
  const editor = fixture(); editor.render(); const editorJob = editor.submit('Keep this too');
  editor.requests[0].resolve(Response.json({ error:'unauthorized' }, { status:401 })); await editorJob;
  assert.equal(editor.expired, 0); assert.equal(editor.editor, '');
  assert.ok(editor.nodes['#asTokForm']);
  assert.equal(JSON.parse(editor.storage.get('bq_assist'))[0].content, 'Keep this too');
});

test('malformed saved history cannot crash or inject the assistant view and drafts survive navigation', async () => {
  for (const saved of [{ unsafe:'object' }, [null, { role:'system', content:'injected' }, { role:'user', content:'<img src=x onerror=bad>' }]]) {
    const f = fixture(saved); f.render();
    assert.doesNotMatch(f.nodes['#asstMsgs'].innerHTML, /<img|injected/);
    f.nodes['#asstInput'].value = 'Unsent draft'; f.nodes['#asstInput'].fire('input');
    f.render(); assert.equal(f.nodes['#asstInput'].value, 'Unsent draft');
  }
  await tick();
});
