import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { keyedDigest, takeRateLimit } from '../functions/api/_session.js';
import { onRequestPost } from '../functions/api/2fa.js';

const ORIGIN = 'https://bqurtas.com';
const SECRET = 'test-only-independent-session-secret-at-least-32-bytes';
const CHALLENGE = '12345678-1234-1234-1234-123456789abc';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

/* Execute the actual prepared SQL against SQLite, which also underlies D1.
   Parallel handlers share one database and compete for the same rows. */
function challengeStore(initial = []) {
  const database = new DatabaseSync(':memory:');
  database.exec('CREATE TABLE twofa (id TEXT PRIMARY KEY, code TEXT NOT NULL, exp INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0)');
  database.exec('CREATE TABLE api_rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)');
  const insert = database.prepare('INSERT INTO twofa (id,code,exp,tries) VALUES (?,?,?,?)');
  for (const row of initial) insert.run(row.id, row.code, row.exp, row.tries);
  return {
    close() { database.close(); },
    prepare(sql) {
      const statement = database.prepare(sql);
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return statement.get(...bindings) || null; },
        async run() {
          return { meta: { changes: Number(statement.run(...bindings).changes) } };
        }
      };
    }
  };
}

function environment(DB) {
  return {
    SESSION_SECRET: SECRET,
    DASH_PIN: '123456',
    TOTP_SECRET,
    DB,
    RATE_LIMITER: { limit: async () => ({ success: true }) }
  };
}

function verify(env, id, code) {
  return onRequestPost({
    env,
    request: new Request(`${ORIGIN}/api/2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '192.0.2.50' },
      body: JSON.stringify({ action: 'verify', pin: '123456', id, code })
    })
  });
}

async function emailStore() {
  return challengeStore([{
    id: CHALLENGE,
    code: await keyedDigest(SECRET, 'twofa-code|123456'),
    exp: Date.now() + 300_000,
    tries: 0
  }]);
}

async function totp(time) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const letter of TOTP_SECRET) bits += alphabet.indexOf(letter).toString(2).padStart(5, '0');
  const secret = new Uint8Array(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(0, BigInt(Math.floor(time / 30_000)));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = digest[19] & 15;
  const number = new DataView(digest.buffer).getUint32(offset) & 0x7fffffff;
  return String(number % 1_000_000).padStart(6, '0');
}

test('simultaneous email-code verification issues exactly one admin session', async (t) => {
  const env = environment(await emailStore());
  t.after(() => env.DB.close());
  const responses = await Promise.all(Array.from({ length: 4 }, () => verify(env, CHALLENGE, '123456')));
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(responses.filter((response) => response.headers.has('set-cookie')).length, 1);
  assert.notEqual((await verify(env, CHALLENGE, '123456')).status, 200);
});

test('parallel incorrect codes cannot exceed the five-attempt challenge budget', async (t) => {
  const env = environment(await emailStore());
  t.after(() => env.DB.close());
  const responses = await Promise.all(Array.from({ length: 8 }, () => verify(env, CHALLENGE, '000000')));
  assert.equal(responses.filter((response) => response.status === 401).length, 5);
  assert.equal(responses.filter((response) => response.status === 429).length, 3);
  assert.ok(responses.every((response) => !response.headers.has('set-cookie')));
  const final = await verify(env, CHALLENGE, '123456');
  assert.equal(final.status, 429);
  assert.equal((await final.json()).error, 'too-many');
});

test('TOTP verification consumes a timestep once and accepts the next fresh code', async (t) => {
  let now = Date.UTC(2026, 9, 18, 10, 0, 0);
  t.mock.method(Date, 'now', () => now);
  const env = environment(challengeStore());
  t.after(() => env.DB.close());
  const code = await totp(now);
  const responses = await Promise.all([verify(env, 'totp', code), verify(env, 'totp', code)]);
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(responses.filter((response) => response.headers.has('set-cookie')).length, 1);
  assert.equal((await verify(env, 'totp', code)).status, 401);
  now += 30_000;
  assert.equal((await verify(env, 'totp', await totp(now))).status, 200);
});

test('a malformed rate-limiter result never grants an authentication attempt', async () => {
  for (const result of [null, {}, { success: false }, { success: 'true' }]) {
    const slot = await takeRateLimit({ RATE_LIMITER: { limit: async () => result } }, 'test', { limit: 8, windowMs: 60_000 });
    assert.equal(slot.ok, false);
  }
});
