import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { githubWorksConfigured, handleGithubWork, handleGithubMediaUpload } from '../functions/api/_github-works.js';

const ENV = { GITHUB_TOKEN:'private-github-token' };
const COMMIT = 'c'.repeat(40);
const OTHER_SHA = 'a'.repeat(40);
const IMAGE = await readFile(new URL('../preview_site/assets/thumbs/LogoDesign/Logo1.webp', import.meta.url));
const IMAGE_SHA = createHash('sha1').update(`blob ${IMAGE.length}\0`).update(IMAGE).digest('hex');
const upload = { folder:'LogoDesign', ext:'webp', dataB64:IMAGE.toString('base64') };
const file = (name, sha = OTHER_SHA, folder = 'LogoDesign') => ({ type:'file', name, path:`${folder}/${name}`, sha });
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test('GitHub work publishing requires a server token and validates actions, folders and delete paths before network access', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('unexpected network request'); });
  assert.equal(githubWorksConfigured({}), false);
  assert.equal(githubWorksConfigured({ GITHUB_TOKEN:'  ' }), false);
  assert.equal(githubWorksConfigured(ENV), true);
  const missing = await handleGithubWork(upload, {});
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error, 'studio-github-not-configured');
  for (const body of [
    { action:'anything', folder:'Book' },
    { action:'list', folder:'__proto__' },
    { action:'list', folder:'../private' },
    { action:'delete', path:'.github/workflows/quality.yml', sha:OTHER_SHA },
    { action:'delete', path:'LogoDesign/../private.webp', sha:OTHER_SHA },
    { action:'delete', path:'LogoDesign/Logo1.webp', sha:'not-a-sha' }
  ]) assert.equal((await handleGithubWork(body, ENV)).status, 400);
  assert.equal(calls, 0);
});

test('listing uses only the fixed repository and returns the existing dashboard file contract', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    return response([
      file('Logo10.webp'), file('Logo2.webp'),
      { ...file('Logo3.webp'), path:'Book/Logo3.webp' },
      { ...file('Logo4.webp'), target:'../../private' },
      { ...file('Logo5.webp'), type:'dir' },
      { ...file('Logo6.webp'), sha:'not-a-sha' },
      file('notes.txt')
    ]);
  });
  const result = await handleGithubWork({ action:'list', folder:'LogoDesign' }, ENV);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok:true, files:[
    { name:'Logo2.webp', path:'LogoDesign/Logo2.webp', sha:OTHER_SHA },
    { name:'Logo10.webp', path:'LogoDesign/Logo10.webp', sha:OTHER_SHA }
  ] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/Bqurtas/BqurtasPortfolio/contents/LogoDesign?ref=main');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer private-github-token');
  assert.equal(calls[0].init.redirect, 'manual');
});

function gitFixture(t, { files = [file('Logo1.webp'), file('Logo7.webp')], conflictOnce = false, failRef = false } = {}) {
  const calls = [], trees = new Map(), commits = new Map(), blobs = new Map();
  const manifestPath = 'preview_site/assets/gallery-manifest.json';
  let head = '1'.repeat(40), serial = 0, conflicts = 0;
  const hash = value => createHash('sha1').update(value).digest('hex');
  const initialManifest = { version:2, images:files.map(item => ({ path:item.path, width:320, height:320, hash:'a'.repeat(16) })), videos:[] };
  const manifestBytes = Buffer.from(JSON.stringify(initialManifest));
  const manifestSha = hash(Buffer.concat([Buffer.from(`blob ${manifestBytes.length}\0`), manifestBytes]));
  blobs.set(manifestSha, manifestBytes);
  const initialTree = new Map([[manifestPath, manifestSha], ['owner-note.txt', OTHER_SHA]]);
  for (const item of files) {
    initialTree.set(item.path, item.sha);
    initialTree.set('preview_site/assets/thumbs/' + item.path, item.sha);
  }
  trees.set('2'.repeat(40), initialTree);
  commits.set(head, { tree:{ sha:'2'.repeat(40) } });
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.Authorization, 'Bearer private-github-token');
    const resource = url.replace('https://api.github.com/repos/Bqurtas/BqurtasPortfolio/', '');
    const body = init.body ? JSON.parse(init.body) : null;
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
      const sha = hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));
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
      commits.set(sha, { tree:{ sha:body.tree }, parents:body.parents });
      return response({ sha }, 201);
    }
    if (resource === 'git/refs/heads/main' && init.method === 'PATCH') {
      assert.equal(body.force, false);
      if (failRef) throw new DOMException('private transport diagnostic', 'TimeoutError');
      if (conflictOnce && conflicts++ === 0) {
        const externalTree = new Map(trees.get(commits.get(head).tree.sha));
        externalTree.set('concurrent-owner-edit.txt', 'e'.repeat(40));
        const sha = hash('concurrent tree'); trees.set(sha, externalTree);
        head = hash('concurrent owner commit'); commits.set(head, { tree:{ sha } });
        return response({ message:'not a fast forward' }, 422);
      }
      assert.equal(commits.get(body.sha).parents[0], head, 'only a commit based on the current branch may publish');
      head = body.sha;
      return response({ object:{ sha:head } });
    }
    throw new Error('unexpected GitHub resource ' + resource);
  });
  return { calls, get tree() { return trees.get(commits.get(head).tree.sha); },
    get manifest() { return JSON.parse(blobs.get(this.tree.get(manifestPath)).toString()); } };
}

test('upload atomically commits original, thumbnail and stable manifest while leaving unrelated files intact', async (t) => {
  const f = gitFixture(t);
  const result = await handleGithubWork(upload, ENV);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.path, 'LogoDesign/Logo8.webp');
  assert.equal(body.sha, IMAGE_SHA);
  assert.equal(body.publication, 'queued');
  assert.match(body.commit, /^[a-f0-9]{40}$/);
  assert.equal(f.tree.get('LogoDesign/Logo8.webp'), IMAGE_SHA);
  assert.equal(f.tree.get('preview_site/assets/thumbs/LogoDesign/Logo8.webp'), IMAGE_SHA);
  assert.equal(f.tree.get('owner-note.txt'), OTHER_SHA);
  assert.deepEqual(f.manifest.images.map(item => [item.path, item.index]), [['LogoDesign/Logo1.webp', 1], ['LogoDesign/Logo7.webp', 2], ['LogoDesign/Logo8.webp', 3]]);
  assert.equal(f.manifest.imageFileHighWater.LogoDesign, 8);
  const transactions = f.calls.filter(call => call.resource === 'git/trees' && call.method === 'POST');
  assert.equal(transactions.length, 1);
  assert.deepEqual(transactions[0].body.tree.map(entry => entry.path).sort(), ['LogoDesign/Logo8.webp', 'preview_site/assets/gallery-manifest.json', 'preview_site/assets/thumbs/LogoDesign/Logo8.webp']);
});

test('retrying bytes already published does not create any new Git objects or duplicate work', async (t) => {
  const f = gitFixture(t, { files:[file('Logo9.webp', IMAGE_SHA)] });
  const result = await handleGithubWork(upload, ENV);
  assert.deepEqual(await result.json(), { ok:true, path:'LogoDesign/Logo9.webp', sha:IMAGE_SHA, alreadyExists:true, publication:'queued' });
  assert.equal(f.calls.filter(call => call.method !== 'GET').length, 0);
});

test('delete atomically removes original, thumbnail and manifest entry while retaining allocation watermarks', async (t) => {
  const f = gitFixture(t);
  const result = await handleGithubWork({ action:'delete', path:'LogoDesign/Logo7.webp', sha:OTHER_SHA }, ENV);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).publication, 'queued');
  assert.equal(f.tree.has('LogoDesign/Logo7.webp'), false);
  assert.equal(f.tree.has('preview_site/assets/thumbs/LogoDesign/Logo7.webp'), false);
  assert.deepEqual(f.manifest.images.map(item => [item.path, item.index]), [['LogoDesign/Logo1.webp', 1]]);
  assert.equal(f.manifest.imageIndexHighWater.LogoDesign, 2);
  assert.equal(f.manifest.imageFileHighWater.LogoDesign, 7);
  const next = await handleGithubWork(upload, ENV);
  assert.equal((await next.json()).path, 'LogoDesign/Logo8.webp');
  assert.equal(f.manifest.images.at(-1).index, 3);
});

test('stale delete SHA cannot remove a replacement image', async (t) => {
  const f = gitFixture(t);
  const result = await handleGithubWork({ action:'delete', path:'LogoDesign/Logo7.webp', sha:'b'.repeat(40) }, ENV);
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error, 'studio-github-conflict');
  assert.equal(f.calls.filter(call => call.method !== 'GET').length, 0);
  assert.equal(f.tree.has('LogoDesign/Logo7.webp'), true);
});

test('a definite concurrent branch update is rebased once without losing the owner’s other edit', async (t) => {
  const f = gitFixture(t, { conflictOnce:true });
  const result = await handleGithubWork(upload, ENV);
  assert.equal(result.status, 200);
  assert.equal(f.calls.filter(call => call.resource === 'git/ref/heads/main').length, 2);
  assert.equal(f.calls.filter(call => call.resource === 'git/refs/heads/main').length, 2);
  assert.equal(f.tree.get('concurrent-owner-edit.txt'), 'e'.repeat(40));
  assert.equal(f.tree.get('LogoDesign/Logo8.webp'), IMAGE_SHA);
});

test('invalid or oversized image input never reaches GitHub', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response([]); });
  const invalidImages = ['', 'not base64', Buffer.from('<html>not an image</html>').toString('base64'), upload.dataB64.slice(0, -4), 'A'.repeat(7_500_004)];
  for (const dataB64 of invalidImages) {
    const result = await handleGithubWork({ ...upload, dataB64 }, ENV);
    assert.equal(result.status, 400);
    assert.equal((await result.json()).error, 'invalid-studio-image');
  }
  assert.equal((await handleGithubWork({ ...upload, ext:'svg' }, ENV)).status, 400);
  assert.equal(calls, 0);
});

test('GitHub redirects, permission failures, limits and conflicts return fixed errors without leaking service details', async (t) => {
  const cases = [
    [302, {}, 'studio-github-invalid', 502],
    [401, {}, 'studio-github-auth', 502],
    [403, {}, 'studio-github-auth', 502],
    [403, { 'x-ratelimit-remaining':'0' }, 'studio-github-rate-limited', 429],
    [404, {}, 'studio-github-not-found', 502],
    [409, {}, 'studio-github-conflict', 409],
    [422, {}, 'studio-github-conflict', 409],
    [503, {}, 'studio-github-unavailable', 502]
  ];
  for (const [status, headers, code, expectedStatus] of cases) {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async (_url, init) => {
      calls++;
      assert.equal(init.redirect, 'manual');
      return response({ message:'private-token and private upstream details' }, status, { Location:'https://untrusted.example/', ...headers });
    });
    const result = await handleGithubWork({ action:'list', folder:'LogoDesign' }, ENV);
    assert.equal(result.status, expectedStatus);
    assert.deepEqual(await result.json(), { ok:false, error:code });
    assert.equal(calls, 1);
    assert.equal(result.headers.get('Location'), null);
  }
});

test('uncertain branch updates are never retried automatically and report unconfirmed publication', async (t) => {
  const f = gitFixture(t, { failRef:true });
  const result = await handleGithubWork(upload, ENV);
  assert.equal(result.status, 504);
  assert.deepEqual(await result.json(), { ok:false, error:'studio-github-timeout', publication:'unconfirmed' });
  assert.equal(f.calls.filter(call => call.resource === 'git/ref/heads/main').length, 1);
  assert.equal(f.calls.filter(call => call.resource === 'git/refs/heads/main').length, 1);
  assert.equal(f.tree.has('LogoDesign/Logo8.webp'), false);
});

test('truncated, oversized or malformed directory responses never become empty successful listings', async (t) => {
  for (const upstream of [
    () => response(Array.from({ length:1000 }, (_, index) => file(`Logo${index + 1}.webp`))),
    () => response({ message:'unexpected object' }),
    () => new Response('invalid JSON'),
    () => new Response('[]', { headers:{ 'Content-Length':String(3 * 1024 * 1024) } })
  ]) {
    t.mock.method(globalThis, 'fetch', async () => upstream());
    const result = await handleGithubWork({ action:'list', folder:'LogoDesign' }, ENV);
    assert.ok(result.status >= 400);
    assert.equal((await result.json()).ok, false);
  }
});

test('public CMS media commits only to generated upload paths and returns a first-party deployment URL', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init });
    const path = url.split('/contents/')[1];
    assert.match(path, /^preview_site\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/);
    assert.equal(init.method, 'PUT');
    assert.equal(Object.hasOwn(JSON.parse(init.body), 'sha'), false);
    return response({ content:{ path, sha:IMAGE_SHA }, commit:{ sha:COMMIT } }, 201);
  });
  const result = await handleGithubMediaUpload({ filename:'private customer cover.png', contentType:'image/webp', dataB64:upload.dataB64 }, ENV);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.ok, true);
  assert.equal(body.url, 'https://bqurtas.com/' + body.path.replace(/^preview_site\//, ''));
  assert.equal(body.commit, COMMIT);
  assert.equal(body.publication, 'queued');
  assert.doesNotMatch(JSON.stringify(body), /private customer/);
  assert.doesNotMatch(calls[0].init.body, /private customer/);
  assert.equal(calls.length, 1);
});

test('CMS media rejects unsafe filenames and non-WebP content before accessing GitHub', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not fetch'); });
  for (const body of [
    { filename:'../../index.html', contentType:'image/webp', dataB64:upload.dataB64 },
    { filename:'image.svg', contentType:'image/svg+xml', dataB64:upload.dataB64 },
    { filename:'image.webp', contentType:'image/webp', dataB64:btoa('<svg></svg>') }
  ]) assert.equal((await handleGithubMediaUpload(body, ENV)).status, 400);
  assert.equal(calls, 0);
});
