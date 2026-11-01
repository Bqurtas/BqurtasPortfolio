import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { issueSession } from '../functions/api/_session.js';
import { onRequestPost as contentPost } from '../functions/api/content.js';
import { onRequestPost as assistantPost } from '../functions/api/assistant.js';
import { onRequestPost as studioPost } from '../functions/api/studio/[service].js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'test-only-editor-auth-session-secret-over-32-bytes';
const EDIT_TOKEN = 'existing-owner-editor-password';

/* Execute the real D1 SQL against SQLite instead of simulating its counters.
   Credential-read counts establish that blocked guesses stop before the
   private credential store, including under concurrent requests. */
function store() {
  const database = new DatabaseSync(':memory:');
  const state = { credentialReads: 0, failRates: false };
  return {
    state,
    close() { database.close(); },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
    prepare(sql) {
      if (state.failRates && sql.includes('api_rate')) throw new Error('rate-store-unavailable');
      if (sql.includes('SELECT digest FROM studio_auth')) state.credentialReads += 1;
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return database.prepare(sql).get(...bindings) || null; },
        async all() { return { results: database.prepare(sql).all(...bindings) }; },
        async run() { return { meta: { changes: Number(database.prepare(sql).run(...bindings).changes) } }; }
      };
    }
  };
}

const targets = [
  { path: '/api/content', handler: contentPost, body: { title: 'A published note' } },
  { path: '/api/assistant', handler: assistantPost, body: { messages: [{ role: 'user', content: 'Hello' }] } },
  { path: '/api/studio/blog-admin', handler: studioPost, params: { service: 'blog-admin' }, body: { action: 'list' } },
  { path: '/api/studio/work-upload', handler: studioPost, params: { service: 'work-upload' }, body: { action: 'list', folder: 'Poster' } }
];

async function setup(t) {
  const DB = store();
  t.after(() => DB.close());
  const env = {
    DB,
    SESSION_SECRET,
    EDIT_TOKEN,
    GITHUB_TOKEN: 'server-only-github-repository-token'
  };
  const cookie = (await issueSession(env)).split(';', 1)[0];
  return { env, cookie, DB };
}

function call(target, env, cookie, token, attempt = 0) {
  return target.handler({
    env,
    params: target.params,
    request: new Request(ORIGIN + target.path, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'x-edit-token': token,
        'CF-Connecting-IP': '192.0.2.80',
        'User-Agent': `owner-browser-${attempt}`
      },
      body: JSON.stringify(target.body)
    })
  });
}

test('editor-password guesses share one durable budget across all private APIs', async (t) => {
  const { env, cookie, DB } = await setup(t);
  let upstreamCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => { upstreamCalls += 1; throw new Error('must not call upstream'); });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await call(targets[attempt % targets.length], env, cookie, `wrong-${attempt}`, attempt);
    assert.equal(response.status, 401);
  }
  assert.equal(DB.state.credentialReads, 8);

  for (const target of targets) {
    const response = await call(target, env, cookie, 'another-guess', 100);
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error, 'rate-limited');
    assert.ok(Number(response.headers.get('Retry-After')) > 0);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
  assert.equal(DB.state.credentialReads, 8, 'blocked guesses must not query the editor credential');
  assert.equal(upstreamCalls, 0);
});

test('parallel editor-password guesses cannot exceed the durable attempt budget', async (t) => {
  const { env, cookie, DB } = await setup(t);
  const responses = await Promise.all(Array.from({ length: 16 }, (_, attempt) =>
    call(targets[attempt % targets.length], env, cookie, `wrong-${attempt}`, attempt)));
  assert.equal(responses.filter(response => response.status === 401).length, 8);
  assert.equal(responses.filter(response => response.status === 429).length, 8);
  assert.equal(DB.state.credentialReads, 8);
});

test('valid publishing and assistant calls clear failed attempts without spending a binding auth budget', async (t) => {
  const { env, cookie } = await setup(t);
  let bindingCalls = 0;
  env.RATE_LIMITER = { limit: async () => { bindingCalls += 1; return { success: true }; } };
  t.mock.method(globalThis, 'fetch', async () => Response.json([]));

  for (let attempt = 0; attempt < 7; attempt += 1) {
    assert.equal((await call(targets[attempt % targets.length], env, cookie, 'wrong')).status, 401);
  }
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const response = await call(targets[attempt % targets.length], env, cookie, EDIT_TOKEN);
    assert.equal(response.status, 200);
  }
  assert.equal(bindingCalls, 32, 'only the existing API usage limits should consume the binding');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal((await call(targets[attempt % targets.length], env, cookie, 'wrong-again')).status, 401);
  }
  assert.equal((await call(targets[0], env, cookie, 'one-too-many')).status, 429);
});

test('editor auth fails closed when its durable store fails even if a binding would allow it', async (t) => {
  const { env, cookie, DB } = await setup(t);
  DB.state.failRates = true;
  env.RATE_LIMITER = { limit: async () => ({ success: true }) };
  for (const target of targets) {
    const response = await call(target, env, cookie, EDIT_TOKEN);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'rate-limit-unavailable');
  }
  assert.equal(DB.state.credentialReads, 0);
});

test('requests without a verified session never consume the editor-password budget', async (t) => {
  const { env, DB } = await setup(t);
  DB.state.failRates = true;
  for (const target of targets) {
    const response = await call(target, env, '', EDIT_TOKEN);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'session-required');
  }
  assert.equal(DB.state.credentialReads, 0);
});
