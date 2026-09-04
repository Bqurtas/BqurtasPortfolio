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
    assert.doesNotMatch(source, /functions\/v1\/(?:work-upload|set-token|blog-admin|latest-admin|projects-admin)/);
    for (const service of ['work-upload', 'set-token', 'blog-admin', 'latest-admin', 'projects-admin']) {
      assert.match(source, new RegExp(`/api/studio/${service}`));
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
  assert.match(response.headers.get('cloudflare-cdn-cache-control'), /no-store/);
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

  const sharedToken = await studioPost({
    request: request('blog-admin', 'same-secret', { action: 'list' }, { Cookie: await cookie() }),
    env: { ...BASE_ENV, EDIT_TOKEN: 'same-secret', SUPABASE_EDIT_TOKEN: 'same-secret' },
    params: { service: 'blog-admin' }
  });
  assert.equal(sharedToken.status, 503);
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
