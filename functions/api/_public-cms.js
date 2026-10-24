import { inputErrorResponse, isSameOrigin, json, rateKey, readJson, takeRateLimit } from './_session.js';
export async function publicMutation(request, env, scope, limit) {
  if (!env.DB) return { response: json({ ok: false, error: 'content-unavailable' }, 503) };
  if (!isSameOrigin(request)) return { response: json({ ok: false, error: 'forbidden-origin' }, 403) };
  const slot = await takeRateLimit(env, await rateKey(request, env, scope), { limit, windowMs: 3600000, durable: true });
  if (slot.unavailable) return { response: json({ ok: false, error: 'rate-limit-unavailable' }, 503) };
  if (!slot.ok) return { response: json({ ok: false, error: 'rate-limited' }, 429, { 'Retry-After': String(slot.retryAfter) }) };
  try { return { body: await readJson(request, 16 * 1024) }; }
  catch (error) { return { response: inputErrorResponse(error) }; }
}
