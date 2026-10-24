import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureCms, getPublishedPost, handleCmsAdmin, validCmsId } from '../functions/api/_cms.js';
import { onRequestGet as journal } from '../functions/api/journal.js';
import { onRequestGet as projects } from '../functions/api/projects.js';
import { onRequestGet as latest } from '../functions/api/latest.js';
import { onRequestGet as engagement, onRequestPost as engage } from '../functions/api/engagement.js';
import { onRequestPost as subscribe } from '../functions/api/subscribe.js';

const ORIGIN = 'https://bqurtas.com';

function database(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const DB = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return sqlite.prepare(sql).get(...bindings) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async run() {
          const result = sqlite.prepare(sql).run(...bindings);
          return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { DB, SESSION_SECRET: 'test-only-cms-session-secret-over-thirty-two-bytes' };
}

const get = (handler, env, suffix = '') => handler({ env, request: new Request(ORIGIN + '/api/test' + suffix) });
const post = (handler, env, body, origin = ORIGIN) => handler({ env, request: new Request(ORIGIN + '/api/test', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.77' },
  body: JSON.stringify(body),
}) });
async function save(env, data, service = 'blog-admin') {
  const key = service === 'blog-admin' ? 'post' : service === 'projects-admin' ? 'project' : 'item';
  const response = await handleCmsAdmin(service, { action: service === 'latest-admin' ? 'add' : 'upsert', [key]: data }, env);
  assert.equal(response.status, 200);
  return (await response.json()).id;
}

test('public D1 APIs publish only visible posts, projects and active notices', async t => {
  const env = database(t);
  const visible = await save(env, { title: 'Public', published: true, body: 'Published note' });
  const draft = await save(env, { title: 'Secret draft', published: false, body: 'Never public' });
  await save(env, { title: 'Public identity', published: true }, 'projects-admin');
  await save(env, { title: 'Private identity', published: false }, 'projects-admin');
  await save(env, { title: 'Active notice', active: true, link: 'book' }, 'latest-admin');
  await save(env, { title: 'Hidden notice', active: false }, 'latest-admin');
  assert.deepEqual((await (await get(journal, env)).json()).map(x => x.title), ['Public']);
  assert.deepEqual((await (await get(projects, env)).json()).map(x => x.title), ['Public identity']);
  assert.deepEqual((await (await get(latest, env)).json()).map(x => x.title), ['Active notice']);
  assert.equal((await getPublishedPost(env.DB, visible)).body, 'Published note');
  assert.equal(await getPublishedPost(env.DB, draft), null);
  assert.equal((await get(engagement, env, `?post_id=${draft}`)).status, 404);
  assert.equal((await post(engage, env, { action: 'comment', post_id: draft, name: 'Reader', body: 'Test' })).status, 404);
  const privateList = await (await handleCmsAdmin('blog-admin', { action: 'list' }, env)).json();
  assert.equal(privateList.posts.length, 2, 'authenticated editor still sees drafts');
});

test('imported article IDs remain reserved after deletion and partial edits keep metadata', async t => {
  const env = database(t);
  await ensureCms(env.DB);
  await env.DB.prepare('INSERT INTO cms_posts(id,payload,published,pos,created_at) VALUES(?,?,?,?,?)').bind(27,
    JSON.stringify({ title: 'Imported post', slug: '27', num: '27', date: '2026-10-15', body: 'Original body',
      i18n: { ku: { title: 'بابەت' } } }), 1, 7, '2026-10-15T07:00:00.000Z').run();
  await save(env, { id: 27, title: 'Edited title', pos: null });
  let item = await getPublishedPost(env.DB, 27);
  assert.equal(item.pos, 7);
  assert.equal(item.body, 'Original body');
  assert.equal(item.slug, '27'); assert.equal(item.num, '27'); assert.equal(item.date, '2026-10-15');
  assert.equal(item.created_at, '2026-10-15T07:00:00.000Z');
  assert.equal(item.i18n.ku.title, 'بابەت');
  await save(env, { id: 27, i18n: {} });
  item = await getPublishedPost(env.DB, 27);
  assert.deepEqual(item.i18n, {});
  await handleCmsAdmin('blog-admin', { action: 'delete', id: 27 }, env);
  assert.equal(await getPublishedPost(env.DB, 27), null);
  assert.equal(await save(env, { title: 'Next note', published: true }), 28);
});

test('named palettes, allowed translations and literal SQL-looking text round-trip safely', async t => {
  const env = database(t);
  const title = "Identity'); DROP TABLE cms_posts; --";
  await save(env, { title, published: true, palette: [{ name: 'Warm ink', hex: '#102030' }, '#fff'],
    gallery: [{ url: '/media/LogoDesign/Logo1.webp' }], i18n: { ku: { title: 'ناسنامە', body: 'ناوەڕۆک' },
      xx: { title: 'Unknown locale' }, en: { title, ignored: 'not a content field' } } }, 'projects-admin');
  const [project] = await (await get(projects, env)).json();
  assert.equal(project.title, title);
  assert.deepEqual(project.palette, [{ name: 'Warm ink', hex: '#102030' }, { name: '', hex: '#fff' }]);
  assert.deepEqual(Object.keys(project.i18n), ['en', 'ku']);
  assert.deepEqual(project.i18n.en, { title });
  await save(env, { title: 'Posts table survives', published: true });
  assert.equal((await (await get(journal, env)).json()).length, 1);
  for (const palette of [[{ name: 'Bad', hex: '#12345' }], [{ hex: '#1234567' }]]) {
    const response = await handleCmsAdmin('projects-admin', { action: 'upsert', project: { title: 'Invalid', palette } }, env);
    assert.equal(response.status, 400);
  }
  for (const cover of ['javascript:alert(1)', '/\\outside.example/image.webp', 'https://example.test/\nimage.webp']) {
    assert.equal((await handleCmsAdmin('blog-admin', { action: 'upsert', post: { title: 'Bad URL', cover } }, env)).status, 400);
  }
});

test('unsupported actions and malformed identifiers cannot create or delete content', async t => {
  const env = database(t);
  const id = await save(env, { title: 'Keep this', published: true });
  for (const action of ['unexpected', 'upload', '__proto__']) {
    assert.equal((await handleCmsAdmin('blog-admin', { action, post: { title: 'Must not be inserted' } }, env)).status, 400);
  }
  for (const value of [true, [id], {}, '1 OR 1=1', ' ', '-1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validCmsId(value), false);
    assert.equal((await handleCmsAdmin('blog-admin', { action: 'delete', id: value }, env)).status, 400);
  }
  for (const service of ['not-a-table', '__proto__', 'constructor']) {
    assert.equal((await handleCmsAdmin(service, { action: 'list' }, env)).status, 404);
  }
  assert.equal((await handleCmsAdmin('blog-admin', { action: 'upsert', post: { id: 999, title: 'Missing' } }, env)).status, 404);
  assert.equal((await (await get(journal, env)).json()).length, 1);
});

test('CMS media accepts only the site and its GitHub repository while preserving migrated asset URLs', async t => {
  const env = database(t);
  const accepted = [
    '/assets/migrated/original.webp', 'assets/migrated/original.webp',
    'https://bqurtas.com/uploads/123.webp', '/media/Book/BookCover1.webp',
    'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Book/BookCover1.webp'
  ];
  for (const cover of accepted) await save(env, { title: 'Owned image', cover, published: true });
  assert.deepEqual((await (await get(journal, env)).json()).map(post => post.cover).sort(), accepted.sort());
  for (const url of [
    'https://external.example/cover.webp', 'https://bqurtas.com.evil.example/cover.webp',
    'https://raw.githubusercontent.com/Another/Repository/main/cover.webp',
    'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio-other/main/cover.webp',
    'https://user:password@bqurtas.com/cover.webp', '//external.example/cover.webp'
  ]) {
    for (const [service, body] of [
      ['blog-admin', { action: 'upsert', post: { title: 'Rejected image', cover: url } }],
      ['projects-admin', { action: 'upsert', project: { title: 'Rejected gallery', gallery: [{ url }] } }],
      ['latest-admin', { action: 'add', item: { title: 'Rejected notice', image: url, link: 'book' } }]
    ]) {
      const response = await handleCmsAdmin(service, body, env);
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.equal(result.error, 'invalid-media-url');
      assert.match(result.detail, /Upload the image/);
    }
  }
  assert.equal((await (await get(journal, env)).json()).length, accepted.length);
});

test('public filtering accepts bounded integral limits and ISO timestamps without SQL interpolation', async t => {
  const env = database(t);
  await save(env, { title: 'One', published: true, pos: 2 });
  await save(env, { title: 'Two', published: true, pos: 1 });
  const limited = await get(journal, env, '?limit=1.9');
  assert.equal(limited.status, 200);
  assert.deepEqual((await limited.json()).map(x => x.title), ['Two']);
  assert.equal((await (await get(journal, env, '?since=2999-01-01')).json()).length, 0);
  assert.equal((await (await get(journal, env, '?since=%27%20OR%201%3D1--&limit=garbage')).json()).length, 2);
});

test('likes reveal only counts and own state; comments are scoped to a published post', async t => {
  const env = database(t);
  const id = await save(env, { title: 'Public note', published: true });
  const otherId = await save(env, { title: 'Other note', published: true });
  for (const token of ['reader_token_one', 'reader_token_two']) {
    assert.equal((await post(engage, env, { action: 'like', post_id: id, token })).status, 200);
  }
  await post(engage, env, { action: 'like', post_id: id, token: 'reader_token_one' });
  await post(engage, env, { action: 'comment', post_id: id, name: 'Reader', body: "Nice work'); DROP TABLE cms_likes; --" });
  const response = await get(engagement, env, `?post_id=${id}&token=reader_token_one`);
  const data = await response.json();
  assert.equal(data.likes, 2); assert.equal(data.liked, true); assert.equal(data.comments.length, 1);
  assert.deepEqual(Object.keys(data.comments[0]).sort(), ['body', 'created_at', 'name']);
  assert.doesNotMatch(JSON.stringify(data), /reader_token/);
  assert.equal((await (await get(engagement, env, `?post_id=${otherId}`)).json()).likes, 0);
  await post(engage, env, { action: 'unlike', post_id: id, token: 'reader_token_one' });
  const updated = await (await get(engagement, env, `?post_id=${id}&token=reader_token_one`)).json();
  assert.equal(updated.likes, 1); assert.equal(updated.liked, false);
  assert.equal((await post(engage, env, { action: 'delete-all', post_id: id })).status, 400);
  assert.equal((await get(engagement, env, '?post_id=1e0')).status, 400);
});

test('subscriptions normalize addresses, never reveal membership and enforce same-origin rate limits', async t => {
  const env = database(t);
  const first = await post(subscribe, env, { email: ' Reader@Example.test ', lang: 'ku' });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true });
  const again = await post(subscribe, env, { email: 'reader@example.test', lang: 'en' });
  assert.deepEqual(await again.json(), { ok: true });
  const rows = (await env.DB.prepare('SELECT * FROM cms_subscribers').all()).results;
  assert.equal(rows.length, 1); assert.equal(rows[0].email, 'reader@example.test');
  assert.equal((await post(subscribe, env, { email: 'other@example.test' }, 'https://outside.example')).status, 403);
  for (let i = 0; i < 8; i++) assert.equal((await post(subscribe, env, { email: `other${i}@example.test` })).status, 200);
  const limited = await post(subscribe, env, { email: 'last@example.test' });
  assert.equal(limited.status, 429);
  assert.match(limited.headers.get('retry-after'), /^[0-9]+$/);
  assert.doesNotMatch(await limited.text(), /@/);
});

test('unavailable D1 fails closed without returning internal errors', async () => {
  for (const handler of [journal, projects, latest]) {
    const response = await get(handler, {});
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'content-unavailable' });
  }
  assert.equal((await post(subscribe, {}, { email: 'reader@example.test' })).status, 503);
});
