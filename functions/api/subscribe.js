import { ensureCms } from './_cms.js';
import { json } from './_session.js';
import { publicMutation } from './_public-cms.js';
export async function onRequestPost({ request, env }) {
  const { body, response } = await publicMutation(request, env, 'subscribe', 10);
  if (response) return response;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const lang = typeof body.lang === 'string' && /^[a-z]{2,3}$/.test(body.lang) ? body.lang : 'en';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid-email' }, 400);
  try {
    await ensureCms(env.DB);
    await env.DB.prepare('INSERT OR IGNORE INTO cms_subscribers(email,lang,created_at) VALUES(?,?,?)').bind(email, lang, new Date().toISOString()).run();
    return json({ ok: true });
  } catch { return json({ ok: false, error: 'subscription-unavailable' }, 503); }
}
