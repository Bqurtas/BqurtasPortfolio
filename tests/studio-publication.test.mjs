import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = source.indexOf('    const createStudioMediaGate =');
const end = source.indexOf('    const cmsApi =', start);
assert.ok(start > 0 && end > start);
function node() {
  const events = new Map();
  let text = '';
  return { disabled:false, isConnected:true, children:[],
    get textContent() { return text; }, set textContent(value) { text = value; this.children = []; },
    addEventListener(type, callback) { events.set(type, callback); },
    appendChild(child) { this.children.push(child); },
    click() { events.get('click')?.(); }
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const container = node(), save = node(), input = node(), message = node();
  const requests = [], timers = [], ready = [], previews = [], uploads = [];
  const ctx = { URL, AbortSignal, Map, location:{ origin:'https://bqurtas.com' },
    publicationText:key => key, cmsResize:async () => 'boundedWebP', document:{ createElement:node },
    fetch:(url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
    setTimeout:resolve => timers.push(resolve), container, save
  };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.gate = createStudioMediaGate(container, save);', ctx);
  const upload = () => ctx.gate.upload({ file:{ name:'cover.png' }, input, message,
    api:async body => { uploads.push(body); return { ok:true, publication:'queued', url:'https://bqurtas.com/uploads/abc123.webp' }; },
    preview:url => previews.push(url), ready:url => ready.push(url)
  });
  return { ...ctx, input, message, requests, timers, ready, previews, uploads, upload };
}

test('queued media keeps publication disabled through HTML fallback and only releases for live WebP', async () => {
  const f = fixture();
  const job = f.upload();
  assert.equal(f.save.disabled, true);
  assert.equal(f.input.disabled, true);
  await job;
  assert.equal(f.ready.length, 0);
  assert.equal(f.previews[0], 'data:image/webp;base64,boundedWebP');
  assert.equal(f.requests[0].options.method, 'HEAD');
  assert.equal(f.requests[0].options.cache, 'no-store');
  f.requests[0].resolve(new Response(null, { status:200, headers:{ 'Content-Type':'text/html' } }));
  await tick();
  assert.equal(f.save.disabled, true, 'SPA fallback is not a published image');
  f.timers.shift()(); await tick();
  f.requests[1].resolve(new Response(null, { status:200, headers:{ 'Content-Type':'image/webp' } }));
  await tick();
  assert.deepEqual(f.ready, ['https://bqurtas.com/uploads/abc123.webp']);
  assert.equal(f.save.disabled, false); assert.equal(f.input.disabled, false);
  assert.equal(f.gate.busy(), false);
});

test('bounded deployment checks offer retry without uploading a duplicate image', async () => {
  const f = fixture(); await f.upload();
  for (let i = 0; i < 12; i++) {
    f.requests[i].resolve(new Response(null, { status:404 })); await tick();
    if (i < 11) { f.timers.shift()(); await tick(); }
  }
  assert.equal(f.save.disabled, true);
  assert.equal(f.message.children.length, 1);
  f.message.children[0].click();
  assert.equal(f.uploads.length, 1);
  f.requests[12].resolve(new Response(null, { status:200, headers:{ 'Content-Type':'image/webp' } }));
  await tick();
  assert.equal(f.save.disabled, false);
  assert.equal(f.ready.length, 1);
});

test('concurrent media remains gated until every file is live and leaving editor stops polling', async () => {
  const f = fixture(); await f.upload(); await f.upload();
  f.requests[0].resolve(new Response(null, { status:200, headers:{ 'Content-Type':'image/webp' } }));
  await tick();
  assert.equal(f.save.disabled, true); assert.equal(f.input.disabled, true);
  f.container.isConnected = false;
  f.requests[1].resolve(new Response(null, { status:404 })); await tick();
  f.timers.shift()(); await tick();
  assert.equal(f.requests.length, 2);
  assert.equal(f.gate.busy(), false);
});

test('Works reports queued publication instead of claiming stale manifest counts updated', () => {
  const a = source.indexOf("const d = await wkApi({ folder:");
  const b = source.indexOf("else if (d && d.error", a);
  const success = source.slice(a, b);
  assert.match(success, /publicationText\('queued'\)/);
  assert.doesNotMatch(success, /__bqRefreshGalleryFromManifest|W\.done|W\.updated/);
});


test('upload failures release controls without changing the stored cover or claiming a live image', async () => {
  const f = fixture();
  await f.gate.upload({ file:{ name:'cover.png' }, input:f.input, message:f.message,
    api:async () => ({ ok:false, error:'studio-github-not-configured' }),
    preview:url => f.previews.push(url), ready:url => f.ready.push(url)
  });
  assert.equal(f.save.disabled, false); assert.equal(f.input.disabled, false);
  assert.equal(f.requests.length, 0); assert.equal(f.previews.length, 0); assert.equal(f.ready.length, 0);
  assert.match(f.message.textContent, /studio-github-not-configured/);
});
