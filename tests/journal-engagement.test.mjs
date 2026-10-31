import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const helperStart = authored.indexOf('    const engagementRequest =');
const helperEnd = authored.indexOf('    const profile =', helperStart);
const handlersStart = authored.indexOf("    rd.like?.addEventListener('click'", helperEnd);
const handlersEnd = authored.indexOf('    /* share —', handlersStart);
assert.ok(helperStart > 0 && helperEnd > helperStart && handlersEnd > handlersStart);
const handlers = authored.slice(helperStart, helperEnd) + authored.slice(handlersStart, handlersEnd);
const tick = () => new Promise(resolve => setImmediate(resolve));
function node() {
  const events = new Map();
  return { value:'', disabled:false, textContent:'', dataset:{}, children:[],
    addEventListener(type, callback) { events.set(type, callback); },
    fire(type) { return events.get(type)?.({ preventDefault() {} }); },
    setAttribute() {}, appendChild(child) { this.children.push(child); }, focus() {}
  };
}
function engagementFixture() {
  const rd = { like:node(), cForm:node(), cName:node(), cText:node() };
  const submit = node(), calls = [], refreshed = [];
  rd.cForm.querySelector = selector => selector === '[data-comment-status]' ? rd.cForm.children[0] || null : submit;
  rd.cText.value = 'Keep this comment until it is published.';
  rd.cName.value = 'A reader';
  const context = { rd, AbortSignal, curPostObj:{ id:27 }, curLikes:4, curLiked:false,
    dT:(_key, fallback) => fallback, profile:() => ({}), saveProfile() {}, myToken:() => 'visitor-token',
    document:{ createElement:node }, renderLike() {}, loadEngagement:post => refreshed.push(post),
    fetch:(url, options) => new Promise(resolve => calls.push({ url, options, resolve }))
  };
  vm.runInNewContext(handlers, context);
  return { rd, submit, calls, refreshed, context };
}

test('failed same-origin likes restore the visible count and release the button', async () => {
  const f = engagementFixture();
  f.rd.like.fire('click');
  assert.equal(f.context.curLikes, 5);
  assert.equal(f.rd.like.disabled, true);
  assert.equal(f.calls[0].url, '/api/engagement');
  assert.equal(f.calls[0].options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { action:'like', post_id:27, token:'visitor-token' });
  f.calls[0].resolve(new Response('unavailable', { status:503 }));
  await tick();
  assert.equal(f.context.curLikes, 4);
  assert.equal(f.context.curLiked, false);
  assert.equal(f.rd.like.disabled, false);
});

test('a rejected comment keeps the text and allows retry, and only a confirmed write clears it', async () => {
  const f = engagementFixture();
  f.rd.cForm.fire('submit');
  assert.equal(f.submit.disabled, true);
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { action:'comment', post_id:27, name:'A reader', body:'Keep this comment until it is published.' });
  f.calls[0].resolve(new Response('unavailable', { status:503 }));
  await tick();
  assert.equal(f.rd.cText.value, 'Keep this comment until it is published.');
  assert.match(f.rd.cForm.children[0].textContent, /Could not publish/);
  assert.equal(f.submit.disabled, false);
  assert.equal(f.refreshed.length, 0);
  f.rd.cForm.fire('submit');
  f.calls[1].resolve(Response.json({ ok:true }));
  await tick();
  assert.equal(f.rd.cText.value, '');
  assert.equal(f.rd.cForm.children[0].textContent, '');
  assert.equal(f.refreshed.length, 1);
});

test('subscription failure retains the email instead of claiming a successful subscription', async () => {
  const start = authored.indexOf('  (function subscribe() {');
  const end = authored.indexOf('\n  })();', start) + '\n  })();'.length;
  const form = node(), email = node(), status = node(), calls = [];
  status.style = {}; email.value = 'reader@example.test';
  vm.runInNewContext(authored.slice(start, end), {
    $:selector => ({ '#subscribeForm':form, '#subEmail':email, '#subStatus':status })[selector],
    AbortSignal, window:{}, document:{ documentElement:{ dataset:{ lang:'ku' } } },
    fetch:(url, options) => new Promise(resolve => calls.push({ url, options, resolve }))
  });
  form.fire('submit');
  assert.equal(calls[0].url, '/api/subscribe');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email:'reader@example.test', lang:'ku' });
  calls[0].resolve(new Response('unavailable', { status:503 }));
  await tick();
  assert.match(status.textContent, /Could not subscribe/);
  assert.equal(email.value, 'reader@example.test');
  form.fire('submit');
  calls[1].resolve(Response.json({ ok:true }));
  await tick();
  assert.match(status.textContent, /Subscribed/);
  assert.equal(email.value, '');
});
