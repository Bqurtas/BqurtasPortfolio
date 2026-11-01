import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { ensureCms } from '../functions/api/_cms.js';
import { latestFeed, freshLatestRows, LATEST_WEEK } from '../functions/api/_latest-feed.js';
import { onRequestGet } from '../functions/api/latest.js';
import { withImagePublicationDates } from '../scripts/generate-gallery-manifest.mjs';
import { updateGalleryManifest } from '../functions/_gallery-update.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const stamp = age => new Date(NOW - age).toISOString();
const feed = (works = [], pins = [], posts = []) => ({ version: 1, works, pins, posts });

function environment(t, manifest) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const DB = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async run() { const result = sqlite.prepare(sql).run(...bindings); return { meta: { changes: Number(result.changes) } }; },
      };
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
  };
  return { DB, ASSETS: { fetch: async () => Response.json(manifest) } };
}

test('Latest expires at exactly seven days and ignores unknown or future publication times', () => {
  const rows = [-1, 0, LATEST_WEEK - 1, LATEST_WEEK, LATEST_WEEK + 1].map(age => ({ age, created_at: stamp(age) }));
  rows.push({ created_at: 'invalid' }, {});
  assert.deepEqual(freshLatestRows(rows, NOW).map(row => row.age), [0, LATEST_WEEK - 1]);
});

test('one same-origin feed includes recent canonical images, films, pins and posts without GitHub requests', async t => {
  const image = (name, date, hash = '') => ({ path: name, width: 200, height: 300, date, hash });
  const env = environment(t, { images: [
    image('LogoDesign/Logo1.webp', stamp(1000), 'a'.repeat(16)),
    image('GeneralDesign/GDesign1.webp', stamp(500), 'a'.repeat(16)),
    image('Book/BookCover1.webp', stamp(LATEST_WEEK)),
    image('Book/BookCover2.webp', stamp(-1000)),
    image('Book/BookCover3.webp', ''),
  ], videos: [{ path: 'Videos/Videos1.mp4', width: 1920, height: 1080, date: stamp(2000), poster: '/assets/thumbs/Videos/Videos1.jpg' }] });
  await ensureCms(env.DB);
  for (const [id, age, visible] of [[1, 1000, 1], [2, LATEST_WEEK, 1], [3, 2000, 0], [4, -1000, 1]]) {
    await env.DB.prepare('INSERT INTO cms_latest(id,payload,active,pos,created_at) VALUES(?,?,?,?,?)')
      .bind(id, JSON.stringify({ title: 'Pin ' + id }), visible, 0, stamp(age)).run();
    await env.DB.prepare('INSERT INTO cms_posts(id,payload,published,pos,created_at) VALUES(?,?,?,?,?)')
      .bind(id, JSON.stringify({ title: 'Post ' + id, body: 'Large article text', i18n: { ku: { title: 'تێبینی', body: 'Private-to-detail text' } } }), visible, 0, stamp(age)).run();
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No third-party fetch is needed'); });
  const result = await latestFeed(env, 'https://bqurtas.com', NOW);
  assert.deepEqual(result.works.map(work => [work.coll, work.index]), [['logo', 1], ['video', 1]]);
  assert.equal(result.works[0].width / result.works[0].height, 2 / 3);
  assert.equal(result.works[1].poster, '/assets/thumbs/Videos/Videos1.jpg');
  assert.deepEqual(result.pins.map(row => row.id), [1]);
  assert.deepEqual(result.posts.map(row => row.id), [1]);
  assert.equal(result.posts[0].i18n.ku.title, 'تێبینی');
  assert.doesNotMatch(JSON.stringify(result.posts), /Large article|Private-to-detail/);
  assert.equal((await latestFeed(env, 'https://bqurtas.com', NOW + LATEST_WEEK + 1001)).works.length, 0);
});

test('legacy Latest API cannot keep an old pin alive with an earlier since parameter', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: NOW });
  const env = environment(t, { images: [], videos: [] });
  await ensureCms(env.DB);
  for (const [id, age] of [[1, 1000], [2, LATEST_WEEK]]) {
    await env.DB.prepare('INSERT INTO cms_latest(id,payload,active,pos,created_at) VALUES(?,?,?,?,?)')
      .bind(id, JSON.stringify({ title: 'Pin ' + id }), 1, 0, stamp(age)).run();
  }
  const response = await onRequestGet({ env, request: new Request('https://bqurtas.com/api/latest?since=2000-01-01') });
  assert.deepEqual((await response.json()).map(row => row.id), [1]);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

const source = await readFile(new URL('../preview_site/js/latest-feed.js', import.meta.url), 'utf8');
function browser(saved) {
  let now = NOW, sequence = 0;
  const badges = { railLatestBadge: { hidden: true }, railLatestBadgeM: { hidden: true } };
  const storage = new Map(saved ? [['bq_latest_feed_v1', JSON.stringify(saved)]] : []);
  const timers = new Map(), events = new Map(), requests = [], updates = [];
  const document = { hidden: false, getElementById: id => badges[id], addEventListener: (type, fn) => events.set(type, fn) };
  const window = { addEventListener: (type, fn) => events.set(type, fn), dispatchEvent: event => updates.push(event.type) };
  const context = {
    document, window,
    Date: class extends Date { static now() { return now; } },
    Event: class { constructor(type) { this.type = type; } },
    AbortSignal: { timeout: () => ({}) },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setTimeout: (fn, delay) => { timers.set(++sequence, { fn, at: now + delay }); return sequence; },
    clearTimeout: id => timers.delete(id),
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
  };
  vm.runInNewContext(source, context);
  return { badges, requests, updates, events, window, document,
    async settle(value, status = 200) {
      requests.at(-1).resolve({ ok: status === 200, json: async () => value });
      await new Promise(resolve => setImmediate(resolve));
    },
    advance(ms, run = true) {
      now += ms;
      if (run) for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    },
  };
}

test('cached notices show both badges before the network, then expire while the panel stays open', () => {
  const page = browser(feed([{ created_at: stamp(LATEST_WEEK - 1000) }]));
  assert.equal(page.badges.railLatestBadge.hidden, false);
  assert.equal(page.badges.railLatestBadgeM.hidden, false);
  assert.equal(page.requests.length, 1, 'starts immediately without intent or an idle timer');
  assert.equal(page.requests[0].url, '/api/latest?feed=1');
  page.advance(999);
  assert.equal(page.badges.railLatestBadge.hidden, false);
  page.advance(1);
  assert.equal(page.badges.railLatestBadge.hidden, true);
  assert.equal(page.badges.railLatestBadgeM.hidden, true);
  assert.equal(page.window.__bqLatestFeed.snapshot().works.length, 0);
  assert.equal(page.updates.at(-1), 'bq:latest', 'an open Latest panel receives the expiry too');
});

test('a first visit lights both badges on one feed response; rejected refreshes never extend a notice', async () => {
  const page = browser();
  assert.equal(page.badges.railLatestBadge.hidden, true);
  await page.settle(feed([], [{ created_at: stamp(LATEST_WEEK - 1000) }], []));
  assert.equal(page.badges.railLatestBadge.hidden, false);
  page.window.__bqLatestFeed.refresh();
  await page.settle({ ok: false }, 503);
  page.advance(1000);
  assert.equal(page.badges.railLatestBadge.hidden, true);
});

test('resuming a background tab removes expired cached notices before its network refresh', () => {
  const page = browser(feed([], [], [{ created_at: stamp(LATEST_WEEK - 1000) }]));
  page.advance(2000, false);
  page.events.get('visibilitychange')();
  assert.equal(page.badges.railLatestBadge.hidden, true);
  assert.equal(page.window.__bqLatestFeed.snapshot().posts.length, 0);
});

test('image publication dates survive rebuilds and Studio manifests retain their upload timestamp', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'bq-latest-history-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  git(['init', '-q']);
  await mkdir(path.join(root, 'LogoDesign'));
  await writeFile(path.join(root, 'LogoDesign/Logo1.webp'), 'first image');
  git(['add', '.']);
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Add work'],
    { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: '2026-10-01T10:00:00Z', GIT_COMMITTER_DATE: '2026-10-01T10:00:00Z' } });
  const original = { images: [{ path: 'LogoDesign/Logo1.webp' }, { path: 'LogoDesign/Logo2.webp' }], videos: [] };
  const dated = withImagePublicationDates(original, root);
  assert.equal(Date.parse(dated.images[0].date), Date.parse('2026-10-01T10:00:00Z'));
  assert.equal(dated.images[1].date, undefined, 'untracked files never receive the build clock');
  assert.deepEqual(withImagePublicationDates(dated, root), dated);
  const uploaded = updateGalleryManifest({ images: [], videos: [] }, {
    action: 'upload', path: 'LogoDesign/Logo1.webp', width: 200, height: 300, hash: 'a'.repeat(16), date: stamp(1000),
  });
  assert.equal(uploaded.images[0].date, stamp(1000));
  assert.equal(withImagePublicationDates(uploaded, root).images[0].date, stamp(1000), 'Git history cannot replace an explicit Studio publication');
  const shallow = path.join(root, 'shallow');
  git(['clone', '--depth=1', 'file://' + root, shallow]);
  assert.deepEqual(withImagePublicationDates(original, shallow), original, 'shallow CI history cannot make legacy work new');
});
