import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { issueSession, keyedDigest } from '../functions/api/_session.js';
import { onRequestPost as translate } from '../functions/api/translate.js';
import { onRequestPost as assistant } from '../functions/api/assistant.js';
import { onRequestPost as hit } from '../functions/api/hit.js';
import { onRequestGet as stats } from '../functions/api/stats.js';
import { onRequestGet as twofaStatus } from '../functions/api/2fa.js';
import { runWorkersText } from '../functions/api/_workers-ai.js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'test-only-cloudflare-runtime-signing-secret-over-32-bytes';
const EDIT_TOKEN = 'test-only-studio-editor';
const IP = '192.0.2.122';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';

function store(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  return {
    sqlite,
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return sqlite.prepare(sql).get(...bindings) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...bindings).changes) } }; }
      };
    }
  };
}

async function context(t, extra = {}) {
  const env = { DB: store(t), SESSION_SECRET, EDIT_TOKEN, STATS_TOKEN: 'test-stats', ...extra };
  const cookie = (await issueSession(env)).split(';', 1)[0];
  function request(path, body, headers = {}) {
    return new Request(ORIGIN + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: ORIGIN, Cookie: cookie, 'x-edit-token': EDIT_TOKEN,
        'x-stats-token': env.STATS_TOKEN, 'Content-Type': 'application/json',
        'CF-Connecting-IP': IP, 'User-Agent': USER_AGENT, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }
  return { env, request };
}

test('private AI and translation use only the Cloudflare binding even with retired keys present', async (t) => {
  const calls = [];
  const { env, request } = await context(t, {
    ANTHROPIC_API_KEY: 'retired-key',
    AI: { async run(model, input) { calls.push({ model, input }); return { response: 'وەرگێڕان' }; } }
  });
  t.mock.method(globalThis, 'fetch', () => { assert.fail('no external model request is allowed'); });
  const response = await translate({ env, request: request('/api/translate', { text: 'A careful practice.', target: 'ku' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, text: 'وەرگێڕان' });
  assert.match(calls[0].input.messages[0].content, /Sorani Kurdish/);
  assert.equal(calls[0].input.messages[1].content, 'A careful practice.');
  assert.equal((await assistant({ env, request: request('/api/assistant', { messages: [{ role: 'user', content: 'A short reply' }] }) })).status, 200);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.model === '@cf/meta/llama-3.1-8b-instruct-fp8'));
});

test('translation requires both owner credentials, validates bounded text, and fails closed without AI', async (t) => {
  let modelCalls = 0;
  const { env, request } = await context(t, { AI: { async run() { modelCalls += 1; return { response: 'translated' }; } } });
  const text = { text: 'Hello', target: 'fr' };
  for (const [headers, expected] of [
    [{ Cookie: '' }, 401], [{ 'x-edit-token': '' }, 401],
    [{ 'x-edit-token': 'wrong' }, 401], [{ Origin: 'https://another.example' }, 403]
  ]) {
    assert.equal((await translate({ env, request: request('/api/translate', text, headers) })).status, expected);
  }
  for (const body of [{ ...text, target: '__proto__' }, { ...text, text: '' }, { ...text, text: 'x'.repeat(4001) }]) {
    assert.equal((await translate({ env, request: request('/api/translate', body) })).status, 400);
  }
  assert.equal((await translate({ env, request: request('/api/translate', { ...text, text: 'x'.repeat(25_000) }) })).status, 413);
  assert.equal(modelCalls, 0);
  delete env.AI;
  const unavailable = await translate({ env, request: request('/api/translate', text) });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { ok: false, error: 'translation-unavailable' });
});

test('translation respects its durable usage limit before model invocation', async (t) => {
  let calls = 0;
  const { env, request } = await context(t, { AI: { async run() { calls += 1; return { response: 'Hello' }; } } });
  const body = { text: 'Bonjour', target: 'en' };
  assert.equal((await translate({ env, request: request('/api/translate', body) })).status, 200);
  // Raise only the translation usage count, retaining the real D1 SQL path.
  env.DB.sqlite.prepare('UPDATE api_rate SET n=120').run();
  const blocked = await translate({ env, request: request('/api/translate', body) });
  assert.equal(blocked.status, 429);
  assert.equal(calls, 1);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('Workers AI rejects empty or excessive replies and bounds a stalled response', async () => {
  for (const response of ['', ' '.repeat(10), 'x'.repeat(24_001), undefined]) {
    await assert.rejects(runWorkersText({ AI: { run: async () => ({ response }) } }, {}), /ai-response-invalid/);
  }
  await assert.rejects(runWorkersText({ AI: { run: () => new Promise(() => {}) } }, {}, { timeoutMs: 10 }), /ai-timeout/);
});

test('retired email delivery alone cannot make authenticator login appear configured', async () => {
  const response = await twofaStatus({
    request: new Request(ORIGIN + '/api/2fa'),
    env: { SESSION_SECRET, DASH_PIN: 'test-pin', DB: {}, WEB3FORMS_KEY: 'retired', TWOFA_SENDER_EMAIL: 'old@example.com' }
  });
  const body = await response.json();
  assert.equal(body.requirements.secondFactor, false);
  assert.equal(body.configured, false);
});

test('first-party analytics derive a separate private key and count archive and work pages in D1', async (t) => {
  const { env, request } = await context(t);
  const paths = ['/', '/ku/bio', '/design/book/1', '/archive/', '/archive/photos/2/'];
  for (const p of paths) {
    assert.equal((await hit({ env, request: request('/api/hit', { p, l: 'ku', r: 'https://example.org/private?personal=value' }) })).status, 204);
  }
  const rows = env.DB.sqlite.prepare('SELECT * FROM hits').all();
  assert.equal(rows.length, paths.length);
  const derived = await keyedDigest(SESSION_SECRET, 'bqurtas:analytics-key:v1');
  const expectedVisitor = (await keyedDigest(derived, `visitor|${IP}|${USER_AGENT}`)).slice(0, 32);
  assert.ok(rows.every(row => row.vid === expectedVisitor && row.ref === 'example.org'));
  const serialized = JSON.stringify(rows);
  for (const forbidden of [SESSION_SECRET, derived, IP, USER_AGENT, 'personal=value', '/private']) assert.ok(!serialized.includes(forbidden));
  env.UMAMI_API_KEY = 'retired-analytics-key';
  t.mock.method(globalThis, 'fetch', () => assert.fail('D1 reporting must not call an external analytics provider'));
  const response = await stats({ env, request: request('/api/stats') });
  const body = await response.json();
  assert.equal(body.views, paths.length);
  assert.equal(body.visitors, 1);
});

test('analytics preserves old visits when adding visitor metadata and initializes empty databases', async (t) => {
  const { env, request } = await context(t);
  env.DB.sqlite.exec("CREATE TABLE hits (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, path TEXT NOT NULL, ref TEXT DEFAULT '', country TEXT DEFAULT '', device TEXT DEFAULT '', lang TEXT DEFAULT '')");
  env.DB.sqlite.prepare('INSERT INTO hits (ts,path) VALUES (?,?)').run(Date.now(), '/');
  const result = await stats({ env, request: request('/api/stats') });
  const body = await result.json();
  assert.equal(body.views, 1);
  assert.equal(body.visitors, 0, 'unknown historic visitor IDs are not one real visitor');
  assert.ok(env.DB.sqlite.prepare('PRAGMA table_info(hits)').all().some(column => column.name === 'vid'));
  const fresh = await context(t);
  const empty = await stats({ env: fresh.env, request: fresh.request('/api/stats') });
  assert.equal((await empty.json()).views, 0);
});

test('hit collection rejects unrecognized routes, cross-origin traffic, and excess visits', async (t) => {
  const { env, request } = await context(t);
  for (const p of ['/api/studio/blog-admin', '/arbitrary/private', '/archive/photos/999/', '/design/unknown/1', '/design/book/0']) {
    await hit({ env, request: request('/api/hit', { p }) });
  }
  await hit({ env, request: request('/api/hit', { p: '/' }, { Origin: 'https://another.example' }) });
  for (let i = 0; i < 32; i++) await hit({ env, request: request('/api/hit', { p: '/' }) });
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM hits').get().n, 30);
});
