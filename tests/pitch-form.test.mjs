import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('  /* ---------- Pitch form ---------- */');
const end = main.indexOf('  /* Keep the original name-card hover', start);
assert.ok(start >= 0 && end > start, 'the real pitch form handler is available');
const source = main.slice(start, end);

function fixture({ language = 'en', fetchImpl = async () => ({ ok: true, json: async () => ({ success: true }) }) } = {}) {
  let focused = null;
  let resets = 0;
  const calls = [];
  const timers = new Map();
  const listeners = {};
  const fields = Object.fromEntries(Object.entries({
    pName: 'Ada Example', pCompany: 'Studio', pEmail: 'ada@example.com',
    pPhone: '', pType: '', pBudget: '', pTimeline: '', pHear: '',
    pRefs: '', pMessage: 'A new visual identity for our studio.', pNDA: ''
  }).map(([id, value]) => [id, {
    tagName: id === 'pMessage' ? 'TEXTAREA' : 'INPUT', value, checked: false,
    attributes: {},
    setAttribute(key, val) { this.attributes[key] = val; },
    removeAttribute(key) { delete this.attributes[key]; },
    focus() { focused = id; }
  }]));
  const submit = { disabled: false };
  const form = {
    elements: Object.values(fields), attributes: {},
    querySelector(selector) { return selector === '[type="submit"]' ? submit : fields[selector.slice(1)] || null; },
    addEventListener(event, callback) { listeners[event] = callback; },
    setAttribute(key, val) { this.attributes[key] = val; },
    removeAttribute(key) { delete this.attributes[key]; },
    reset() { resets++; Object.values(fields).forEach(field => { field.value = ''; field.checked = false; }); }
  };
  const status = { style: {}, text: '', replaceChildren(...nodes) { this.text = nodes.map(node => node.textContent || '').join(''); } };
  const context = {
    currentLang: language,
    AbortController,
    document: {
      getElementById(id) { return { pitchForm: form, pitchStatus: status }[id] || null; },
      createElement() { return { setAttribute() {} }; },
      createTextNode(textContent) { return { textContent }; }
    },
    fetch(url, options) { calls.push({ url, options }); return fetchImpl(url, options); },
    setTimeout(callback, delay) { const id = timers.size + 1; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  return {
    fields, form, status, submit, calls, timers, context,
    send: () => listeners.submit({ preventDefault() {} }),
    input: id => listeners.input({ target: fields[id] }),
    get focused() { return focused; },
    get resets() { return resets; }
  };
}

test('invalid pitch fields are announced and focused without sending anything', async () => {
  const page = fixture();
  page.fields.pName.value = '  ';
  page.fields.pEmail.value = 'not an email';
  await page.send();
  assert.equal(page.calls.length, 0);
  assert.equal(page.focused, 'pName');
  assert.equal(page.fields.pName.attributes['aria-invalid'], 'true');
  assert.equal(page.fields.pEmail.attributes['aria-invalid'], 'true');
  assert.match(page.status.text, /name, email/);
  page.fields.pName.value = 'Ada';
  page.input('pName');
  assert.equal(page.fields.pName.attributes['aria-invalid'], undefined);
  await page.send();
  assert.equal(page.focused, 'pEmail');
  assert.match(page.status.text, /valid email/);
});

test('duplicate submissions share one in-flight request and successful unchanged drafts reset', async () => {
  let complete;
  const page = fixture({ fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
  const first = page.send();
  await page.send();
  assert.equal(page.calls.length, 1);
  assert.equal(page.submit.disabled, true);
  assert.equal(page.form.attributes['aria-busy'], 'true');
  assert.match(page.status.text, /Sending/);
  assert.equal(JSON.parse(page.calls[0].options.body).message, page.fields.pMessage.value);
  complete({ ok: true, json: async () => ({ success: true }) });
  await first;
  assert.equal(page.resets, 1);
  assert.equal(page.submit.disabled, false);
  assert.equal(page.form.attributes['aria-busy'], undefined);
  assert.equal(page.timers.size, 0);
  assert.match(page.status.text, /has been sent/);
});

test('a successful send preserves all fields if any draft field changed while waiting', async () => {
  let complete;
  const page = fixture({ fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
  const sending = page.send();
  page.fields.pCompany.value = 'An updated company';
  page.fields.pNDA.checked = true;
  complete({ ok: true, json: async () => ({ success: true }) });
  await sending;
  assert.equal(page.resets, 0);
  assert.equal(page.fields.pCompany.value, 'An updated company');
  assert.equal(page.fields.pNDA.checked, true);
  assert.equal(page.fields.pName.value, 'Ada Example');
});

test('HTTP errors, API refusals, malformed JSON and network failures retain the draft and unlock retry', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, json: async () => ({ success: true }) }),
    async () => ({ ok: true, json: async () => ({ success: false }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } }),
    async () => { throw new TypeError('network unavailable'); }
  ]) {
    const page = fixture({ fetchImpl });
    await page.send();
    assert.equal(page.resets, 0);
    assert.match(page.fields.pMessage.value, /visual identity/);
    assert.match(page.status.text, /could not be sent/);
    assert.equal(page.submit.disabled, false);
    assert.equal(page.timers.size, 0);
    await page.send();
    assert.equal(page.calls.length, 2);
  }
});

test('a stalled request is aborted after 15 seconds and late completion cannot clear the draft', async () => {
  let complete;
  const page = fixture({ fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
  const sending = page.send();
  const deadline = [...page.timers.values()][0];
  assert.equal(deadline.delay, 15_000);
  deadline.callback();
  await sending;
  assert.equal(page.calls[0].options.signal.aborted, true);
  assert.equal(page.submit.disabled, false);
  assert.match(page.status.text, /too long to confirm/);
  assert.equal(page.resets, 0);
  complete({ ok: true, json: async () => ({ success: true }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.resets, 0);
  assert.match(page.status.text, /too long to confirm/);
});

test('the deadline also covers a stalled response body', async () => {
  const page = fixture({ fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }) });
  const sending = page.send();
  await Promise.resolve();
  [...page.timers.values()][0].callback();
  await sending;
  assert.equal(page.calls[0].options.signal.aborted, true);
  assert.equal(page.resets, 0);
  assert.equal(page.submit.disabled, false);
});

test('validation and delivery statuses use each of the seven active languages', async () => {
  const messages = new Set();
  for (const language of ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv']) {
    const page = fixture({ language });
    page.fields.pName.value = '';
    await page.send();
    const validation = page.status.text;
    assert.ok(validation.trim());
    messages.add(validation);
    page.fields.pName.value = 'Ada';
    await page.send();
    assert.ok(page.status.text.trim());
    assert.notEqual(page.status.text, validation);
    if (language !== 'en') assert.doesNotMatch(page.status.text, /Thank you|your pitch/);
  }
  assert.equal(messages.size, 7);
});
