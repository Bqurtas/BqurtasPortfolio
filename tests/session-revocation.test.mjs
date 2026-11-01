import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { hasSession, issueSession } from '../functions/api/_session.js';
import { onRequestPost as logout, onRequestGet as status } from '../functions/api/2fa.js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'test-only-session-revocation-independent-secret';
function database(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const DB = { sqlite, fail: false, prepare(sql) {
    if (DB.fail) throw new Error('database unavailable');
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; }
    };
  } };
  return DB;
}
const signedCookie = async env => (await issueSession(env)).split(';', 1)[0];
const read = cookie => new Request(ORIGIN + '/api/2fa', { headers: { Cookie: cookie } });
const request = (cookie, origin = ORIGIN) => new Request(ORIGIN + '/api/2fa', {
  method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'logout' })
});

test('logout revokes copied cookies across requests and isolates other signed sessions', async t => {
  const env = { SESSION_SECRET, DB: database(t) };
  const cookie = await signedCookie(env), other = await signedCookie(env);
  assert.equal(await hasSession(read(cookie), env), true);
  const response = await logout({ env, request: request(cookie) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  // A second binding wrapper simulates another Worker with no shared JS cache.
  const secondEdge = { SESSION_SECRET, DB: { prepare: sql => env.DB.prepare(sql) } };
  assert.equal(await hasSession(read(cookie), secondEdge), false);
  assert.equal(await hasSession(read(other), secondEdge), true);
  assert.equal((await (await status({ env: secondEdge, request: read(cookie) })).json()).authenticated, false);
  const rows = env.DB.sqlite.prepare('SELECT * FROM studio_session_revocations').all();
  assert.equal(rows.length, 1);
  assert.match(rows[0].id, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!cookie.includes(rows[0].id), 'the revocation identifier is a separate keyed digest');
  assert.equal((await logout({ env, request: request(cookie) })).status, 200, 'logout is idempotent');
});

test('failed revocation keeps the cookie for retry and never reports success', async t => {
  const env = { SESSION_SECRET, DB: database(t) };
  const cookie = await signedCookie(env);
  env.DB.fail = true;
  const failed = await logout({ env, request: request(cookie) });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).error, 'session-revocation-unavailable');
  assert.equal(failed.headers.get('set-cookie'), null);
  assert.equal(await hasSession(read(cookie), env), false, 'private APIs fail closed while revocation lookup is unavailable');
  env.DB.fail = false;
  assert.equal((await logout({ env, request: request(cookie) })).status, 200);
  assert.equal(await hasSession(read(cookie), env), false);
});

test('invalid, expired and absent cookies require no database work to log out', async t => {
  const env = { SESSION_SECRET, DB: { prepare() { assert.fail('invalid cookies must not query D1'); } } };
  const cookie = await signedCookie(env);
  const now = Date.now();
  t.mock.method(Date, 'now', () => now + 3 * 60 * 60 * 1000);
  for (const value of ['', '__Host-bq_admin_session=invalid', cookie]) {
    assert.equal(await hasSession(read(value), env), false);
    const response = await logout({ env, request: request(value) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  }
});

test('cross-origin logout cannot revoke a valid session', async t => {
  const env = { SESSION_SECRET, DB: database(t) };
  const cookie = await signedCookie(env);
  const response = await logout({ env, request: request(cookie, 'https://unrelated.example') });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(await hasSession(read(cookie), env), true);
});

test('expired revocations are pruned only after a current revocation is stored', async t => {
  const env = { SESSION_SECRET, DB: database(t) };
  const cookie = await signedCookie(env);
  await hasSession(read(cookie), env);
  env.DB.sqlite.prepare('INSERT INTO studio_session_revocations VALUES (?,?)').run('expired', Date.now() - 1);
  assert.equal((await logout({ env, request: request(cookie) })).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM studio_session_revocations').get().n, 1);
  assert.equal(await hasSession(read(cookie), env), false);
});
