import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { issueSession } from '../functions/api/_session.js';
import { onRequestPost as studioPost } from '../functions/api/studio/[service].js';

const ORIGIN = 'https://bqurtas.com';
const SESSION_SECRET = 'another-independent-session-secret-over-32-bytes';
function environment(t, extra = {}) {
  const database = new DatabaseSync(':memory:');
  t.after(() => database.close());
  const DB = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return database.prepare(sql).get(...bindings) || null; },
        async all() { return { results:database.prepare(sql).all(...bindings) }; },
        async run() { const result = database.prepare(sql).run(...bindings); return { meta:{ changes:Number(result.changes), last_row_id:Number(result.lastInsertRowid) } }; }
      };
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  return { SESSION_SECRET, EDIT_TOKEN:'browser-edit-secret', DB,
    RATE_LIMITER:{ limit:async () => ({ success:true }) }, ...extra };
}
async function cookie(env) { return (await issueSession(env)).split(';', 1)[0]; }
function request(service, token, body, extraHeaders = {}) {
  return new Request(`${ORIGIN}/api/studio/${service}`, { method:'POST', headers:{
    'Content-Type':'application/json', Origin:ORIGIN, Cookie:'', 'x-edit-token':token, ...extraHeaders
  }, body:JSON.stringify(body) });
}
async function call(env, service, body, token = env.EDIT_TOKEN) {
  return studioPost({ request:request(service, token, body, { Cookie:await cookie(env) }), env, params:{ service } });
}

test('authored and built dashboard use only same-origin publishing and content APIs', async () => {
  for (const file of ['enhance.js', 'enhance.v420.min.js']) {
    const source = await readFile(new URL(`../preview_site/js/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /supabase|BQ_SUPA|functions\/v1\//i);
    assert.match(source, /\/api\/studio\//);
    assert.match(source, /\/api\/journal/);
    assert.match(source, /\/api\/engagement/);
    assert.match(source, /\/api\/subscribe/);
  }
});

test('native Studio still requires signed session, editor password and same origin', async t => {
  const env = environment(t);
  const noSession = await studioPost({ request:request('blog-admin', env.EDIT_TOKEN, { action:'list' }), env, params:{ service:'blog-admin' } });
  assert.equal(noSession.status, 401);
  assert.equal((await noSession.json()).error, 'session-required');
  assert.equal((await call(env, 'blog-admin', { action:'list' }, 'wrong')).status, 401);
  const foreign = await studioPost({ request:request('blog-admin', env.EDIT_TOKEN, { action:'list' }, {
    Cookie:await cookie(env), Origin:'https://evil.example'
  }), env, params:{ service:'blog-admin' } });
  assert.equal(foreign.status, 403);
});

test('D1 posts can be listed and published without any GitHub or external service credential', async t => {
  const env = environment(t);
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches++; throw new Error('external request forbidden'); });
  const empty = await call(env, 'blog-admin', { action:'list' });
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { ok:true, posts:[] });
  const created = await call(env, 'blog-admin', { action:'upsert', post:{ title:'A real note', body:'Published through D1.', published:true }, i18n:{ ku:{ title:'تێبینییەک' } } });
  assert.equal(created.status, 200);
  const { id } = await created.json();
  const listed = await call(env, 'blog-admin', { action:'list' });
  const { posts } = await listed.json();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, id);
  assert.equal(posts[0].published, true);
  assert.equal(posts[0].i18n.ku.title, 'تێبینییەک');
  assert.equal(fetches, 0);
  assert.match(listed.headers.get('cloudflare-cdn-cache-control'), /no-store/);
});

test('missing GitHub credentials block media publishing only and return an actionable code', async t => {
  const env = environment(t);
  for (const [service, body] of [
    ['work-upload', { action:'list', folder:'Book' }],
    ['blog-admin', { action:'upload', filename:'cover.webp', contentType:'image/webp', dataB64:'AAAA' }],
    ['projects-admin', { action:'upload', filename:'cover.webp', contentType:'image/webp', dataB64:'AAAA' }]
  ]) {
    const response = await call(env, service, body);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok:false, error:'studio-github-not-configured' });
  }
  assert.equal((await call(env, 'projects-admin', { action:'list' })).status, 200);
  assert.equal((await call(env, 'latest-admin', { action:'list' })).status, 200);
});

test('gallery publishing sends the server GitHub credential only to the fixed repository API', async t => {
  const env = environment(t, { GITHUB_TOKEN:'private-github-repository-token' });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url, init }); return Response.json([]); });
  const response = await call(env, 'work-upload', { action:'list', folder:'Book' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok:true, files:[] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/Bqurtas/BqurtasPortfolio/contents/Book?ref=main');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer private-github-repository-token');
  assert.equal(calls[0].init.headers['x-edit-token'], undefined);
  assert.equal(calls[0].init.redirect, 'manual');
  assert.doesNotMatch(JSON.stringify(calls), /browser-edit-secret|another-independent-session-secret/);
});

test('native Studio rejects unknown services, inherited names, unsupported actions and unsafe paths', async t => {
  const env = environment(t);
  for (const service of ['anything', '__proto__', 'constructor', 'toString']) {
    assert.equal((await call(env, service, { action:'list' })).status, 404);
  }
  for (const body of [{ action:'list', folder:'../private' }, { action:'arbitrary', folder:'Book' }, { action:'delete', path:'../secret', sha:'0'.repeat(40) }]) {
    assert.equal((await call(env, 'work-upload', body)).status, 400);
  }
});

test('GitHub redirects are not followed or exposed, and failed auth does not reject the editor password', async t => {
  const env = environment(t, { GITHUB_TOKEN:'private-github-token' });
  for (const [status, code] of [[302, 'studio-github-invalid'], [401, 'studio-github-auth'], [403, 'studio-github-auth']]) {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('private provider details', { status, headers:{ Location:'https://evil.example' } }); });
    const response = await call(env, 'work-upload', { action:'list', folder:'Book' });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok:false, error:code });
    assert.equal(response.headers.get('Location'), null);
    assert.equal(calls, 1);
  }
});

test('Studio fails closed when session, editor or database configuration is unavailable', async t => {
  const env = environment(t);
  for (const missing of ['SESSION_SECRET', 'EDIT_TOKEN', 'DB']) {
    const response = await studioPost({ request:request('blog-admin', env.EDIT_TOKEN, { action:'list' }), env:{ ...env, [missing]:undefined }, params:{ service:'blog-admin' } });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'studio-proxy-not-configured');
  }
});

test('editor rotation stays in D1, stores only a digest and immediately retires the bootstrap password', async t => {
  const env = environment(t);
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches++; throw new Error('must stay local'); });
  const response = await call(env, 'set-token', { new_token:'replacement-edit-secret' });
  assert.equal(response.status, 200);
  const row = await env.DB.prepare('SELECT digest FROM studio_auth').first();
  assert.ok(row.digest);
  assert.notEqual(row.digest, 'replacement-edit-secret');
  assert.equal((await call(env, 'blog-admin', { action:'list' })).status, 401);
  assert.equal((await call(env, 'blog-admin', { action:'list' }, 'replacement-edit-secret')).status, 200);
  assert.equal(fetches, 0);
});
