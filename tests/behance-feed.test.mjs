import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBehanceFeed, oembedTitle, freshBehanceProjects } from '../functions/api/_behance-feed.js';
import { onRequestGet as feedGet } from '../functions/api/behance-feed.js';
import { onRequestGet as coverGet } from '../functions/api/behance-cover.js';

const item = (id, slug, cover, date = 'Sat, 07 Nov 2026 12:19:11 +0000', title = 'Title') => `
  <item>
    <title><![CDATA[${title}]]></title>
    <link><![CDATA[https://www.behance.net/gallery/${id}/${slug}]]></link>
    <guid><![CDATA[https://www.behance.net/gallery/${id}/${slug}]]></guid>
    <description><![CDATA[<img src='https://mir-s3-cdn-cf.behance.net/projects/404/${cover}' /><br /> Text]]></description>
    <pubDate><![CDATA[${date}]]></pubDate>
  </item>`;
const FEED = `<?xml version="1.0" encoding="utf-8" ?><rss version="2.0"><channel><title><![CDATA[Barakat Qurtas]]></title>
  ${item('999000111', 'New-Poster-Set', 'a1b2c3999000111.Y3JvcCwxNjE2.png', 'Sun, 08 Nov 2026 09:00:00 +0000', 'New Poster Set ? 2026')}
  ${item('243843115', 'BOOK', '487dee243843115.Y3JvcCwzODM1.png')}
  ${item('555000222', 'Mismatch', 'ffffff123456789.Y3JvcA.png')}
</channel></rss>`;

function withFetch(handler, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push(String(url)); return handler(String(url), options); };
  return Promise.resolve().then(() => run(calls)).finally(() => { globalThis.fetch = original; });
}
const behance = (url) => {
  if (url.startsWith('https://www.behance.net/feeds/user')) return new Response(FEED, { headers: { 'Content-Type': 'application/rss+xml' } });
  if (url.startsWith('https://www.behance.net/services/oembed')) {
    return Response.json({ title: 'New Poster Set — 2026 - Barakat Qurtas', author_name: 'Barakat Qurtas' });
  }
  if (url.startsWith('https://mir-s3-cdn-cf.behance.net/projects/808/a1b2c3999000111')) return new Response('img', { headers: { 'Content-Type': 'image/png' } });
  return new Response('no', { status: 404 });
};
const assets = (projects) => ({ ASSETS: { fetch: async () => Response.json({ projects }) } });
const KNOWN = [{ id: '243843115', slug: 'book', title: 'BOOK', url: 'https://www.behance.net/gallery/243843115/BOOK', date: '2026-02-09', cover: { src: '/assets/behance/243843115/cover.webp', w: 808, h: 632 }, images: [] }];

test('the public feed is read as projects, and only covers of their own project count', () => {
  const items = parseBehanceFeed(FEED);
  assert.deepEqual(items.map((i) => i.id), ['999000111', '243843115']);
  assert.deepEqual(items[0], {
    id: '999000111', slug: 'new-poster-set', url: 'https://www.behance.net/gallery/999000111/New-Poster-Set',
    date: '2026-11-08', title: 'New Poster Set ? 2026', cover: 'a1b2c3999000111.Y3JvcCwxNjE2.png',
  });
  assert.deepEqual(parseBehanceFeed('<rss></rss>'), []);
});

test('oEmbed gives the correctly written title without the author', () => {
  assert.equal(oembedTitle({ title: 'BOOK - Barakat Qurtas', author_name: 'Barakat Qurtas' }), 'BOOK');
  assert.equal(oembedTitle({ title: 'A - B' }), 'A - B');
  assert.equal(oembedTitle(null), '');
});

test('only projects missing from the copy are returned, with first-party covers', async () => {
  await withFetch(behance, async () => {
    const fresh = await freshBehanceProjects(new Set(['243843115']));
    assert.equal(fresh.length, 1);
    assert.equal(fresh[0].title, 'New Poster Set — 2026');
    assert.equal(fresh[0].cover.src, '/api/behance-cover?id=999000111&f=a1b2c3999000111.Y3JvcCwxNjE2.png&s=808');
    assert.equal(fresh[0].cover.small, '/api/behance-cover?id=999000111&f=a1b2c3999000111.Y3JvcCwxNjE2.png&s=404');
  });
});

test('the feed endpoint answers new projects, and an empty list when Behance or the copy fails', async () => {
  const request = new Request('https://bqurtas.com/api/behance-feed');
  await withFetch(behance, async () => {
    const response = await feedGet({ request, env: assets(KNOWN) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /public, max-age=600/);
    assert.equal(response.headers.get('x-behance-feed'), 'ok');
    const body = await response.json();
    assert.deepEqual(body.projects.map((p) => p.id), ['999000111']);
  });
  const tab = String.fromCharCode(9); // legal in a header, but not printable
  await withFetch(() => new Response('down', { status: 503, headers: { Server: `varnish${tab}edge` } }), async () => {
    const response = await feedGet({ request, env: assets(KNOWN) });
    assert.match(response.headers.get('cache-control'), /public, max-age=120/);
    assert.equal(response.headers.get('x-behance-feed'), 'behance 503 (varnish edge)', 'why, in header-safe text');
    assert.deepEqual((await response.json()).projects, []);
  });
  await withFetch(() => { throw new TypeError('Network connection lost.'); }, async () => {
    const response = await feedGet({ request, env: assets(KNOWN) });
    assert.equal(response.headers.get('x-behance-feed'), 'unreachable: TypeError Network connection lost.');
  });
  await withFetch(() => { throw Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }); }, async () => {
    const response = await feedGet({ request, env: assets(KNOWN) });
    assert.equal(response.headers.get('x-behance-feed'), 'timeout');
  });
  await withFetch(behance, async () => {
    const response = await feedGet({ request, env: {} });
    assert.equal(response.headers.get('x-behance-feed'), 'copy unavailable');
    assert.deepEqual((await response.json()).projects, [], 'without the copy nothing is reported as new');
  });
});

test('Behance refusals and errors are never kept in the edge cache', async () => {
  await withFetch(behance, async () => {
    const seen = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options) => { seen.push(options?.cf); return original(url, options); };
    try { await freshBehanceProjects(new Set(['243843115'])); } finally { globalThis.fetch = original; }
    assert.ok(seen.length >= 2);
    for (const cf of seen) {
      assert.equal(cf.cacheTtl, undefined);
      assert.equal(cf.cacheTtlByStatus['300-599'], -1);
      assert.ok(cf.cacheTtlByStatus['200-299'] > 0);
    }
  });
});

test('the cover endpoint serves only covers of projects in the owner feed', async () => {
  const ask = (query) => coverGet({ request: new Request('https://bqurtas.com/api/behance-cover?' + query) });
  await withFetch(behance, async (calls) => {
    const ok = await ask('id=999000111&f=a1b2c3999000111.Y3JvcCwxNjE2.png&s=808');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/png');
    assert.ok(calls.some((u) => u === 'https://mir-s3-cdn-cf.behance.net/projects/808/a1b2c3999000111.Y3JvcCwxNjE2.png'));
    for (const query of [
      'id=999000111&f=a1b2c3999000111.Y3JvcCwxNjE2.png&s=1400',
      'id=123456789&f=a1b2c3999000111.Y3JvcCwxNjE2.png&s=808',
      'id=999000111&f=..%2Fsecret.png&s=808',
      'id=777000111&f=a1b2c3777000111.Y3JvcCwxNjE2.png&s=808',
    ]) {
      assert.equal((await ask(query)).status, 404, query);
    }
  });
});
