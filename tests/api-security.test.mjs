import test from 'node:test';
import assert from 'node:assert/strict';

import { hasSession, issueSession } from '../functions/api/_session.js';
import { onRequestGet as twoFactorStatus, onRequestPost as twoFactorPost } from '../functions/api/2fa.js';
import { onRequestPost as contentPost } from '../functions/api/content.js';
import { onRequestGet as statsGet } from '../functions/api/stats.js';
import { onRequestPost as assistantPost } from '../functions/api/assistant.js';
import { onRequestPost as hitPost } from '../functions/api/hit.js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'a-strong-independent-session-secret-32-bytes';

async function signedCookie(env = { SESSION_SECRET }) {
  const setCookie = await issueSession(env);
  return setCookie.split(';', 1)[0];
}

test('admin sessions use an independent strong __Host cookie', async () => {
  assert.equal(await issueSession({ DASH_PIN: 'pin', EDIT_TOKEN: 'token' }), null);
  assert.equal(await issueSession({ SESSION_SECRET: 'too-short' }), null);

  const value = await issueSession({ SESSION_SECRET });
  assert.match(value, /^__Host-bq_admin_session=/);
  assert.match(value, /; Path=\/;/);
  assert.match(value, /; HttpOnly;/);
  assert.match(value, /; Secure;/);
  assert.match(value, /; SameSite=Strict$/);

  const request = new Request(`${ORIGIN}/api/2fa`, { headers: { Cookie: value.split(';', 1)[0] } });
  assert.equal(await hasSession(request, { SESSION_SECRET }), true);
  assert.equal(await hasSession(request, { SESSION_SECRET: `${SESSION_SECRET}!different` }), false);
});

test('2FA status is server-backed and logout always expires the host cookie', async () => {
  const cookie = await signedCookie();
  const status = await twoFactorStatus({
    request: new Request(`${ORIGIN}/api/2fa`, { headers: { Cookie: cookie } }),
    env: { SESSION_SECRET, DASH_PIN: '123456', TOTP_SECRET: 'JBSWY3DPEHPK3PXP', DB: {} }
  });
  assert.deepEqual(await status.json(), { ok: true, configured: true, authenticated: true });

  const logout = await twoFactorPost({
    request: new Request(`${ORIGIN}/api/2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
      body: JSON.stringify({ action: 'logout' })
    }),
    env: {}
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /^__Host-bq_admin_session=;/);
  assert.match(logout.headers.get('cache-control'), /no-store/);
});

test('2FA honours the selected configured email before its TOTP fallback', async (t) => {
  let submitted;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    submitted = { url, body: JSON.parse(init.body) };
    return new Response('{}', { status: 200 });
  });
  const statement = {
    bind() { return this; },
    async run() { return { meta: { changes: 1 } }; }
  };
  const response = await twoFactorPost({
    request: new Request(`${ORIGIN}/api/2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'User-Agent': 'test', 'CF-Connecting-IP': '192.0.2.2' },
      body: JSON.stringify({ action: 'send', pin: '123456', recipient: 'primary' })
    }),
    env: {
      SESSION_SECRET,
      DASH_PIN: '123456',
      TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
      WEB3FORMS_KEY: 'primary-key',
      TWOFA_SENDER_EMAIL: 'security@example.com',
      DB: { prepare: () => statement },
      RATE_LIMITER: { limit: async () => ({ success: true }) }
    }
  });
  const result = await response.json();
  assert.equal(result.via, 'email');
  assert.equal(result.recipient, 'primary');
  assert.equal(submitted.url, 'https://api.web3forms.com/submit');
  assert.equal(submitted.body.access_key, 'primary-key');
});

test('content mutations require both the signed session and edit header', async () => {
  const cookie = await signedCookie();
  const env = { SESSION_SECRET, EDIT_TOKEN: 'edit-secret', DB: {} };
  const body = JSON.stringify({ title: 'Test' });
  const base = { method: 'POST', body, headers: { 'Content-Type': 'application/json', Origin: ORIGIN } };

  const tokenOnly = await contentPost({
    request: new Request(`${ORIGIN}/api/content`, { ...base, headers: { ...base.headers, 'x-edit-token': 'edit-secret' } }),
    env
  });
  assert.equal(tokenOnly.status, 401);

  const sessionOnly = await contentPost({
    request: new Request(`${ORIGIN}/api/content`, { ...base, headers: { ...base.headers, Cookie: cookie } }),
    env
  });
  assert.equal(sessionOnly.status, 401);
});

test('analytics token in a URL is never accepted', async () => {
  const cookie = await signedCookie();
  const response = await statsGet({
    request: new Request(`${ORIGIN}/api/stats?token=stats-secret`, {
      headers: { Origin: ORIGIN, Cookie: cookie }
    }),
    env: { SESSION_SECRET, STATS_TOKEN: 'stats-secret', DB: {} }
  });
  assert.equal(response.status, 401);
});

test('assistant rejects cross-origin, partial auth and oversized prompts before model use', async () => {
  const cookie = await signedCookie();
  const env = {
    SESSION_SECRET,
    EDIT_TOKEN: 'edit-secret',
    DB: {
      prepare() {
        return {
          async run() { return { meta: { changes: 1 } }; },
          async first() { return null; }
        };
      }
    },
    RATE_LIMITER: { limit: async () => ({ success: true }) }
  };
  const message = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });

  const partial = await assistantPost({
    request: new Request(`${ORIGIN}/api/assistant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'x-edit-token': 'edit-secret' }, body: message
    }),
    env
  });
  assert.equal(partial.status, 401);

  const crossOrigin = await assistantPost({
    request: new Request(`${ORIGIN}/api/assistant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', Cookie: cookie, 'x-edit-token': 'edit-secret' }, body: message
    }),
    env
  });
  assert.equal(crossOrigin.status, 403);

  const oversized = await assistantPost({
    request: new Request(`${ORIGIN}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie, 'x-edit-token': 'edit-secret' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(25_000) }] })
    }),
    env
  });
  assert.equal(oversized.status, 413);
});

test('hit collection fails closed without its private analytics salt', async () => {
  const response = await hitPost({
    request: new Request(`${ORIGIN}/api/hit`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'User-Agent': 'Mozilla/5.0', 'CF-Connecting-IP': '192.0.2.1' },
      body: JSON.stringify({ p: '/', l: 'en' })
    }),
    env: { DB: {} }
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('cloudflare-cdn-cache-control'), /no-store/);
});
