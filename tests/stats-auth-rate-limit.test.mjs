import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { issueSession } from '../functions/api/_session.js';
import { onRequestGet as stats } from '../functions/api/stats.js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'test-only-stats-session-secret-more-than-32-bytes';
const STATS_TOKEN = 'test-only-private-analytics-token';

async function setup(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const state = { databaseCalls: 0, rateCalls: 0, analyticsReads: 0, failRates: false };
  const DB = {
    prepare(sql) {
      state.databaseCalls += 1;
      if (sql.includes('api_rate')) state.rateCalls += 1;
      if (state.failRates && sql.includes('api_rate')) throw new Error('rate-store-unavailable');
      if (/FROM hits\b/.test(sql)) state.analyticsReads += 1;
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return sqlite.prepare(sql).get(...bindings) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...bindings).changes) } }; }
      };
    }
  };
  const env = { DB, SESSION_SECRET, STATS_TOKEN };
  const cookie = (await issueSession(env)).split(';', 1)[0];
  function call(token, attempt = 0, headers = {}) {
    return stats({
      env,
      request: new Request(ORIGIN + '/api/stats', {
        headers: {
          Origin: ORIGIN,
          Cookie: cookie,
          'x-stats-token': token,
          'CF-Connecting-IP': '192.0.2.81',
          'User-Agent': `analytics-browser-${attempt}`,
          ...headers
        }
      })
    });
  }
  return { env, state, call };
}

test('a verified session cannot make unlimited analytics-token guesses by rotating user agents', async (t) => {
  const { state, call } = await setup(t);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await call(`wrong-${attempt}`, attempt);
    assert.equal(response.status, attempt < 8 ? 401 : 429);
    if (attempt >= 8) {
      assert.equal((await response.json()).error, 'rate-limited');
      assert.ok(Number(response.headers.get('Retry-After')) > 0);
      assert.match(response.headers.get('Cache-Control'), /no-store/);
    }
  }
  assert.equal(state.analyticsReads, 0);
});

test('parallel analytics-token guesses reserve the same durable budget atomically', async (t) => {
  const { state, call } = await setup(t);
  const responses = await Promise.all(Array.from({ length: 32 }, (_, attempt) => call(`wrong-${attempt}`, attempt)));
  assert.equal(responses.filter(response => response.status === 401).length, 8);
  assert.equal(responses.filter(response => response.status === 429).length, 24);
  assert.equal(state.analyticsReads, 0);
});

test('valid analytics tokens clear failed guesses while retaining the 60-per-minute read quota', async (t) => {
  const { state, call } = await setup(t);
  for (let attempt = 0; attempt < 7; attempt += 1) {
    assert.equal((await call('wrong')).status, 401);
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await call(STATS_TOKEN);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).views, 0);
  }
  const readsBeforeLimit = state.analyticsReads;
  assert.ok(readsBeforeLimit > 0);
  const limited = await call(STATS_TOKEN);
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, 'rate-limited');
  assert.equal(state.analyticsReads, readsBeforeLimit);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal((await call('wrong-again')).status, 401);
  }
  assert.equal((await call('one-too-many')).status, 429);
});

test('analytics auth fails closed if D1 rate limiting fails even with an allowing rate binding', async (t) => {
  const { env, state, call } = await setup(t);
  let bindingCalls = 0;
  env.RATE_LIMITER = { limit: async () => { bindingCalls += 1; return { success: true }; } };
  state.failRates = true;
  for (const token of ['wrong', STATS_TOKEN]) {
    const response = await call(token);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'rate-limit-unavailable');
  }
  assert.equal(bindingCalls, 0);
  assert.equal(state.analyticsReads, 0);
});

test('analytics origin, signed session and missing-token gates run before rate or analytics access', async (t) => {
  const { state, call } = await setup(t);
  for (const [token, headers, status, error] of [
    [STATS_TOKEN, { Origin: 'https://another.example' }, 403, 'forbidden-origin'],
    [STATS_TOKEN, { Cookie: '' }, 401, 'session-required']
  ]) {
    const response = await call(token, 0, headers);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, error);
  }
  assert.equal(state.databaseCalls, 0);
  const missingToken = await call('');
  assert.equal(missingToken.status, 401);
  assert.equal((await missingToken.json()).error, 'unauthorized');
  assert.equal(state.rateCalls, 0, 'valid session revocation checks may read D1, but must not reserve token attempts');
  assert.equal(state.analyticsReads, 0);
});
