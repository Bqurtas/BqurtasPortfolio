import { ensureContact } from './_contact.js';
import { editorAuthorization, hasSession, inputErrorResponse, isSameOrigin, json, rateKey, readJson, sessionConfigured, takeRateLimit } from './_session.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB || !sessionConfigured(env) || !env.EDIT_TOKEN) return json({ ok: false, error: 'inbox-unavailable' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await hasSession(request, env))) return json({ ok: false, error: 'session-required' }, 401);
  const editorGate = await editorAuthorization(request, env);
  if (editorGate) return editorGate;
  const slot = await takeRateLimit(env, await rateKey(request, env, 'studio-inbox'), { limit: 100, windowMs: 15 * 60 * 1000, durable: true });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited' }, 429, { 'Retry-After': String(slot.retryAfter) });
  let body;
  try { body = await readJson(request, 2048); }
  catch (error) { return inputErrorResponse(error); }
  const positiveId = value => Number.isSafeInteger(value) && value > 0;
  if (!['list', 'read'].includes(body.action)
      || (body.action === 'list' && body.before != null && !positiveId(body.before))
      || (body.action === 'read' && !positiveId(body.id))) return json({ ok: false, error: 'invalid-inbox-request' }, 400);
  try {
    await ensureContact(env.DB);
    if (body.action === 'read') {
      await env.DB.prepare('UPDATE cms_inquiries SET read_at=COALESCE(read_at,?) WHERE id=?').bind(new Date().toISOString(), body.id).run();
      return json({ ok: true });
    }
    const before = body.before || Number.MAX_SAFE_INTEGER;
    const rows = (await env.DB.prepare('SELECT id,payload,created_at,read_at FROM cms_inquiries WHERE id<? ORDER BY id DESC LIMIT 26').bind(before).all()).results || [];
    const items = rows.slice(0, 25).map(row => ({ ...JSON.parse(row.payload), id: row.id, created_at: row.created_at, read_at: row.read_at }));
    const counts = await env.DB.prepare('SELECT COUNT(*) AS total,COUNT(CASE WHEN read_at IS NULL THEN 1 END) AS unread FROM cms_inquiries').first();
    return json({ ok: true, items, next: rows.length > 25 ? items.at(-1).id : null, total: Number(counts?.total || 0), unread: Number(counts?.unread || 0) });
  } catch { return json({ ok: false, error: 'inbox-unavailable' }, 503); }
}
