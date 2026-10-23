import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { issueSession } from '../functions/api/_session.js';
import { onRequestPost as studioPost } from '../functions/api/studio/[service].js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'another-independent-session-secret-over-32-bytes';
const BOOTSTRAP_DB = {
  prepare() {
    return {
      bind() { return this; },
      async run() { return { meta: { changes: 1 } }; },
      async first() { return null; }
    };
  }
};
const BASE_ENV = {
  SESSION_SECRET,
  EDIT_TOKEN: 'browser-edit-secret',
  SUPABASE_EDIT_TOKEN: 'server-only-upstream-secret',
  DB: BOOTSTRAP_DB,
  RATE_LIMITER: { limit: async () => ({ success: true }) }
};

async function cookie() {
  return (await issueSession(BASE_ENV)).split(';', 1)[0];
}

function request(service, token, body, extraHeaders = {}) {
  return new Request(`${ORIGIN}/api/studio/${service}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Cookie: extraHeaders.Cookie || '',
      'x-edit-token': token,
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
}

test('built dashboard sends every privileged Supabase mutation through Pages', async () => {
  const files = await Promise.all([
    readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8'),
    readFile(new URL('../preview_site/js/enhance.v420.min.js', import.meta.url), 'utf8')
  ]);
  for (const source of files) {
    /* No privileged service may be wired straight to an Edge Function. */
    assert.doesNotMatch(source, /functions\/v1\/(?:work-upload|set-token|blog-admin|latest-admin|projects-admin)/);

    /* The proxy is the only path; no configuration or network failure may
       downgrade publication to the browser credential alone. */
    assert.match(source, /\/api\/studio\//);
    assert.match(source, /studio-proxy-not-configured/);

    for (const service of ['work-upload', 'set-token', 'blog-admin', 'latest-admin', 'projects-admin']) {
      assert.match(source, new RegExp(`['"]${service}['"]`));
    }
  }
});

test('Studio proxy requires both the signed session and browser edit token', async () => {
  const noSession = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action: 'list' }),
    env: BASE_ENV,
    params: { service: 'blog-admin' }
  });
  assert.equal(noSession.status, 401);
  assert.equal((await noSession.json()).error, 'session-required');

  const noToken = await studioPost({
    request: request('blog-admin', 'wrong', { action: 'list' }, { Cookie: await cookie() }),
    env: BASE_ENV,
    params: { service: 'blog-admin' }
  });
  assert.equal(noToken.status, 401);

  const crossOrigin = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action: 'list' }, { Cookie: await cookie(), Origin: 'https://evil.example' }),
    env: BASE_ENV,
    params: { service: 'blog-admin' }
  });
  assert.equal(crossOrigin.status, 403);
});

test('Studio proxy substitutes the server-only Supabase credential', async (t) => {
  let forwarded;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    forwarded = { url, init };
    return new Response(JSON.stringify({ ok: true, posts: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });
  const response = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action: 'list' }, { Cookie: await cookie() }),
    env: BASE_ENV,
    params: { service: 'blog-admin' }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, posts: [] });
  assert.equal(forwarded.url, 'https://dcnkhzrishphpismmxuu.supabase.co/functions/v1/blog-admin');
  assert.equal(forwarded.init.headers['x-edit-token'], 'server-only-upstream-secret');
  assert.notEqual(forwarded.init.headers['x-edit-token'], 'browser-edit-secret');
  assert.equal(forwarded.init.redirect, 'manual', 'workerd must accept the redirect mode without following the private upstream credential elsewhere');
  assert.match(response.headers.get('cloudflare-cdn-cache-control'), /no-store/);
});

test('Studio proxy rejects upstream redirects without following them or exposing a redirect to the browser', async (t) => {
  t.mock.method(console, 'warn', () => {});
  for (const status of [301, 302, 303, 304, 307, 308]) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push({ url, init });
      assert.equal(init.redirect, 'manual');
      return new Response(status === 304 ? null : JSON.stringify({ ok:true }), {
        status,
        headers:{ Location:'https://untrusted.example/private' }
      });
    });
    const response = await studioPost({
      request:request('work-upload', 'browser-edit-secret', { action:'list', folder:'Book' }, { Cookie:await cookie() }),
      env:BASE_ENV,
      params:{ service:'work-upload' }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok:false, error:'studio-upstream-invalid', upstreamStatus:status });
    assert.equal(response.headers.get('Location'), null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://dcnkhzrishphpismmxuu.supabase.co/functions/v1/work-upload');
  }
});

test('Studio proxy only permits known services, actions and safe work folders', async () => {
  const unknown = await studioPost({
    request: request('anything', 'browser-edit-secret', { action: 'list' }),
    env: BASE_ENV,
    params: { service: 'anything' }
  });
  assert.equal(unknown.status, 404);

  const unsafe = await studioPost({
    request: request('work-upload', 'browser-edit-secret', { action: 'list', folder: '../private' }, { Cookie: await cookie() }),
    env: BASE_ENV,
    params: { service: 'work-upload' }
  });
  assert.equal(unsafe.status, 400);

});

test('upstream authentication failures name server configuration without rejecting the browser editor password', async (t) => {
  for (const status of [401, 403]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error:'unauthorized', detail:'must not echo upstream details' }), { status }));
    const response = await studioPost({
      request:request('work-upload', 'browser-edit-secret', { action:'list', folder:'Book' }, { Cookie:await cookie() }),
      env:BASE_ENV,
      params:{ service:'work-upload' }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok:false, error:'studio-upstream-auth', upstreamStatus:status });
  }
});

test('missing GitHub credentials remain actionable even when the work service returns a server error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error:'no_github_token' }), { status:500 }));
  const response = await studioPost({
    request:request('work-upload', 'browser-edit-secret', { action:'list', folder:'Book' }, { Cookie:await cookie() }),
    env:BASE_ENV,
    params:{ service:'work-upload' }
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok:false, error:'studio-github-not-configured', upstreamStatus:500 });
});

test('Studio proxy distinguishes upstream timeouts from network failures without exposing exception details', async (t) => {
  for (const [name, code] of [
    ['TimeoutError', 'studio-upstream-timeout'],
    ['AbortError', 'studio-upstream-timeout'],
    ['TypeError', 'studio-upstream-unavailable']
  ]) {
    t.mock.method(globalThis, 'fetch', async () => {
      const error = new Error('private upstream token or network details');
      error.name = name;
      throw error;
    });
    const response = await studioPost({
      request: request('blog-admin', 'browser-edit-secret', { action:'list' }, { Cookie:await cookie() }),
      env: BASE_ENV,
      params: { service:'blog-admin' }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok:false, error:code });
  }
});

test('Studio proxy reports safe upstream status for failed or invalid responses without echoing their bodies', async (t) => {
  for (const [status, body, code] of [
    [503, JSON.stringify({ error:'private upstream error details' }), 'studio-upstream-failed'],
    [502, '<html>private upstream error details</html>', 'studio-upstream-invalid']
  ]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(body, { status }));
    const response = await studioPost({
      request: request('blog-admin', 'browser-edit-secret', { action:'list' }, { Cookie:await cookie() }),
      env: BASE_ENV,
      params: { service:'blog-admin' }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok:false, error:code, upstreamStatus:status });
  }
});

test('Studio proxy preserves timeout diagnostics while reading an upstream response body', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) {
      controller.error(new DOMException('private upstream details', 'AbortError'));
    }
  }), { status:200 }));
  const response = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action:'list' }, { Cookie:await cookie() }),
    env: BASE_ENV,
    params: { service:'blog-admin' }
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok:false, error:'studio-upstream-timeout', upstreamStatus:200 });
});

test('upstream failure logs identify each failure branch without credentials, request content or raw errors', async (t) => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const cases = [
    ['studio-upstream-auth', 401, () => new Response('private upstream body', { status:401 })],
    ['studio-github-not-configured', 500, () => new Response(JSON.stringify({ error:'no_github_token', detail:'private upstream body' }), { status:500 })],
    ['studio-upstream-failed', 503, () => new Response(JSON.stringify({ error:'private upstream body' }), { status:503 })],
    ['studio-upstream-invalid', 502, () => new Response('private upstream body', { status:502 })],
    ['studio-upstream-too-large', 200, () => new Response('private upstream body', { headers:{ 'Content-Length':String(6 * 1024 * 1024) } })],
    ['studio-upstream-timeout', undefined, () => { throw new DOMException('private exception content', 'TimeoutError'); }],
    ['studio-upstream-unavailable', undefined, () => { throw new TypeError('private exception content'); }],
    ['studio-upstream-timeout', 200, () => new Response(new ReadableStream({
      start(controller) { controller.error(new DOMException('private response error', 'AbortError')); }
    }))]
  ];
  for (const [code, upstreamStatus, upstream] of cases) {
    warnings.length = 0;
    t.mock.method(globalThis, 'fetch', async () => upstream());
    const response = await studioPost({
      request:request('work-upload', 'browser-edit-secret', { action:'list', folder:'Book', private:'private request content' }, { Cookie:await cookie() }),
      env:BASE_ENV,
      params:{ service:'work-upload' }
    });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, code);
    const expected = { event:'studio-proxy-failure', service:'work-upload', code };
    if (upstreamStatus !== undefined) expected.upstreamStatus = upstreamStatus;
    assert.deepEqual(warnings, [[expected]], 'each upstream failure emits one minimal structured event');
    assert.doesNotMatch(JSON.stringify(warnings), /private|browser-edit-secret|server-only-upstream-secret|another-independent-session-secret/);
  }
});

test('Studio proxy fails closed if its upstream credential is missing or browser-accessible', async (t) => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches += 1; throw new Error('must not forward'); });
  for (const upstream of ['', BASE_ENV.EDIT_TOKEN]) {
    const response = await studioPost({
      request: request('blog-admin', 'browser-edit-secret', { action: 'list' }, { Cookie: await cookie() }),
      env: { ...BASE_ENV, SUPABASE_EDIT_TOKEN: upstream },
      params: { service: 'blog-admin' }
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'studio-proxy-not-configured');
  }
  assert.equal(fetches, 0);
});

test('Studio proxy rejects inherited object names as unknown services', async () => {
  for (const service of ['__proto__', 'constructor', 'toString']) {
    const response = await studioPost({ request: request(service, '', {}), env: BASE_ENV, params: { service } });
    assert.equal(response.status, 404);
  }
});

test('Studio proxy stops reading oversized chunked upstream responses early', async (t) => {
  let canceled = false;
  let readCount = 0;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    pull(controller) {
      readCount += 1;
      controller.enqueue(new Uint8Array(1024 * 1024));
      if (readCount >= 30) controller.close();
    },
    cancel() { canceled = true; }
  })));
  const response = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action: 'list' }, { Cookie: await cookie() }),
    env: BASE_ENV,
    params: { service: 'blog-admin' }
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok:false, error:'studio-upstream-too-large', upstreamStatus:200 });
  assert.equal(canceled, true);
  assert.ok(readCount < 10);
});

test('editor password rotation stays local, stores only a digest and retires the bootstrap token', async (t) => {
  const state = { digest: null };
  const DB = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async run() {
          if (sql.includes('INSERT INTO studio_auth')) state.digest = bindings[0];
          return { meta: { changes: 1 } };
        },
        async first() { return state.digest ? { digest: state.digest } : null; }
      };
    }
  };
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetches += 1;
    return new Response(JSON.stringify({ ok: true, posts: [] }), { status: 200 });
  });
  const env = { ...BASE_ENV, DB };
  const sessionCookie = await cookie();
  const changed = await studioPost({
    request: request('set-token', 'browser-edit-secret', { new_token: 'replacement-edit-secret' }, { Cookie: sessionCookie }),
    env,
    params: { service: 'set-token' }
  });
  assert.equal(changed.status, 200);
  assert.equal(fetches, 0, 'the browser credential must not mutate the upstream Supabase secret');
  assert.ok(state.digest);
  assert.notEqual(state.digest, 'replacement-edit-secret');

  const oldToken = await studioPost({
    request: request('blog-admin', 'browser-edit-secret', { action: 'list' }, { Cookie: sessionCookie }),
    env,
    params: { service: 'blog-admin' }
  });
  assert.equal(oldToken.status, 401);

  const newToken = await studioPost({
    request: request('blog-admin', 'replacement-edit-secret', { action: 'list' }, { Cookie: sessionCookie }),
    env,
    params: { service: 'blog-admin' }
  });
  assert.equal(newToken.status, 200);
  assert.equal(fetches, 1);
});
