import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { issueSession } from '../functions/api/_session.js';
import { onRequestPost as studioPost } from '../functions/api/studio/[service].js';
import { onRequestGet as portraitGet } from '../functions/api/portrait.js';
import { readPublicPortrait, rewritePublicPortrait, rewritePortraitSitemap, PORTRAIT_SIZES } from '../functions/api/_portrait.js';
import { BUNDLED_PORTRAIT_VARIANTS } from '../functions/_portrait-variants.js';
import { decodeWebp } from '../functions/api/_github-works.js';

const ORIGIN = 'https://bqurtas.com';
const IMAGE = await readFile(new URL('../preview_site/assets/hero-sketch.webp', import.meta.url));
const SECOND = await readFile(new URL('../preview_site/assets/thumbs/LogoDesign/Logo1.webp', import.meta.url));
const payload = (image = IMAGE) => ({ action:'publish', filename:'portrait.webp', contentType:'image/webp', dataB64:image.toString('base64') });
const version = image => createHash('sha256').update(image).digest('hex');

function environment(t) {
  const database = new DatabaseSync(':memory:');
  t.after(() => database.close());
  const DB = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) { bindings = values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value); return this; },
        async first() { return database.prepare(sql).get(...bindings) || null; },
        async all() { return { results:database.prepare(sql).all(...bindings) }; },
        async run() { const result = database.prepare(sql).run(...bindings); return { meta:{ changes:Number(result.changes), last_row_id:Number(result.lastInsertRowid) } }; }
      };
    },
    async batch(statements) {
      database.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec('COMMIT');
        return results;
      } catch (error) { database.exec('ROLLBACK'); throw error; }
    }
  };
  return { DB, GITHUB_TOKEN:'private-repository-key', EDIT_TOKEN:'private-editor-key', SESSION_SECRET:'independent-session-key-with-at-least-32-bytes' };
}

async function studio(env, body, headers = {}) {
  const Cookie = (await issueSession(env)).split(';', 1)[0];
  return studioPost({ env, params:{ service:'site-portrait' }, request:new Request(`${ORIGIN}/api/studio/site-portrait`, {
    method:'POST', headers:{ Origin:ORIGIN, Cookie, 'x-edit-token':env.EDIT_TOKEN, 'Content-Type':'application/json', ...headers }, body:JSON.stringify(body)
  }) });
}

const get = (env, suffix = '', options = {}) => portraitGet({ env, request:new Request(`${ORIGIN}/api/portrait${suffix}`, options) });

function mockGitHub(t) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, options, body });
    const bytes = Buffer.from(body.content, 'base64');
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    const path = new URL(url).pathname.split('/contents/')[1];
    return Response.json({ content:{ path, sha }, commit:{ sha:'b'.repeat(40) } }, { status:201 });
  });
  return calls;
}

test('the image sitemap follows a Studio portrait change without changing gallery entries', async t => {
  const env = environment(t);
  mockGitHub(t);
  const xml = await readFile(new URL('../preview_site/sitemap-images.xml', import.meta.url), 'utf8');
  const works = value => value.slice(value.indexOf('<loc>https://bqurtas.com/design/'));
  assert.equal(await rewritePortraitSitemap(xml, env.DB), xml);
  for (const image of [IMAGE, SECOND]) {
    assert.equal((await studio(env, payload(image))).status, 200);
    const updated = await rewritePortraitSitemap(xml, env.DB);
    assert.ok(updated.includes(`<image:loc>https://bqurtas.com/api/portrait?image=${version(image)}</image:loc>`));
    assert.equal(works(updated), works(xml), 'all canonical works and videos remain byte-identical');
    assert.equal((updated.match(/<image:loc>/g) || []).length, (xml.match(/<image:loc>/g) || []).length);
    assert.doesNotMatch(updated, /assets\/hero-sketch\.webp/);
  }
  await studio(env, { action:'reset' });
  assert.equal(await rewritePortraitSitemap(xml, env.DB), xml);
  assert.equal(await rewritePortraitSitemap(xml, undefined), xml);
  assert.equal(await rewritePortraitSitemap(xml, { batch:async () => { throw new Error('offline'); }, prepare:() => ({}) }), xml);
});

test('portrait publishing requires the signed Studio session, editor credential and same origin', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  assert.equal((await studio(env, payload(), { Cookie:'' })).status, 401);
  assert.equal((await studio(env, payload(), { 'x-edit-token':'wrong' })).status, 401);
  assert.equal((await studio(env, payload(), { Origin:'https://other.example' })).status, 403);
  assert.equal((await studio(env, { action:'delete-everything' })).status, 400);
  assert.equal(calls.length, 0);
});

test('publishing preserves transparent WebP bytes in GitHub and serves the new portrait immediately from Cloudflare', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  assert.deepEqual(await (await get(env)).json(), { ok:true, portrait:null });
  const response = await studio(env, payload());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.portrait.url, `/api/portrait?image=${version(IMAGE)}`);
  assert.equal(result.portrait.width, 768);
  assert.equal(result.portrait.height, 768);
  assert.equal(result.portrait.dark_mode, 'invert');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.github\.com\/repos\/Bqurtas\/BqurtasPortfolio\/contents\/preview_site\/uploads\/[a-f0-9-]+\.webp$/);
  assert.equal(calls[0].body.branch, 'main');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-repository-key');
  assert.equal(calls[0].body.content, IMAGE.toString('base64'));
  const publicResult = await get(env);
  assert.deepEqual(await publicResult.json(), result);
  assert.match(publicResult.headers.get('cache-control'), /no-store/);
  const image = await get(env, `?image=${version(IMAGE)}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.match(image.headers.get('cache-control'), /immutable/);
  assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), IMAGE);
  assert.equal(calls.length, 1, 'public viewing does not use GitHub or any secret');
  assert.doesNotMatch(JSON.stringify(result), /github|private-|image\/webp|dataB64/i);
});

test('reset restores the bundled portrait, while old version URLs retain exactly their original bytes', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  assert.equal((await studio(env, payload())).status, 200);
  assert.equal((await studio(env, payload(SECOND))).status, 200);
  assert.equal((await readPublicPortrait(env.DB)).url, `/api/portrait?image=${version(SECOND)}`);
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(IMAGE)}`)).arrayBuffer()), IMAGE);
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(SECOND)}`)).arrayBuffer()), SECOND);
  assert.deepEqual(await (await studio(env, { action:'reset' })).json(), { ok:true, portrait:null });
  assert.equal(await readPublicPortrait(env.DB), null);
  const restored = await studio(env, payload());
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).portrait.url, `/api/portrait?image=${version(IMAGE)}`);
  assert.equal(calls.length, 2, 'republishing the same bytes reuses the stored GitHub original');
});

test('portrait requests support safe immutable validators and reject unknown or malformed versions', async t => {
  const env = environment(t);
  mockGitHub(t);
  await studio(env, payload());
  const head = await get(env, `?image=${version(IMAGE)}`, { method:'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const etag = `"${version(IMAGE)}"`;
  const unchanged = await get(env, `?image=${version(IMAGE)}`, { headers:{ 'If-None-Match':etag } });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');
  for (const value of ['', '../../private', 'a'.repeat(64)]) {
    const missing = await get(env, `?image=${value}`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('cache-control'), /no-store/);
  }
});

test('invalid files, oversized portraits and a failed GitHub backup never replace the active portrait', async t => {
  const env = environment(t);
  mockGitHub(t);
  await studio(env, payload());
  const previous = await readPublicPortrait(env.DB);
  for (const data of [{ ...payload(), contentType:'image/svg+xml' }, { ...payload(), filename:'../private.webp' }, { ...payload(), dataB64:btoa('<script>oops</script>') }]) {
    assert.equal((await studio(env, data)).status, 400);
  }
  // A valid extended WebP with a large canvas is rejected before GitHub.
  const large = Buffer.alloc(30);
  large.write('RIFF'); large.writeUInt32LE(22, 4); large.write('WEBPVP8X', 8); large.writeUInt32LE(10, 16);
  large.writeUIntLE(2999, 24, 3); large.writeUIntLE(2999, 27, 3);
  const oversized = await studio(env, payload(large));
  assert.equal(oversized.status, 400);
  assert.equal((await oversized.json()).error, 'portrait-image-too-large');
  const oversizedBytes = Buffer.alloc(1_000_002);
  IMAGE.copy(oversizedBytes);
  oversizedBytes.writeUInt32LE(oversizedBytes.length - 8, 4);
  oversizedBytes.write('JUNK', IMAGE.length);
  oversizedBytes.writeUInt32LE(oversizedBytes.length - IMAGE.length - 8, IMAGE.length + 4);
  const byteLimit = await studio(env, payload(oversizedBytes));
  assert.equal(byteLimit.status, 400);
  assert.equal((await byteLimit.json()).error, 'portrait-image-too-large');
  t.mock.method(globalThis, 'fetch', async () => new Response('secret provider failure', { status:401 }));
  const failed = await studio(env, payload(SECOND));
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).error, 'studio-github-auth');
  assert.deepEqual(await readPublicPortrait(env.DB), previous);
});

test('a failed database publication leaves the active portrait unchanged after the GitHub backup', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  await studio(env, payload());
  const previous = await readPublicPortrait(env.DB);
  t.mock.method(env.DB, 'batch', async () => { throw new Error('private write error'); });
  const failed = await studio(env, payload(SECOND));
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok:false, error:'studio-content-unavailable' });
  assert.deepEqual(await readPublicPortrait(env.DB), previous);
  assert.equal(calls.length, 2, 'the backup is durable even though activation did not succeed');
});

test('database failure leaves public HTML using its approved bundled portrait', async t => {
  const env = environment(t);
  mockGitHub(t);
  await studio(env, payload());
  const handlers = new Map();
  const rewriter = { on(selector, handler) { handlers.set(selector, handler); return this; } };
  await rewritePublicPortrait(rewriter, env.DB);
  for (const selector of ['#heroPortrait img', '.bio-teaser-portrait > img']) {
    const attributes = new Map([['src', '/assets/hero-sketch.webp?v=fallback'], ['width', '768'], ['height', '768']]);
    handlers.get(selector).element({ getAttribute:key => attributes.get(key), setAttribute:(key, value) => attributes.set(key, value) });
    assert.equal(attributes.get('src'), `/api/portrait?image=${version(IMAGE)}`);
    assert.equal(attributes.get('data-portrait-default'), '/assets/hero-sketch.webp?v=fallback');
    assert.equal(attributes.get('data-portrait-default-width'), '768');
    assert.equal(attributes.get('data-portrait-dark-mode'), 'invert');
  }
  let preload;
  handlers.get('link[rel="preload"][as="image"][href*="hero-sketch.webp"]').element({ setAttribute:(_key, value) => { preload = value; } });
  assert.equal(preload, `/api/portrait?image=${version(IMAGE)}`);
  let touched = false;
  await rewritePublicPortrait({ on() { touched = true; } }, { batch:async () => { throw new Error('private outage'); }, prepare() {} });
  assert.equal(touched, false);
  const down = await get({ DB:{ batch:async () => { throw new Error('private outage'); }, prepare() {} } });
  assert.equal(down.status, 503);
  assert.doesNotMatch(await down.text(), /private outage/);
});

test('legacy portraits default to light lines in dark mode without changing their immutable bytes', async t => {
  const env = environment(t);
  mockGitHub(t);
  await studio(env, payload());
  // Existing deployments have the image and active tables but no preference.
  await env.DB.prepare('DELETE FROM site_portrait_settings WHERE id=1').run();
  const portrait = await readPublicPortrait(env.DB);
  assert.equal(portrait.dark_mode, 'invert');
  assert.equal(portrait.url, `/api/portrait?image=${version(IMAGE)}`);
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(IMAGE)}`)).arrayBuffer()), IMAGE);
});

test('an owner can change dark appearance without reuploading and both server-rendered portraits receive the preference', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  const before = await (await studio(env, payload())).json();
  const saved = await studio(env, { action:'appearance', dark_mode:'original' });
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.deepEqual(result.portrait, { ...before.portrait, dark_mode:'original' });
  assert.deepEqual(await (await get(env)).json(), result);
  assert.equal(calls.length, 1, 'a preference change needs no new image or GitHub commit');
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(IMAGE)}`)).arrayBuffer()), IMAGE);
  const handlers = new Map();
  await rewritePublicPortrait({ on(selector, handler) { handlers.set(selector, handler); return this; } }, env.DB);
  for (const selector of ['#heroPortrait img', '.bio-teaser-portrait > img']) {
    const attrs = new Map([['src', '/assets/hero-sketch.webp'], ['width', '768'], ['height', '768']]);
    handlers.get(selector).element({ getAttribute:key => attrs.get(key), setAttribute:(key, value) => attrs.set(key, value) });
    assert.equal(attrs.get('data-portrait-dark-mode'), 'original');
  }
  assert.equal((await (await studio(env, payload(SECOND))).json()).portrait.dark_mode, 'original', 'older editors preserve the saved preference');
  assert.equal((await (await studio(env, { ...payload(), dark_mode:'invert' })).json()).portrait.dark_mode, 'invert', 'republishing existing bytes may change the preference atomically');
  assert.equal(calls.length, 2);
});

test('appearance changes keep the Studio authorization gate and reject invalid modes or a missing active portrait', async t => {
  const env = environment(t);
  const calls = mockGitHub(t);
  const action = { action:'appearance', dark_mode:'original' };
  assert.equal((await studio(env, action, { Cookie:'' })).status, 401);
  assert.equal((await studio(env, action, { 'x-edit-token':'wrong' })).status, 401);
  assert.equal((await studio(env, action, { Origin:'https://other.example' })).status, 403);
  const missing = await studio(env, action);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'portrait-not-found');
  assert.equal(await env.DB.prepare('SELECT dark_mode FROM site_portrait_settings WHERE id=1').first(), null);
  await studio(env, payload());
  const before = await readPublicPortrait(env.DB);
  for (const dark_mode of [null, '', 'invert(1)', { value:'original' }]) {
    assert.equal((await studio(env, { ...action, dark_mode })).status, 400);
    assert.equal((await studio(env, { ...payload(), dark_mode })).status, 400);
  }
  assert.deepEqual(await readPublicPortrait(env.DB), before);
  assert.equal(calls.length, 1);
  await studio(env, { action:'reset' });
  let touched = false;
  await rewritePublicPortrait({ on() { touched = true; return this; } }, env.DB);
  assert.equal(touched, false, 'reset leaves bundled fallback photos and their appearance untouched');
});

test('a preference write failure rolls back activation for both new and reused portrait images', async t => {
  const calls = mockGitHub(t);
  for (const reuse of [false, true]) {
    const env = environment(t);
    if (reuse) await studio(env, payload(SECOND));
    await studio(env, { ...payload(), dark_mode:'original' });
    const before = await readPublicPortrait(env.DB);
    const backups = calls.length;
    await env.DB.prepare("CREATE TRIGGER reject_appearance BEFORE INSERT ON site_portrait_settings BEGIN SELECT RAISE(ABORT, 'simulated preference failure'); END").run();
    const response = await studio(env, { ...payload(SECOND), dark_mode:'invert' });
    assert.equal(response.status, 503);
    assert.deepEqual(await readPublicPortrait(env.DB), before, 'neither the active image nor its preference can change partially');
    assert.equal((await get(env, `?image=${version(SECOND)}`)).status, reuse ? 200 : 404);
    assert.equal(calls.length, backups + (reuse ? 0 : 1), 'existing originals are reused; new backups remain durable');
  }
});

test('portrait renditions publish atomically with one durable original and remain independently immutable', async t => {
  const env = environment(t), calls = mockGitHub(t);
  const response = await studio(env, { ...payload(), variants:[{ dataB64:SECOND.toString('base64') }] });
  assert.equal(response.status, 200);
  const portrait = (await response.json()).portrait;
  assert.deepEqual(portrait.variants, [{ url:`/api/portrait?image=${version(SECOND)}`, width:320, height:320 }]);
  assert.equal(calls.length, 1, 'the original is backed up once; derived renditions stay in Cloudflare');
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(IMAGE)}`)).arrayBuffer()), IMAGE);
  const smaller = await get(env, `?image=${version(SECOND)}`);
  assert.deepEqual(Buffer.from(await smaller.arrayBuffer()), SECOND);
  assert.equal(smaller.headers.get('ETag'), `"${version(SECOND)}"`);
  assert.match(smaller.headers.get('Cache-Control'), /immutable/);
  const handlers = new Map();
  await rewritePublicPortrait({ on(selector, handler) { handlers.set(selector, handler); return this; } }, env.DB);
  const expected = `${portrait.variants[0].url} 320w, ${portrait.url} 768w`;
  for (const selector of ['#heroPortrait img', '.bio-teaser-portrait > img']) {
    const attrs = new Map([['src','/assets/hero-sketch.webp'],['srcset','/assets/old.webp 400w'],['sizes','40vw']]);
    handlers.get(selector).element({ getAttribute:key => attrs.get(key), setAttribute:(key,value) => attrs.set(key,value) });
    assert.equal(attrs.get('srcset'), expected);
    assert.equal(attrs.get('sizes'), PORTRAIT_SIZES);
    assert.equal(attrs.get('data-portrait-default-srcset'), '/assets/old.webp 400w');
    assert.equal(attrs.get('data-portrait-default-sizes'), '40vw');
  }
  const preload = new Map();
  handlers.get('link[rel="preload"][as="image"][href*="hero-sketch.webp"]').element({ setAttribute:(key,value) => preload.set(key,value) });
  assert.equal(preload.get('imagesrcset'), expected);
  assert.equal(preload.get('imagesizes'), PORTRAIT_SIZES);
  assert.equal(preload.get('href'), portrait.url);
  await studio(env, { action:'reset' });
  assert.deepEqual(Buffer.from(await (await get(env, `?image=${version(SECOND)}`)).arrayBuffer()), SECOND, 'old tabs retain immutable renditions after reset');
});

test('invalid portrait renditions cannot overwrite or activate a portrait', async t => {
  const env = environment(t), calls = mockGitHub(t);
  await studio(env, payload());
  const before = await readPublicPortrait(env.DB);
  for (const variants of [null, {}, [{ dataB64:'not-webp' }], Array(3).fill({ dataB64:SECOND.toString('base64') })]) {
    const response = await studio(env, { ...payload(), variants });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'invalid-portrait-variants');
  }
  const upscaled = await studio(env, { ...payload(SECOND), variants:[{ dataB64:IMAGE.toString('base64') }] });
  assert.equal(upscaled.status, 400);
  assert.equal(calls.length, 1, 'all invalid derivatives are rejected before publishing to GitHub');
  assert.deepEqual(await readPublicPortrait(env.DB), before);
});

test('a failed activation rolls back newly saved renditions along with the portrait', async t => {
  const env = environment(t); mockGitHub(t);
  await studio(env, payload());
  await env.DB.prepare("CREATE TRIGGER reject_variant_activation BEFORE INSERT ON site_portrait_settings BEGIN SELECT RAISE(ABORT, 'fixture failure'); END").run();
  const response = await studio(env, { ...payload(), variants:[{ dataB64:SECOND.toString('base64') }] });
  assert.equal(response.status, 503);
  assert.equal((await get(env, `?image=${version(SECOND)}`)).status, 404);
  assert.equal((await readPublicPortrait(env.DB)).variants, undefined);
});

test('bundled portrait renditions use verified content-addressed WebP files and only the matching original', async t => {
  const env = environment(t); mockGitHub(t);
  await studio(env, payload());
  for (const [originalVersion, variants] of Object.entries(BUNDLED_PORTRAIT_VARIANTS)) {
    assert.match(originalVersion, /^[a-f0-9]{64}$/);
    for (const variant of variants) {
      const bytes = await readFile(new URL(`../preview_site${variant.url}`, import.meta.url));
      assert.equal(variant.url, `/assets/portraits/${version(bytes)}.webp`);
      const dimensions = decodeWebp(bytes.toString('base64'));
      assert.equal(variant.width, dimensions.width); assert.equal(variant.height, dimensions.height);
    }
    await env.DB.prepare('INSERT INTO site_portraits(version,image,width,height,created_at,github_path,github_commit) VALUES(?,?,?,?,?,?,?)')
      .bind(originalVersion, IMAGE, 1200, 1200, '2026-10-29T00:00:00Z', 'fixture.webp', 'b'.repeat(40)).run();
    await env.DB.prepare('UPDATE site_portrait_active SET version=? WHERE id=1').bind(originalVersion).run();
    assert.deepEqual((await readPublicPortrait(env.DB)).variants, variants);
    await studio(env, payload());
    assert.equal((await readPublicPortrait(env.DB)).variants, undefined, 'a different owner upload cannot inherit the bundled portrait');
  }
});

// Resolve the limited CSS lengths authored in `sizes`, including nested commas,
// without a browser or copying the portrait's viewport formula into the test.
function commaList(value) {
  let depth = 0, from = 0;
  const parts = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && !depth) { parts.push(value.slice(from, i).trim()); from = i + 1; }
  }
  return [...parts, value.slice(from).trim()];
}
function sourceSize(viewport) {
  const length = value => {
    const dimension = value.match(/^([\d.]+)(px|vw|svh)$/);
    if (dimension) return Number(dimension[1]) * ({ px:1, vw:viewport.width / 100, svh:viewport.height / 100 }[dimension[2]]);
    const fn = value.match(/^(min|max|clamp)\((.*)\)$/);
    assert.ok(fn, `unsupported source size: ${value}`);
    const values = commaList(fn[2]).map(length);
    return fn[1] === 'clamp' ? Math.max(values[0], Math.min(values[1], values[2])) : Math[fn[1]](...values);
  };
  for (const item of commaList(PORTRAIT_SIZES)) {
    let remaining = item, applies = true;
    while (remaining.startsWith('(max-')) {
      const condition = remaining.match(/^\(max-(width|height): (\d+)px\)\s*(?:and\s*)?/);
      assert.ok(condition);
      applies &&= viewport[condition[1]] <= Number(condition[2]);
      remaining = remaining.slice(condition[0].length);
    }
    if (applies) return length(remaining);
  }
  assert.fail('portrait sizes must include a desktop fallback');
}

test('portrait source selection follows phone, landscape and desktop display sizes without undersizing retina screens', () => {
  const variants = Object.values(BUNDLED_PORTRAIT_VARIANTS)[0];
  const widths = [...variants.map(item => item.width), 1200];
  for (const [width, height, dpr, expected] of [
    [412,823,1.75,512], // The production mobile report: 255px, not the old advertised 297px.
    [390,844,3,960],
    [320,568,2,512],
    [740,390,2,512],
    [768,1024,2,640],
    [1440,900,1,512],
    [1440,900,2,960],
    [1440,500,2,512]
  ]) {
    const needed = sourceSize({ width, height }) * dpr;
    assert.equal(widths.find(candidate => candidate >= needed) || widths.at(-1), expected, `${width}×${height} @${dpr}`);
  }
});

test('the additional phone rendition stays lossless and smaller than the 640px source', async () => {
  const variants = Object.values(BUNDLED_PORTRAIT_VARIANTS)[0];
  const [small, medium] = await Promise.all([512,640].map(width => readFile(new URL(`../preview_site${variants.find(item => item.width === width).url}`, import.meta.url))));
  assert.equal(small.toString('ascii', 12, 16), 'VP8L', 'line art and transparency use lossless WebP');
  assert.ok(small.length < medium.length * .75, 'the phone rendition removes at least a quarter of the prior payload');
});
