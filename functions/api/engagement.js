import { ensureCms, getPublishedPost, validCmsId } from './_cms.js';
import { json } from './_session.js';
import { publicMutation } from './_public-cms.js';
const validToken = token => typeof token === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(token);
async function engagement(DB, id, token) {
  const count = await DB.prepare('SELECT COUNT(*) AS n FROM cms_likes WHERE post_id=?').bind(id).first();
  const own = validToken(token) ? await DB.prepare('SELECT 1 AS liked FROM cms_likes WHERE post_id=? AND token=?').bind(id, token).first() : null;
  const comments = (await DB.prepare('SELECT name,body,created_at FROM cms_comments WHERE post_id=? ORDER BY created_at DESC,id DESC LIMIT 200').bind(id).all()).results || [];
  return { likes: Number(count?.n || 0), liked: !!own, comments };
}
export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const postId = params.get('post_id');
  if (!validCmsId(postId)) return json({ ok: false, error: 'invalid-post' }, 400);
  const id = Number(postId);
  try {
    if (!(await getPublishedPost(env.DB, id))) return json({ ok: false, error: 'post-not-found' }, 404);
    return json(await engagement(env.DB, id, params.get('token')));
  } catch { return json({ ok: false, error: 'content-unavailable' }, 503); }
}
export async function onRequestPost({ request, env }) {
  const { body, response } = await publicMutation(request, env, 'engagement-write', 30);
  if (response) return response;
  if (!validCmsId(body.post_id) || !['like','unlike','comment'].includes(body.action)) return json({ ok: false, error: 'invalid-engagement' }, 400);
  const id = Number(body.post_id);
  try {
    await ensureCms(env.DB);
    if (!(await getPublishedPost(env.DB, id))) return json({ ok: false, error: 'post-not-found' }, 404);
    if (body.action === 'comment') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const content = typeof body.body === 'string' ? body.body.trim() : '';
      if (!name || name.length > 80 || !content || content.length > 4000) return json({ ok: false, error: 'invalid-comment' }, 400);
      await env.DB.prepare('INSERT INTO cms_comments(post_id,name,body,created_at) VALUES(?,?,?,?)').bind(id, name, content, new Date().toISOString()).run();
    } else {
      if (!validToken(body.token)) return json({ ok: false, error: 'invalid-token' }, 400);
      if (body.action === 'like') await env.DB.prepare('INSERT OR IGNORE INTO cms_likes(post_id,token) VALUES(?,?)').bind(id, body.token).run();
      else await env.DB.prepare('DELETE FROM cms_likes WHERE post_id=? AND token=?').bind(id, body.token).run();
    }
    return json({ ok: true, ...await engagement(env.DB, id, body.token) });
  } catch { return json({ ok: false, error: 'content-unavailable' }, 503); }
}
