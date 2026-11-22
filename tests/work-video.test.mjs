import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  handleGithubVideoStage, handleGithubWork, decodeJpeg, VIDEO_MAX_BYTES, VIDEO_STAGE_MAX
} from '../functions/api/_github-works.js';
import { updateVideoManifest, withStableVideoIndices } from '../functions/_gallery-update.js';
import { issueSession } from '../functions/api/_session.js';
import { onRequestPost as studioPost } from '../functions/api/studio/[service].js';
import { catalogFromManifest } from '../functions/_gallery-catalog.js';

const SESSION_SECRET = 'an-independent-video-session-secret-of-32-bytes';
const ENV = { GITHUB_TOKEN:'private-github-token', SESSION_SECRET };
const ORIGIN = 'https://bqurtas.com';
const OTHER_SHA = 'a'.repeat(40);
const MANIFEST = 'preview_site/assets/gallery-manifest.json';
const POSTER = await readFile(new URL('../preview_site/assets/thumbs/Videos/Videos1.jpg', import.meta.url));
const gitSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

/* A real ISO base-media header (ftyp isom) followed by an mdat payload. */
function mp4(size = 4096, brand = 'isom') {
  const bytes = Buffer.alloc(size);
  bytes.writeUInt32BE(24, 0); bytes.write('ftyp', 4, 'ascii'); bytes.write(brand, 8, 'ascii');
  bytes.writeUInt32BE(512, 12); bytes.write('isomiso2', 16, 'ascii');
  bytes.writeUInt32BE(size - 24, 24); bytes.write('mdat', 28, 'ascii');
  for (let index = 32; index < size; index++) bytes[index] = index % 251;
  return bytes;
}
const FILM = mp4();
const FILM_SHA = gitSha(FILM);

function stageRequest(text, headers = {}) {
  return new Request(`${ORIGIN}/api/studio/work-video`, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=UTF-8', ...headers }, body:text });
}

function blobServer(t) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const body = await new Response(init.body).text();
    calls.push({ url, init, body });
    const content = Buffer.from(JSON.parse(body).content, 'base64');
    return response({ sha:gitSha(content), url:'https://api.github.com/private' }, 201);
  });
  return calls;
}

async function stage(t, bytes = FILM) {
  const calls = blobServer(t);
  const result = await handleGithubVideoStage(stageRequest(bytes.toString('base64')), ENV);
  return { result, calls, body:await result.json() };
}

test('a staged film becomes exactly one GitHub blob request and returns a signed receipt', async (t) => {
  const { result, calls, body } = await stage(t);
  assert.equal(result.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.sha, FILM_SHA);
  assert.equal(body.size, FILM.length);
  assert.match(body.receipt, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/Bqurtas/BqurtasPortfolio/git/blobs');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer private-github-token');
  assert.deepEqual(JSON.parse(calls[0].body), { encoding:'base64', content:FILM.toString('base64') });
  assert.doesNotMatch(JSON.stringify(body), /private/);
});

test('padding, odd lengths and every MP4 size up to the limit are measured exactly', async (t) => {
  for (const size of [1024, 1025, 1026, 5000]) {
    const { body } = await stage(t, mp4(size));
    assert.equal(body.size, size);
  }
  assert.equal(VIDEO_MAX_BYTES, 25_000_000);
  assert.equal(VIDEO_STAGE_MAX, 33_333_336);
});

test('anything that is not a bounded base64 MP4 is refused before GitHub is contacted', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not reach GitHub'); });
  const base64 = FILM.toString('base64');
  const cases = [
    [stageRequest(base64, { 'Content-Type':'application/json' }), 415, 'unsupported-media-type'],
    [stageRequest(''), 400, 'invalid-studio-video'],
    [stageRequest(base64.slice(0, -1)), 400, 'invalid-studio-video'],
    [stageRequest(base64.replace('A', '!')), 400, 'invalid-studio-video'],
    [stageRequest(base64.slice(0, 40) + '=' + base64.slice(41)), 400, 'invalid-studio-video'],
    [stageRequest(base64 + '"},"encoding":"utf-8'), 400, 'invalid-studio-video'],
    [stageRequest(Buffer.from('<html>not a film</html>'.repeat(80)).toString('base64')), 400, 'invalid-studio-video'],
    [stageRequest(mp4(4096, 'qt  ').toString('base64')), 400, 'invalid-studio-video'],
    [stageRequest(mp4(600).toString('base64')), 400, 'invalid-studio-video'],
    [stageRequest('QUFB', { 'Content-Length':String(VIDEO_STAGE_MAX + 4) }), 413, 'payload-too-large'],
    [stageRequest('A'.repeat(VIDEO_STAGE_MAX + 4)), 413, 'payload-too-large']
  ];
  for (const [request, status, error] of cases) {
    const result = await handleGithubVideoStage(request, ENV);
    assert.equal(result.status, status, error);
    assert.deepEqual(await result.json(), { ok:false, error });
  }
  assert.equal((await handleGithubVideoStage(stageRequest(base64), { GITHUB_TOKEN:'x' })).status, 503);
  assert.equal((await handleGithubVideoStage(stageRequest(base64), { SESSION_SECRET })).status, 503);
  assert.equal(calls, 0);
});

test('GitHub refusing a large blob is reported as too large, not as a publication', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ message:'private details' }, 413));
  const result = await handleGithubVideoStage(stageRequest(FILM.toString('base64')), ENV);
  assert.equal(result.status, 413);
  assert.deepEqual(await result.json(), { ok:false, error:'studio-github-too-large' });
});

test('the poster must be a real JPEG with sane dimensions', () => {
  const decoded = decodeJpeg(POSTER.toString('base64'));
  assert.ok(decoded.width >= 16 && decoded.height >= 16);
  for (const value of ['', 'AAAA', Buffer.from('<svg/>'.repeat(40)).toString('base64'), POSTER.subarray(0, 200).toString('base64'), 'A'.repeat(1_500_004)]) {
    assert.throws(() => decodeJpeg(value), { code:'invalid-studio-video' });
  }
});

const videoRecord = (n, extra = {}) => ({ path:`Videos/Videos${n}.mp4`, width:406, height:720, date:'2026-01-29T02:27:16+03:00', duration:20, poster:`/assets/thumbs/Videos/Videos${n}.jpg`, ...extra });

test('video manifest updates keep every public film number and the gallery order', () => {
  const original = { version:3, images:[{ path:'LogoDesign/Logo1.webp', width:500, height:500, index:1 }], videos:[videoRecord(1), videoRecord(2), videoRecord(3)] };
  const stable = withStableVideoIndices(original);
  assert.deepEqual(stable.videos.map(record => record.index), [1, 2, 3]);
  assert.deepEqual(Object.keys(stable.videos[0]), ['path', 'width', 'height', 'index', 'date', 'duration', 'poster']);
  assert.equal(stable.images, original.images, 'image records are untouched');
  const removed = updateVideoManifest(original, { action:'delete', path:'Videos/Videos2.mp4', filenameHighWater:3 });
  assert.deepEqual(removed.videos.map(record => [record.path, record.index]), [['Videos/Videos1.mp4', 1], ['Videos/Videos3.mp4', 3]]);
  assert.equal(removed.videoFileHighWater, 3);
  assert.equal(removed.videoIndexHighWater, 3);
  const added = updateVideoManifest(removed, { action:'upload', path:'Videos/Videos4.mp4', width:1080, height:1920, duration:12.345, date:'2026-11-22T10:00:00Z', filenameHighWater:3 });
  assert.deepEqual(added.videos.at(-1), { path:'Videos/Videos4.mp4', width:1080, height:1920, index:4, date:'2026-11-22T10:00:00.000Z', duration:12.35, poster:'/assets/thumbs/Videos/Videos4.jpg' });
  assert.equal(original.videos.length, 3, 'input manifest is not mutated');
  const catalog = catalogFromManifest(added);
  assert.deepEqual(catalog.byColl.video.map(item => [item.file, item.index]), [['Videos1.mp4', 1], ['Videos3.mp4', 3], ['Videos4.mp4', 4]]);
  assert.equal(catalog.byColl.video.at(-1).poster, '/assets/thumbs/Videos/Videos4.jpg');
  assert.throws(() => updateVideoManifest(added, { action:'upload', path:'Videos/Videos4.mp4', width:1080, height:1920, duration:1 }), /already exists/);
  assert.throws(() => updateVideoManifest(added, { action:'upload', path:'Videos/clip.mp4', width:1080, height:1920, duration:1 }), /Invalid/);
  assert.throws(() => updateVideoManifest(added, { action:'upload', path:'Videos/Videos9.mp4', width:4, height:1920, duration:1 }), /Invalid/);
  assert.throws(() => withStableVideoIndices({ images:[], videos:[videoRecord(1), videoRecord(1)] }), /duplicate/);
  assert.throws(() => withStableVideoIndices({ images:[], videos:[videoRecord(1, { width:0 })] }), /Invalid/);
});

function gitFixture(t, { videos = [videoRecord(1), videoRecord(2)], files = null, conflictOnce = false } = {}) {
  const calls = [], trees = new Map(), commits = new Map(), blobs = new Map();
  let head = '1'.repeat(40), serial = 0, conflicts = 0;
  const hash = value => createHash('sha1').update(value).digest('hex');
  const manifestBytes = Buffer.from(JSON.stringify({ version:3, images:[], videos }));
  const manifestSha = gitSha(manifestBytes);
  blobs.set(manifestSha, manifestBytes);
  const initialTree = new Map([[MANIFEST, manifestSha], ['owner-note.txt', OTHER_SHA]]);
  for (const [path, sha] of files || videos.map(record => [record.path, OTHER_SHA])) {
    initialTree.set(path, sha);
    initialTree.set('preview_site/assets/thumbs/' + path.replace(/\.mp4$/, '.jpg'), 'b'.repeat(40));
  }
  trees.set('2'.repeat(40), initialTree);
  commits.set(head, { tree:{ sha:'2'.repeat(40) } });
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.Authorization, 'Bearer private-github-token');
    const resource = url.replace('https://api.github.com/repos/Bqurtas/BqurtasPortfolio/', '');
    const body = init.body ? JSON.parse(await new Response(init.body).text()) : null;
    calls.push({ resource, method:init.method, body });
    if (resource === 'git/ref/heads/main') return response({ object:{ sha:head } });
    if (resource.startsWith('git/commits/') && init.method === 'GET') return response(commits.get(resource.split('/')[2]));
    if (resource.startsWith('git/trees/') && init.method === 'GET') {
      const tree = trees.get(resource.split('/')[2].split('?')[0]);
      return response({ truncated:false, tree:[...tree].map(([path, sha]) => ({ path, sha, type:'blob', mode:'100644' })) });
    }
    if (resource.startsWith('git/blobs/') && init.method === 'GET') return response({ encoding:'base64', content:blobs.get(resource.split('/')[2]).toString('base64') });
    if (resource === 'git/blobs' && init.method === 'POST') {
      const bytes = Buffer.from(body.content, 'base64');
      const sha = gitSha(bytes);
      blobs.set(sha, bytes);
      return response({ sha }, 201);
    }
    if (resource === 'git/trees' && init.method === 'POST') {
      const next = new Map(trees.get(body.base_tree));
      for (const change of body.tree) change.sha === null ? next.delete(change.path) : next.set(change.path, change.sha);
      const sha = hash(JSON.stringify([...next]));
      trees.set(sha, next);
      return response({ sha }, 201);
    }
    if (resource === 'git/commits' && init.method === 'POST') {
      const sha = hash(JSON.stringify(body) + serial++);
      commits.set(sha, { tree:{ sha:body.tree }, parents:body.parents, message:body.message });
      return response({ sha }, 201);
    }
    if (resource === 'git/refs/heads/main' && init.method === 'PATCH') {
      assert.equal(body.force, false);
      if (conflictOnce && conflicts++ === 0) {
        const externalTree = new Map(trees.get(commits.get(head).tree.sha));
        externalTree.set('concurrent-owner-edit.txt', 'e'.repeat(40));
        const sha = hash('concurrent tree'); trees.set(sha, externalTree);
        head = hash('concurrent owner commit'); commits.set(head, { tree:{ sha } });
        return response({ message:'not a fast forward' }, 422);
      }
      assert.equal(commits.get(body.sha).parents[0], head);
      head = body.sha;
      return response({ object:{ sha:head } });
    }
    if (resource === 'contents/Videos?ref=main') {
      return response([...trees.get(commits.get(head).tree.sha)].filter(([path]) => path.startsWith('Videos/'))
        .map(([path, sha]) => ({ type:'file', name:path.split('/')[1], path, sha })).concat([{ type:'file', name:'notes.txt', path:'Videos/notes.txt', sha:OTHER_SHA }]));
    }
    throw new Error('unexpected GitHub resource ' + resource);
  });
  return { calls, blobs, get head() { return head; }, get tree() { return trees.get(commits.get(head).tree.sha); },
    get commit() { return commits.get(head); },
    get manifest() { return JSON.parse(blobs.get(this.tree.get(MANIFEST)).toString()); } };
}

async function receiptFor(t, bytes = FILM) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(await new Response(init.body).text());
    calls.push(url);
    return response({ sha:gitSha(Buffer.from(body.content, 'base64')) }, 201);
  };
  try {
    return (await (await handleGithubVideoStage(stageRequest(bytes.toString('base64')), ENV)).json());
  } finally { globalThis.fetch = original; }
}

const commitBody = (staged, extra = {}) => ({ action:'upload', folder:'Videos', ext:'mp4',
  video:{ sha:staged.sha, size:staged.size, receipt:staged.receipt },
  width:1080, height:1920, duration:34.07, posterB64:POSTER.toString('base64'), ...extra });

test('publishing a film commits the MP4, its poster and the manifest record in one commit', async (t) => {
  const staged = await receiptFor(t);
  const f = gitFixture(t);
  f.blobs.set(FILM_SHA, FILM); // the staged blob already lives in the repository
  const result = await handleGithubWork(commitBody(staged), ENV);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.path, 'Videos/Videos3.mp4');
  assert.equal(body.sha, FILM_SHA);
  assert.equal(body.publication, 'queued');
  assert.equal(f.tree.get('Videos/Videos3.mp4'), FILM_SHA);
  assert.equal(f.tree.get('preview_site/assets/thumbs/Videos/Videos3.jpg'), gitSha(POSTER));
  assert.equal(f.tree.get('owner-note.txt'), OTHER_SHA);
  assert.equal(f.commit.message, 'Publish gallery video Videos/Videos3.mp4');
  const record = f.manifest.videos.at(-1);
  assert.deepEqual({ ...record, date:undefined }, { path:'Videos/Videos3.mp4', width:1080, height:1920, index:3, date:undefined, duration:34.07, poster:'/assets/thumbs/Videos/Videos3.jpg' });
  assert.ok(Math.abs(Date.now() - Date.parse(record.date)) < 5000);
  assert.deepEqual(f.manifest.videos.map(item => item.index), [1, 2, 3]);
  assert.equal(f.manifest.videoFileHighWater, 3);
  const trees = f.calls.filter(call => call.resource === 'git/trees' && call.method === 'POST');
  assert.equal(trees.length, 1, 'one tree, one commit');
  assert.deepEqual(trees[0].body.tree.map(entry => entry.path).sort(), ['Videos/Videos3.mp4', MANIFEST, 'preview_site/assets/thumbs/Videos/Videos3.jpg']);
  assert.equal(f.calls.filter(call => call.resource === 'git/blobs' && call.method === 'POST').length, 2, 'only the poster and the manifest are uploaded again');
});

test('numbering continues past files on disk and deleted films, and a repeat publish changes nothing', async (t) => {
  const staged = await receiptFor(t);
  const f = gitFixture(t, { videos:[videoRecord(1), videoRecord(2)], files:[['Videos/Videos1.mp4', OTHER_SHA], ['Videos/Videos2.mp4', OTHER_SHA], ['Videos/Videos30.mp4', 'c'.repeat(40)]] });
  const first = await (await handleGithubWork(commitBody(staged), ENV)).json();
  assert.equal(first.path, 'Videos/Videos31.mp4');
  const writes = f.calls.filter(call => call.method !== 'GET').length;
  const again = await (await handleGithubWork(commitBody(staged), ENV)).json();
  assert.deepEqual(again, { ok:true, path:'Videos/Videos31.mp4', sha:FILM_SHA, alreadyExists:true, publication:'queued' });
  assert.equal(f.calls.filter(call => call.method !== 'GET').length, writes + 1, 'only the idempotent poster blob is re-sent');
});

test('deleting a film removes its MP4, poster and record, and keeps both watermarks', async (t) => {
  const f = gitFixture(t, { videos:[videoRecord(1), videoRecord(2), videoRecord(3)] });
  const result = await handleGithubWork({ action:'delete', path:'Videos/Videos3.mp4', sha:OTHER_SHA }, ENV);
  assert.equal(result.status, 200);
  assert.equal(f.tree.has('Videos/Videos3.mp4'), false);
  assert.equal(f.tree.has('preview_site/assets/thumbs/Videos/Videos3.jpg'), false);
  assert.equal(f.commit.message, 'Remove gallery video Videos/Videos3.mp4');
  assert.deepEqual(f.manifest.videos.map(item => [item.path, item.index]), [['Videos/Videos1.mp4', 1], ['Videos/Videos2.mp4', 2]]);
  assert.equal(f.manifest.videoIndexHighWater, 3);
  assert.equal(f.manifest.videoFileHighWater, 3);
  const staged = await receiptFor(t);
  const next = await (await handleGithubWork(commitBody(staged), ENV)).json();
  assert.equal(next.path, 'Videos/Videos4.mp4');
  assert.equal(f.manifest.videos.at(-1).index, 4);
  const stale = await handleGithubWork({ action:'delete', path:'Videos/Videos1.mp4', sha:'d'.repeat(40) }, ENV);
  assert.equal(stale.status, 409);
});

test('a concurrent branch update is rebased once and keeps the other edit', async (t) => {
  const staged = await receiptFor(t);
  const f = gitFixture(t, { conflictOnce:true });
  const result = await handleGithubWork(commitBody(staged), ENV);
  assert.equal(result.status, 200);
  assert.equal(f.tree.get('concurrent-owner-edit.txt'), 'e'.repeat(40));
  assert.equal(f.tree.get('Videos/Videos3.mp4'), FILM_SHA);
});

test('listing the Video collection returns only its MP4 files', async (t) => {
  gitFixture(t);
  const result = await handleGithubWork({ action:'list', folder:'Videos' }, ENV);
  assert.deepEqual(await result.json(), { ok:true, files:[
    { name:'Videos1.mp4', path:'Videos/Videos1.mp4', sha:OTHER_SHA },
    { name:'Videos2.mp4', path:'Videos/Videos2.mp4', sha:OTHER_SHA }
  ] });
});

test('a forged or mismatched receipt, a bad poster or bad geometry never reaches GitHub', async (t) => {
  const staged = await receiptFor(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not reach GitHub'); });
  for (const body of [
    commitBody({ ...staged, receipt:'x'.repeat(43) }),
    commitBody({ ...staged, size:staged.size + 1 }),
    commitBody({ ...staged, sha:OTHER_SHA }),
    commitBody(staged, { posterB64:Buffer.from('<svg/>'.repeat(40)).toString('base64') }),
    commitBody(staged, { width:8 }),
    commitBody(staged, { duration:-1 }),
    commitBody(staged, { ext:'webp' })
  ]) {
    const result = await handleGithubWork(body, ENV);
    assert.equal(result.status, 400);
    assert.equal((await result.json()).error, 'invalid-studio-video');
  }
  assert.equal((await handleGithubWork({ action:'delete', path:'Videos/../index.html', sha:OTHER_SHA }, ENV)).status, 400);
  assert.equal(calls, 0);
});

function environment(t) {
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
  return { ...ENV, EDIT_TOKEN:'browser-edit-secret', DB, RATE_LIMITER:{ limit:async () => ({ success:true }) } };
}

test('the Studio route stages a film only behind the session, editor password and same origin', async (t) => {
  const env = environment(t);
  const cookie = (await issueSession(env)).split(';', 1)[0];
  const post = (headers, text = FILM.toString('base64')) => studioPost({ env, params:{ service:'work-video' },
    request:new Request(`${ORIGIN}/api/studio/work-video`, { method:'POST', body:text, headers:{
      'Content-Type':'text/plain', Origin:ORIGIN, Cookie:cookie, 'x-edit-token':env.EDIT_TOKEN, ...headers } }) });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not reach GitHub'); });
  assert.equal((await post({ Cookie:'' })).status, 401);
  assert.equal((await post({ 'x-edit-token':'wrong' })).status, 401);
  assert.equal((await post({ Origin:'https://evil.example' })).status, 403);
  assert.equal(calls, 0);
  const server = blobServer(t);
  const staged = await post({});
  assert.equal(staged.status, 200);
  const body = await staged.json();
  assert.equal(body.sha, FILM_SHA);
  assert.equal(server.length, 1);
  assert.doesNotMatch(server[0].body + JSON.stringify(server[0].init.headers), /browser-edit-secret|independent-video-session/);
  const json = (payload) => studioPost({ env, params:{ service:'work-upload' },
    request:new Request(`${ORIGIN}/api/studio/work-upload`, { method:'POST', body:JSON.stringify(payload), headers:{
      'Content-Type':'application/json', Origin:ORIGIN, Cookie:cookie, 'x-edit-token':env.EDIT_TOKEN } }) });
  assert.equal((await json(commitBody(body, { width:'1080' }))).status, 400);
  assert.equal((await json({ action:'list', folder:'Videos/..' })).status, 400);
  gitFixture(t);
  assert.equal((await json({ action:'list', folder:'Videos' })).status, 200);
  assert.equal((await json(commitBody(body))).status, 200);
});
