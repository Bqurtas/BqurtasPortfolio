import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const worksStart = authored.indexOf('const WK_ACCESS_I18N =');
const worksEnd = authored.indexOf('\n    const renderLeads', worksStart);
assert.ok(worksStart > 0 && worksEnd > worksStart);
const publicationStart = authored.indexOf('const PUBLICATION_I18N =');
const publicationEnd = authored.indexOf('    /* Uploads create', publicationStart);
assert.ok(publicationStart > 0 && publicationEnd > publicationStart);
const worksSource = authored.slice(publicationStart, publicationEnd)
  + authored.slice(worksStart, worksEnd).replace('const renderWorks =', 'globalThis.renderWorks =');

function node() {
  const handlers = new Map();
  return {
    value:'', innerHTML:'', textContent:'', hidden:true, disabled:false,
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type, event = {}) { return handlers.get(type)?.(event); },
    querySelector() { return this.image || null; }, querySelectorAll() { return []; }
  };
}

function worksFixture({ token = 'browser-editor', resize = async () => 'webp-image', api = async () => ({ ok:true, files:[] }) } = {}) {
  const nodes = Object.fromEntries(['wkTokenForm', 'wkToken', 'wkTokenMsg', 'wkFile', 'wkPrev', 'wkMsg', 'wkUp', 'wkFolder', 'wkGrid', 'wkMgFolder', 'wkMgLoad'].map(id => ['#' + id, node()]));
  nodes['#wkTokenForm button[type="submit"]'] = node();
  nodes['#wkPrev'].image = { src:'' };
  nodes['#wkFolder'].value = 'Book';
  const store = new Map(token ? [['bq_edit_token', token]] : []);
  const view = node(), calls = [];
  const collection = { book:{ folder:'Book', title:'Books', count:1, ext:'webp' } };
  const context = {
    $:selector => nodes[selector], view, collections:() => collection, curLang:() => 'en',
    window:{ BQ_GALLERY:{ COLLECTIONS:collection } },
    WK_I18N:{ en:{ note:'Upload a finished design.', upload:'Publish', cat:'Folder', file:'Image', reading:'Preparing', ready:'Ready', pick:'Pick an image', uploading:'Publishing', done:'Published', fail:'Failed' } },
    CT_I18N:{ en:{ tokPh:'Editor password', conn:'Connect' } },
    editToken:() => store.get('bq_edit_token') || '',
    sessionStorage:{ setItem:(key, value) => store.set(key, value), removeItem:key => store.delete(key) },
    esc:value => String(value || ''), cmsResize:resize,
    wkApi:async payload => { calls.push(payload); return api(payload); }
  };
  vm.runInNewContext(worksSource, context);
  context.renderWorks();
  // These elements are browser-created with the authored disabled attribute.
  nodes['#wkUp'].disabled = /id="wkUp"[^>]*disabled/.test(view.innerHTML);
  return { context, nodes, view, calls, store,
    choose:file => nodes['#wkFile'].fire('change', { target:{ files:file ? [file] : [] } }),
    publish:() => nodes['#wkUp'].fire('click'),
    connect:value => { nodes['#wkToken'].value = value; return nodes['#wkTokenForm'].fire('submit', { preventDefault() {} }); }
  };
}

test('Works connects its editor directly and verifies publishing access before selecting an image', async () => {
  let finish;
  const f = worksFixture({ token:'', api:() => new Promise(resolve => { finish = resolve; }) });
  assert.match(f.view.innerHTML, /Connect gallery publishing/);
  assert.match(f.view.innerHTML, /Sign in with your editor password/);
  assert.doesNotMatch(f.view.innerHTML, /Upload a finished design\./);
  assert.doesNotMatch(f.view.innerHTML, /id="wkFile"/);
  const first = f.connect('browser-editor');
  assert.equal(f.nodes['#wkToken'].value, '');
  await f.nodes['#wkTokenForm'].fire('submit', { preventDefault() {} });
  assert.equal(f.calls.length, 1, 'double submit sends only one access check');
  assert.equal(f.calls[0].action, 'list');
  assert.equal(f.calls[0].folder, 'Book');
  finish({ ok:true, files:[] });
  await first;
  assert.match(f.view.innerHTML, /id="wkFile"/);
  assert.match(f.view.innerHTML, /id="wkUp"[^>]*disabled/);
  assert.match(f.view.innerHTML, /Upload a finished design\./);
  assert.doesNotMatch(f.view.innerHTML, /Sign in with your editor password/);
});

test('Works rejects a wrong editor password without presenting upload controls', async () => {
  const f = worksFixture({ token:'', api:async () => ({ error:'unauthorized' }) });
  await f.connect('wrong-password');
  assert.equal(f.store.has('bq_edit_token'), false);
  assert.match(f.nodes['#wkTokenMsg'].textContent, /password is incorrect/);
  assert.doesNotMatch(f.view.innerHTML, /id="wkFile"/);
});

test('image preparation ignores stale completions and clears an old image when the next file fails', async () => {
  const pending = new Map();
  const f = worksFixture({ resize:file => new Promise((resolve, reject) => pending.set(file, { resolve, reject })) });
  const a = f.choose('a'), b = f.choose('b');
  pending.get('b').resolve('image-b'); await b;
  pending.get('a').resolve('image-a'); await a;
  assert.match(f.nodes['#wkPrev'].image.src, /image-b$/);
  assert.equal(f.nodes['#wkUp'].disabled, false);
  const bad = f.choose('unsupported');
  assert.equal(f.nodes['#wkPrev'].hidden, true);
  assert.equal(f.nodes['#wkUp'].disabled, true);
  pending.get('unsupported').reject(new Error('unsupported')); await bad;
  await f.publish();
  assert.equal(f.calls.length, 0, 'a failed selection must never publish the previous image');
});

test('publishing is single flight and a service failure preserves the prepared image for retry', async () => {
  let finish;
  const f = worksFixture({ api:() => new Promise(resolve => { finish = resolve; }) });
  await f.choose('image');
  const first = f.publish(); await f.publish();
  assert.equal(f.calls.length, 1);
  assert.equal(f.nodes['#wkUp'].disabled, true);
  assert.equal(f.nodes['#wkFile'].disabled, true);
  assert.equal(f.nodes['#wkFolder'].disabled, true);
  finish({ error:'studio-github-auth', detail:'Check the server credentials in Cloudflare for GitHub publishing.' }); await first;
  assert.match(f.nodes['#wkMsg'].textContent, /server credentials/);
  assert.equal(f.nodes['#wkUp'].disabled, false);
  assert.equal(f.nodes['#wkFile'].disabled, false);
  const retry = f.publish();
  finish({ ok:true, publication:'queued' }); await retry;
  assert.match(f.nodes['#wkMsg'].textContent, /waiting for the website deployment/);
  assert.doesNotMatch(f.nodes['#wkMsg'].textContent, /gallery and tab counts updated/);
  assert.equal(f.calls.length, 2);
  assert.equal(f.nodes['#wkUp'].disabled, true);
  assert.equal(f.nodes['#wkPrev'].hidden, true);
});

function studioFixture(fetch) {
  const start = authored.indexOf('const studioFailure =');
  const end = authored.indexOf('\n    const cmsApi =', start);
  const source = authored.slice(start, end).replace('const studioCall =', 'globalThis.studioCall =');
  const context = {
    editToken:() => 'browser-editor', DT:key => key, AbortSignal,
    isLoopbackPreview:() => false, fetch
  };
  vm.runInNewContext(source, context);
  return () => context.studioCall('work-upload', { action:'list', folder:'Book' });
}

test('Studio diagnostics distinguish browser editor credentials from upstream server credentials', async () => {
  for (const [error, expected] of [['studio-upstream-auth', 'studioUpstreamAuth'], ['studio-github-not-configured', 'studioGithubMissing']]) {
    const call = studioFixture(async () => ({ status:502, json:async () => ({ error }) }));
    const result = await call();
    assert.equal(result.error, error);
    assert.equal(result.detail, expected);
  }
});

test('Studio reports actionable database and publishing server failures with safe HTTP references', async () => {
  const failures = [
    { status:503, error:'rate-limit-unavailable', expected:'studioDatabaseUnavailable [rate-limit-unavailable; HTTP 503]' },
    { status:502, error:'studio-upstream-failed', upstreamStatus:500, expected:'studioServerFailed [studio-upstream-failed; HTTP 502; upstream 500]' },
    { status:502, error:'studio-upstream-invalid', upstreamStatus:502, expected:'studioResponseInvalid [studio-upstream-invalid; HTTP 502; upstream 502]' },
    { status:502, error:'studio-upstream-too-large', expected:'studioResponseLarge [studio-upstream-too-large; HTTP 502]' },
    { status:504, error:'studio-upstream-timeout', expected:'studioTimeout [studio-upstream-timeout; HTTP 504]' },
    { status:502, error:'studio-upstream-unavailable', expected:'studioNetworkFailed [studio-upstream-unavailable; HTTP 502]' }
  ];
  for (const { status, error, upstreamStatus, expected } of failures) {
    const call = studioFixture(async () => ({ status, json:async () => ({ error, upstreamStatus }) }));
    const result = await call();
    assert.equal(result.error, error);
    assert.equal(result.detail, expected);
  }
});

test('Studio handles unreadable or structurally invalid responses without presenting them as successful publication', async () => {
  for (const json of [async () => { throw new SyntaxError('private HTML response'); }, async () => null, async () => ['unexpected']]) {
    const result = await studioFixture(async () => ({ status:200, json }))();
    assert.equal(result.error, 'bad_response');
    assert.equal(result.detail, 'studioResponseInvalid [bad_response]');
  }
});

test('Studio distinguishes a client timeout from a lost connection without displaying raw exceptions', async () => {
  for (const [name, error, expected] of [
    ['TimeoutError', 'studio-client-timeout', 'studioTimeout'],
    ['AbortError', 'studio-client-timeout', 'studioTimeout'],
    ['TypeError', 'studio-unavailable', 'studioNetworkFailed']
  ]) {
    const call = studioFixture(async () => { throw Object.assign(new Error('private network diagnostics'), { name }); });
    const result = await call();
    assert.equal(result.error, error);
    assert.equal(result.detail, `${expected} [${error}]`);
    assert.doesNotMatch(result.detail, /private network diagnostics/);
  }
});

test('a timeout while reading the publishing response remains a timeout rather than a malformed JSON failure', async () => {
  for (const name of ['AbortError', 'TimeoutError']) {
    const call = studioFixture(async () => ({
      status:200,
      json:async () => { throw Object.assign(new Error('private interrupted response'), { name }); }
    }));
    const result = await call();
    assert.equal(result.error, 'studio-client-timeout');
    assert.equal(result.detail, 'studioTimeout [studio-client-timeout]');
  }
});

test('Studio hides unknown server messages and rejects untrusted upstream status values in its displayed diagnostic', async () => {
  for (const upstreamStatus of ['500; private-token', 200, 600, 500.5]) {
    const call = studioFixture(async () => ({
      status:503,
      json:async () => ({ error:'private-server-error', detail:'private upstream body', upstreamStatus })
    }));
    const result = await call();
    assert.equal(result.detail, 'studioUnavailable [studio-service-failed; HTTP 503]');
  }
});

test('Studio recognizes Cloudflare problem responses and displays only safe diagnostic references', async () => {
  const call = studioFixture(async () => ({
    status:502,
    json:async () => ({
      cloudflare_error:true, error_code:502, ray_id:'A4F1D87FE836D384',
      title:'private server title', detail:'private server detail', email:'private@example.com'
    })
  }));
  const result = await call();
  assert.equal(result.ok, false);
  assert.equal(result.error, 'studio-edge-failed');
  assert.equal(result.detail, 'studioEdgeFailed [studio-edge-failed; HTTP 502; Cloudflare 502; Ray ID a4f1d87fe836d384]');
  assert.deepEqual(Object.keys(result).sort(), ['detail', 'error', 'ok']);
  assert.doesNotMatch(JSON.stringify(result), /private/);

  const invalidRay = await studioFixture(async () => ({
    status:502,
    json:async () => ({ cloudflare_error:true, error_code:1101, ray_id:'private@example.com' })
  }))();
  assert.equal(invalidRay.detail, 'studioEdgeFailed [studio-edge-failed; HTTP 502; Cloudflare 1101]');
});

test('Studio requires a genuine Cloudflare marker and bounded integer code before classifying an edge failure', async () => {
  const invalid = [
    { cloudflare_error:'true', error_code:502 },
    { cloudflare_error:false, error_code:502 },
    { error_code:502 },
    ...['502', 399, 2000, 502.5].map(error_code => ({ cloudflare_error:true, error_code }))
  ];
  for (const body of invalid) {
    const result = await studioFixture(async () => ({ status:502, json:async () => body }))();
    assert.equal(result.detail, 'studioUnavailable [studio-service-failed; HTTP 502]');
  }
});

function resizeFixture({ width = 500, height = 100000, contextMissing = false, drawFails = false, encoded = 'data:image/webp;base64,d2VicA==' } = {}) {
  const start = authored.indexOf('const cmsResize =');
  const end = authored.indexOf('\n    const cmsGate =', start);
  const source = authored.slice(start, end).replace('const cmsResize =', 'globalThis.cmsResize =');
  const revoked = [], canvas = {};
  const context = {
    URL:{ createObjectURL:() => 'blob:image', revokeObjectURL:value => revoked.push(value) },
    Image:class { constructor() { this.width = width; this.height = height; } set src(value) { this.onload(); } },
    document:{ createElement:() => Object.assign(canvas, { getContext:() => contextMissing ? null : { drawImage() { if (drawFails) throw new Error('canvas limit'); } }, toDataURL:() => encoded }) }
  };
  vm.runInNewContext(source, context);
  return { resize:() => context.cmsResize({}, 1400, 0.78), canvas, revoked };
}

test('shared image preparation bounds both dimensions and always releases the source URL', async () => {
  const f = resizeFixture();
  assert.equal(await f.resize(), 'd2VicA==');
  assert.equal(f.canvas.height, 1400);
  assert.ok(f.canvas.width >= 1 && f.canvas.width <= 1400);
  assert.deepEqual(f.revoked, ['blob:image']);
  for (const options of [{ contextMissing:true }, { drawFails:true }, { encoded:'data:image/png;base64,cG5n' }]) {
    const failure = resizeFixture(options);
    await assert.rejects(failure.resize());
    assert.deepEqual(failure.revoked, ['blob:image']);
  }
});
