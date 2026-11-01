import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { onRequestPost as contact } from '../functions/api/contact.js';
import { onRequestPost as inbox } from '../functions/api/inbox.js';
import { ensureContact, storeContact } from '../functions/api/_contact.js';
import { issueSession } from '../functions/api/_session.js';

const ORIGIN = 'https://bqurtas.com';
function database(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  return { SESSION_SECRET:'contact-test-session-secret-over-thirty-two-bytes', EDIT_TOKEN:'editor-contact-test',
    DB:{ prepare(sql) { let values = []; return {
      bind(...args) { values = args; return this; },
      async run() { const result = db.prepare(sql).run(...values); return { meta:{ changes:Number(result.changes), last_row_id:Number(result.lastInsertRowid) } }; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results:db.prepare(sql).all(...values) }; }
    }; } }
  };
}
const draft = (extra = {}) => ({ request_id:randomUUID(), name:'Design client', email:'client@example.test', message:'An identity for a new project.', lang:'ku', ...extra });
async function post(handler, env, body, extra = {}) {
  const headers = { Origin:ORIGIN, 'Content-Type':'application/json', 'CF-Connecting-IP':'192.0.2.56', ...extra };
  return handler({ env, request:new Request(`${ORIGIN}/api/${handler === contact ? 'contact' : 'inbox'}`, { method:'POST', headers, body:JSON.stringify(body) }) });
}
async function owner(env, extra = {}) { return { Cookie:(await issueSession(env)).split(';')[0], 'x-edit-token':env.EDIT_TOKEN, ...extra }; }

test('a contact enquiry is durable and public responses expose none of its private contents', async t => {
  const env = database(t);
  const payload = draft({ name:'<img src=x onerror=alert(1)>', message:"A brief'); DROP TABLE cms_inquiries; --", company:'Test Studio', nda:true });
  const saved = await post(contact, env, payload);
  assert.equal(saved.status, 200); assert.match(saved.headers.get('Cache-Control'), /no-store/);
  assert.deepEqual(await saved.json(), { ok:true, status:'stored' });
  const rows = (await env.DB.prepare('SELECT * FROM cms_inquiries').all()).results;
  assert.equal(rows.length, 1);
  const stored = JSON.parse(rows[0].payload);
  assert.equal(stored.name, payload.name); assert.equal(stored.message, payload.message);
  assert.equal(stored.nda, true); assert.equal(stored.lang, 'ku');
  const privateList = await post(inbox, env, { action:'list' }, await owner(env));
  assert.equal(privateList.status, 200);
  const data = await privateList.json();
  assert.equal(data.items[0].email, payload.email); assert.equal(data.total, 1); assert.equal(data.unread, 1);
  assert.equal(data.items[0].request_id, undefined);
});

test('identical uncertain delivery retries are idempotent and changed drafts cannot overwrite a saved message', async t => {
  const env = database(t); const payload = draft();
  assert.equal((await post(contact, env, payload)).status, 200);
  assert.equal((await post(contact, env, payload)).status, 200);
  assert.equal((await post(contact, env, { ...payload, message:'Different enquiry' })).status, 409);
  const rows = (await env.DB.prepare('SELECT * FROM cms_inquiries').all()).results;
  assert.equal(rows.length, 1); assert.equal(JSON.parse(rows[0].payload).message, payload.message);
});

test('contact rejects cross-origin, malformed, oversized and honeypot submissions', async t => {
  const env = database(t);
  assert.equal((await post(contact, env, draft(), { Origin:'https://outside.test' })).status, 403);
  const invalid = [draft({ email:'not-email' }), draft({ name:' ' }), draft({ website:'https://spam.test' }), draft({ request_id:'guess' }), draft({ message:'x'.repeat(8001) }), draft({ company:{ unsafe:true } })];
  for (let i = 0; i < invalid.length; i++) assert.equal((await post(contact, env, invalid[i], { 'CF-Connecting-IP':`192.0.2.${i + 1}` })).status, 400);
  const large = await post(contact, env, draft({ message:'x'.repeat(66000) }), { 'CF-Connecting-IP':'192.0.2.199' });
  assert.equal(large.status, 413);
});

test('the full allowed multilingual brief is not rejected by a smaller UTF-8 byte limit', async t => {
  const env = database(t);
  const enquiry = draft({ message:'ژ'.repeat(8000), references:'ش'.repeat(1200), company:'ک'.repeat(200) });
  assert.ok(new TextEncoder().encode(JSON.stringify(enquiry)).length > 16 * 1024);
  const saved = await post(contact, env, enquiry);
  assert.equal(saved.status, 200);
  const result = await (await post(inbox, env, { action:'list' }, await owner(env))).json();
  assert.equal(result.items[0].message, enquiry.message); assert.equal(result.items[0].references, enquiry.references);
});

test('contact applies a durable hourly budget and fails closed without storage or signing secret', async t => {
  const env = database(t);
  for (let i = 0; i < 6; i++) assert.equal((await post(contact, env, draft())).status, 200);
  const limited = await post(contact, env, draft());
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  assert.equal((await post(contact, {}, draft())).status, 503);
  assert.equal((await post(contact, { DB:env.DB }, draft())).status, 503);
});

test('the inbox requires both signed owner session and editor credential and protects mutations from other origins', async t => {
  const env = database(t); const headers = await owner(env);
  assert.equal((await post(inbox, env, { action:'list' })).status, 401);
  assert.equal((await post(inbox, env, { action:'list' }, { Cookie:headers.Cookie })).status, 401);
  assert.equal((await post(inbox, env, { action:'list' }, { 'x-edit-token':env.EDIT_TOKEN })).status, 401);
  assert.equal((await post(inbox, env, { action:'list' }, { ...headers, Origin:'https://outside.test' })).status, 403);
  assert.equal((await post(inbox, env, { action:'list' }, { ...headers, 'x-edit-token':'wrong' })).status, 401);
});

test('private inbox pagination is bounded and marking read preserves all enquiry content', async t => {
  const env = database(t); const headers = await owner(env);
  await ensureContact(env.DB);
  for (let i = 0; i < 27; i++) await storeContact(env.DB, randomUUID(), { name:`Client ${i}`, email:'client@example.test', message:'Private brief' });
  const first = await (await post(inbox, env, { action:'list' }, headers)).json();
  assert.equal(first.items.length, 25); assert.equal(first.total, 27); assert.equal(first.next, 3);
  const second = await (await post(inbox, env, { action:'list', before:first.next }, headers)).json();
  assert.deepEqual(second.items.map(item => item.id), [2, 1]); assert.equal(second.next, null);
  assert.equal((await post(inbox, env, { action:'read', id:27 }, headers)).status, 200);
  const after = await (await post(inbox, env, { action:'list' }, headers)).json();
  assert.equal(after.unread, 26); assert.ok(after.items[0].read_at);
  assert.equal(after.items[0].message, 'Private brief');
  assert.equal((await post(inbox, env, { action:'read', id:'27' }, headers)).status, 400);
  assert.equal((await post(inbox, env, { action:'list', before:-1 }, headers)).status, 400);
  assert.equal((await post(inbox, env, { action:'delete', id:27 }, headers)).status, 400);
});
