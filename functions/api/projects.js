import { listPublishedProjects } from './_cms.js';
import { json } from './_session.js';
export async function onRequestGet({ env }) {
  try { return json(await listPublishedProjects(env.DB)); }
  catch { return json({ ok: false, error: 'content-unavailable' }, 503); }
}
