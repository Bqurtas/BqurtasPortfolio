/* Private contact enquiries stay in D1. Public responses contain no enquiry
   content; only the signed Studio inbox can retrieve it. */
const schemas = new WeakMap();
export async function ensureContact(DB) {
  if (!DB) throw new Error('contact-unavailable');
  if (!schemas.has(DB)) {
    const pending = DB.prepare('CREATE TABLE IF NOT EXISTS cms_inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT)').run().catch(error => { schemas.delete(DB); throw error; });
    schemas.set(DB, pending);
  }
  await schemas.get(DB);
}

function field(input, key, max, required = false) {
  const raw = input[key] ?? '';
  if (typeof raw !== 'string' || raw.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw)) throw new Error('invalid-contact');
  const value = raw.trim();
  if (required && !value) throw new Error('invalid-contact');
  return value;
}

export function normalizeContact(input) {
  const requestId = field(input, 'request_id', 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('invalid-contact');
  if (field(input, 'website', 200)) throw new Error('invalid-contact');
  const payload = {
    name: field(input, 'name', 160, true),
    email: field(input, 'email', 254, true).toLowerCase(),
    message: field(input, 'message', 8000, true),
    company: field(input, 'company', 200),
    phone: field(input, 'phone', 80),
    project_type: field(input, 'project_type', 160),
    budget: field(input, 'budget', 160),
    timeline: field(input, 'timeline', 200),
    heard_about: field(input, 'heard_about', 200),
    references: field(input, 'references', 1200),
    nda: input.nda === true || input.nda === 'Yes',
    lang: ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv'].includes(input.lang) ? input.lang : 'en'
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error('invalid-contact');
  return { requestId: requestId.toLowerCase(), payload };
}

export async function storeContact(DB, requestId, payload) {
  await ensureContact(DB);
  const encoded = JSON.stringify(payload);
  await DB.prepare('INSERT OR IGNORE INTO cms_inquiries(request_id,payload,created_at) VALUES(?,?,?)').bind(requestId, encoded, new Date().toISOString()).run();
  // A retry of the same draft is safe after a network timeout. Reusing its
  // identifier for different content must never silently discard that edit.
  const row = await DB.prepare('SELECT payload FROM cms_inquiries WHERE request_id=?').bind(requestId).first();
  return row?.payload === encoded;
}
