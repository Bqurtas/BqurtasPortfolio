import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = source.indexOf('    const plainChatHTML = ');
const end = source.indexOf('    const QUICK = ', start);
assert.ok(start >= 0 && end > start, 'public chat request and rendering code exists');
const application = source.slice(start, end);

function fixture(messages = []) {
  const nodes = messages.map(({ role, content }) => ({
    textContent: content,
    classList: { contains: name => name === 'chat-msg--me' && role === 'user' },
  }));
  const body = { querySelectorAll: () => nodes, scrollHeight: 800, scrollTop: 0 };
  const submit = { disabled: false }, chips = [{ disabled: false }, { disabled: false }];
  const attributes = new Map(), status = { textContent: '' };
  const typing = { innerHTML: '', isTyping: true, classList: { remove() { typing.isTyping = false; } } };
  let resolveFetch, payload, saves = 0;
  const context = {
    body, AbortSignal,
    form: { setAttribute: (name, value) => attributes.set(name, value), querySelector: () => submit },
    quick: { querySelectorAll: () => chips },
    panel: { querySelector: () => status },
    document: { documentElement: { dataset: { lang: 'en' }, lang: 'en' } },
    typing: () => typing,
    persist: () => { saves++; },
    safeChatHTML: html => html,
    reply: () => '<b>Saved studio answer</b>',
    fetch: (_url, options) => {
      payload = JSON.parse(options.body);
      return new Promise(resolve => { resolveFetch = resolve; });
    },
  };
  vm.runInNewContext(application + '\nthis.api = { recentTurns, plainChatHTML, setPending, botReply };', context);
  return {
    ...context.api, submit, chips, attributes, status, typing, body,
    get payload() { return payload; }, get saves() { return saves; },
    respond(data, ok = true) { resolveFetch({ ok, json: async () => data }); },
  };
}

test('chat context retains the latest complete question after six long exchanges', () => {
  const conversation = [];
  for (let i = 0; i < 6; i++) {
    conversation.push({ role: 'user', content: `Question ${i}: ${'q'.repeat(1400)}` });
    conversation.push({ role: 'assistant', content: `Answer ${i}: ${'a'.repeat(3000)}` });
  }
  const latest = 'Please adapt that plan for a Kurdish book cover.';
  conversation.push({ role: 'user', content: latest });
  const messages = fixture(conversation).recentTurns();
  assert.equal(messages.at(-1).role, 'user');
  assert.equal(messages.at(-1).content, latest);
  assert.ok(messages.length <= 12);
  assert.ok(messages.every(message => message.content.length <= 1500));
  assert.ok(messages.reduce((sum, message) => sum + message.content.length, 0) <= 6000);
  assert.ok(messages.some(message => message.content.startsWith('Answer 5:')),
    'the most recent answer remains available for follow-up questions');
});

test('short exchanges retain twelve recent turns in their original order', () => {
  const conversation = Array.from({ length: 21 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user', content: `Turn ${i}`,
  }));
  const messages = fixture(conversation).recentTurns();
  assert.equal(messages.length, 12);
  assert.deepEqual(Array.from(messages, message => message.content), conversation.slice(-12).map(message => message.content));
});

test('the chat request stays within the server character budget and unlocks controls after a reply', async () => {
  const latest = 'Could you explain the next step?';
  const conversation = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user', content: `${i}: ${'ب'.repeat(1500)}`,
  }));
  conversation.push({ role: 'user', content: latest });
  const page = fixture(conversation);
  page.setPending(true);
  const answer = page.botReply(latest);
  assert.equal(page.submit.disabled, true);
  assert.ok(page.chips.every(chip => chip.disabled));
  assert.equal(page.attributes.get('aria-busy'), 'true');
  assert.equal(page.status.textContent, 'Thinking…');
  assert.equal(page.payload.messages.at(-1).content, latest);
  assert.ok(page.payload.messages.reduce((sum, message) => sum + message.content.length, 0) <= 6000);
  page.respond({ ok: true, text: 'Start with **a brief**.\nThen we agree the scope.' });
  await answer;
  assert.equal(page.submit.disabled, false);
  assert.ok(page.chips.every(chip => !chip.disabled));
  assert.equal(page.attributes.get('aria-busy'), 'false');
  assert.equal(page.typing.isTyping, false);
  assert.match(page.typing.innerHTML, /<strong>a brief<\/strong>/);
  assert.equal(page.body.scrollTop, page.body.scrollHeight);
  assert.equal(page.saves, 1);
});

test('a failed AI request unlocks chat and clearly identifies saved guidance', async () => {
  const page = fixture([{ role: 'user', content: 'What services do you offer?' }]);
  page.setPending(true);
  const answer = page.botReply('What services do you offer?');
  page.respond({ ok: false, error: 'chat-unavailable' }, false);
  await answer;
  assert.equal(page.submit.disabled, false);
  assert.ok(page.chips.every(chip => !chip.disabled));
  assert.equal(page.attributes.get('aria-busy'), 'false');
  assert.equal(page.typing.innerHTML, '<b>Saved studio answer</b>');
  assert.equal(page.status.textContent, 'Saved studio guidance');
});

test('AI text escapes markup while supporting emphasis and paragraph breaks', () => {
  const page = fixture();
  const html = page.plainChatHTML('**<img src=x onerror=alert(1)>** & <script>bad()</script>\n\n\nNext');
  assert.equal(html, '<strong>&lt;img src=x onerror=alert(1)&gt;</strong> &amp; &lt;script&gt;bad()&lt;/script&gt;<br><br>Next');
  assert.doesNotMatch(html, /<(?:img|script)\b/i);
});
