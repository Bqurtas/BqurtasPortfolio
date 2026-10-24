import { listLatest } from './_cms.js';
import { json } from './_session.js';
export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  try { return json(await listLatest(env.DB, { since: params.get('since'), limit: params.has('limit') ? params.get('limit') : undefined })); }
  catch { return json({ ok: false, error: 'content-unavailable' }, 503); }
}
