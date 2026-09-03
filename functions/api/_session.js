/* A real session for the admin surfaces.

   Before this, passing the second factor only made the browser write a flag
   into sessionStorage: the server never learned that anyone had authenticated,
   and every privileged endpoint still let through whoever held EDIT_TOKEN or
   STATS_TOKEN. Those tokens lived in localStorage and survived logout. So the
   OTP was a lock on the door of a building with no walls.

   The verified session is now issued and checked server-side: a value the
   server signs, in a cookie the page's own JavaScript cannot read, valid for
   two hours, and revocable. */

const COOKIE = 'bq_admin';
const TTL_MS = 2 * 60 * 60 * 1000;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

/* Constant time: a comparison that returns early tells an attacker how much of
   a forged signature was right. */
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function signingSecret(env) {
  return String(env.SESSION_SECRET || env.DASH_PIN || env.EDIT_TOKEN || '');
}

export async function issueSession(env) {
  const secret = signingSecret(env);
  if (!secret) return null;
  const expires = Date.now() + TTL_MS;
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expires}.${nonce}`;
  const value = `${payload}.${await hmac(secret, payload)}`;
  return `${COOKIE}=${value}; Path=/; Max-Age=${Math.floor(TTL_MS / 1000)}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSession() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function hasSession(request, env) {
  const secret = signingSecret(env);
  if (!secret) return false;
  const raw = request.headers.get('Cookie') || '';
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  if (!hit) return false;
  const parts = hit.slice(COOKIE.length + 1).split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, sig] = parts;
  if (!/^\d{10,16}$/.test(expires) || Number(expires) < Date.now()) return false;
  return equal(sig, await hmac(secret, `${expires}.${nonce}`));
}
