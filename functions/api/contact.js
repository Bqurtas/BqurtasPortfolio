import { normalizeContact, storeContact } from './_contact.js';
import { publicMutation } from './_public-cms.js';
import { json } from './_session.js';

export async function onRequestPost({ request, env }) {
  // The brief permits 8,000 Unicode characters. Read at most 64 KiB so full
  // Kurdish/Arabic text is accepted without weakening other public limits.
  const { body, response } = await publicMutation(request, env, 'contact', 6, 64 * 1024);
  if (response) return response;
  let contact;
  try { contact = normalizeContact(body); }
  catch { return json({ ok: false, error: 'invalid-contact' }, 400); }
  try {
    const stored = await storeContact(env.DB, contact.requestId, contact.payload);
    return stored ? json({ ok: true, status: 'stored' }) : json({ ok: false, error: 'contact-id-conflict' }, 409);
  } catch { return json({ ok: false, error: 'contact-unavailable' }, 503); }
}
