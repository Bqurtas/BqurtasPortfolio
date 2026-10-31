import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [source, html, knowledge] = await Promise.all([
  readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8'),
  readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../preview_site/js/chat-kb.js', import.meta.url), 'utf8'),
]);
const loader = html.match(/<!-- The chatbot knowledge base[^]*?-->\s*<script>([^]*?)<\/script>/)?.[1];
assert.ok(loader, 'the on-demand chat knowledge loader exists');
function section(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `application section exists: ${from}`);
  return source.slice(start, end);
}

function fixture({ opened = true } = {}) {
  const listeners = new Map(), scripts = [], buttons = [];
  const window = new EventTarget();
  window.__bqLangCb = [];
  const submit = { disabled: false };
  const quick = {
    set innerHTML(_) { buttons.length = 0; },
    appendChild(button) { buttons.push(button); },
    querySelectorAll() { return buttons; },
  };
  const document = {
    documentElement: { dataset: { lang: 'ku' } },
    body: { appendChild(script) { scripts.push(script); } },
    createElement() { return { addEventListener() {} }; },
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) || []), listener]);
    },
  };
  const context = vm.createContext({
    window, document, Event, quick, greeted: opened,
    form: { setAttribute() {}, querySelector: () => submit },
    chatStatus() {}, send() {},
    chatTr: () => window.CHAT_I18N?.[document.documentElement.dataset.lang] || null,
  });
  vm.runInContext(loader, context);
  vm.runInContext(
    section('    const setPending = ', '    const botReply = ')
      + section('    const QUICK = ', '    const send = ')
      + section('    /* rebuild quick chips', '    chatStatus();\n    form.addEventListener')
      + '\nthis.api = { buildQuick, setPending };',
    context,
  );
  const intent = () => {
    const event = { target: { closest: () => ({ id: 'railChatM' }) } };
    for (const listener of listeners.get('click') || []) listener(event);
  };
  return {
    window, scripts, buttons, submit, intent, ...context.api,
    finishLoad() { vm.runInContext(knowledge, context); scripts.at(-1).onload(); },
    open() { context.greeted = true; context.api.buildQuick(); },
  };
}

test('a late knowledge load replaces first-open fallback chips without unlocking a pending reply', () => {
  const page = fixture();
  page.buildQuick();
  assert.equal(page.buttons.length, 4, 'the cold panel initially has its basic fallback');
  page.setPending(true);
  page.intent();
  assert.equal(page.scripts.length, 1);
  page.finishLoad();
  assert.deepEqual(page.buttons.map(button => button.textContent), Array.from(page.window.CHAT_I18N.ku.quick, item => item.label));
  assert.equal(page.buttons.length, 6, 'project brief and design ideas appear on the first opening');
  assert.ok(page.buttons.every(button => button.disabled));
  assert.equal(page.submit.disabled, true);
  page.setPending(false);
  assert.ok(page.buttons.every(button => !button.disabled));
  assert.equal(page.submit.disabled, false);
  page.intent();
  assert.equal(page.scripts.length, 1, 'a successful knowledge load is reused');
});

test('knowledge loaded before opening is available on the first render', () => {
  const page = fixture({ opened: false });
  page.intent(); page.finishLoad();
  assert.equal(page.buttons.length, 0, 'arrival does not open or greet the panel');
  page.open();
  assert.deepEqual(page.buttons.map(button => button.textContent), Array.from(page.window.CHAT_I18N.ku.quick, item => item.label));
});

test('a failed knowledge download can retry on the next chat intent', () => {
  const page = fixture();
  page.buildQuick(); page.intent(); page.scripts[0].onerror(); page.intent();
  assert.equal(page.scripts.length, 2);
  page.finishLoad();
  assert.equal(page.buttons.length, 6);
});
