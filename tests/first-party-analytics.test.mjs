import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ANALYTICS_CLIENT_JS } from '../functions/_analytics-client.js';
import { archiveAssets } from '../scripts/generate-media-archive.mjs';

const source = await readFile(new URL('../preview_site/js/analytics.js', import.meta.url), 'utf8');
function fixture({ privacy = false, dnt = false, beacon = true, pathname = '/', consent = 'allowed' } = {}) {
  const events = new Map(), timers = new Map(), sent = [], fallback = [];
  const location = { protocol:'https:', hostname:'bqurtas.com', pathname };
  const history = { pushState(state, title, path) { location.pathname = path; return 'pushed'; }, replaceState(state, title, path) { location.pathname = path; return 'replaced'; } };
  const document = { visibilityState:'visible', readyState:'complete', referrer:'https://example.org/', documentElement:{lang:'en'},
    addEventListener(name, fn) { events.set(name, fn); } };
  const consentState = { value:consent, choice() { return this.value; } };
  vm.runInNewContext(source.slice(source.indexOf('/* First-party, cookieless visit counting')), {
    location, history, document, window:{__bqPrivacy:consentState, addEventListener(name, fn) { events.set(name, fn); }},
    navigator:{globalPrivacyControl:privacy, doNotTrack:dnt ? '1' : '0', sendBeacon(url, data) { sent.push({url, data:JSON.parse(data)}); return beacon; }},
    fetch(url, options) { fallback.push({url, options}); return Promise.resolve(); },
    setTimeout(fn) { timers.set(fn, fn); return fn; }, clearTimeout(fn) { timers.delete(fn); }
  });
  return { privacy:consentState, location, history, document, sent, fallback, emit:name=>events.get(name)?.(), flush() { for (const [id, fn] of timers) { timers.delete(id); fn(); } } };
}
test('first-party analytics deduplicates routing events and delays hidden-page visits', () => {
  const page = fixture(); page.flush();
  assert.equal(page.sent.length, 1); assert.equal(page.sent[0].url, '/api/hit');
  page.emit('bq:route'); page.emit('bq:language'); page.flush();
  assert.equal(page.sent.length, 1);
  page.location.pathname = '/ku/bio'; page.document.documentElement.lang = 'ku';
  page.document.visibilityState = 'hidden'; page.emit('bq:route'); page.flush();
  assert.equal(page.sent.length, 1);
  page.document.visibilityState = 'visible'; page.emit('visibilitychange'); page.flush();
  assert.equal(page.sent.length, 2); assert.equal(page.sent[1].data.r, '');
});
test('visitor privacy preference suppresses visits and a refused beacon falls back on this origin', () => {
  const privatePage = fixture({privacy:true}); privatePage.flush(); assert.equal(privatePage.sent.length, 0);
  const page = fixture({beacon:false}); page.flush(); assert.equal(page.fallback[0].url, '/api/hit');
  assert.equal(page.fallback[0].options.credentials, 'same-origin');
});

test('opening and closing journal entries through History counts each visible path once', () => {
  const page = fixture({ pathname:'/blog' }); page.flush();
  assert.equal(page.history.pushState({ bqPost:'27' }, '', '/blog/27'), 'pushed');
  page.emit('bq:route'); page.flush();
  assert.deepEqual(page.sent.map(hit => hit.data.p), ['/blog', '/blog/27']);
  assert.equal(page.history.replaceState(null, '', '/blog'), 'replaced'); page.flush();
  assert.deepEqual(page.sent.map(hit => hit.data.p), ['/blog', '/blog/27', '/blog']);
  page.history.replaceState(null, '', '/blog'); page.flush();
  assert.equal(page.sent.length, 3);
});

test('standalone archive and artwork visits use the identical DNT/GPC-aware client', async () => {
  assert.equal(source, ANALYTICS_CLIENT_JS, 'one authored source drives inline work pages and the public client');
  const { motionScript } = await archiveAssets();
  for (const behavior of ['/api/hit', 'doNotTrack', 'globalPrivacyControl']) assert.ok(motionScript.body.includes(behavior), `archive bundle contains ${behavior}`);
  const headers = await readFile(new URL('../preview_site/_headers', import.meta.url), 'utf8');
  assert.match(headers, /\/archive\/\*[\s\S]*?connect-src 'self' https:\/\/gateway\.umami\.is\/api\/send;/);
  for (const pathname of ['/archive/photos/', '/design/book/1']) {
    const page = fixture({ pathname }); page.flush(); assert.equal(page.sent[0].data.p, pathname);
    for (const preference of [{ privacy:true }, { dnt:true }]) {
      const privatePage = fixture({ pathname, ...preference }); privatePage.flush(); assert.equal(privatePage.sent.length, 0);
    }
  }
});


test('statistics wait for explicit permission and stop immediately when it is withdrawn', () => {
  const page = fixture({ consent:null }); page.flush();
  assert.equal(page.sent.length, 0);
  page.location.pathname = '/bio'; page.emit('bq:route'); page.flush();
  assert.equal(page.sent.length, 0);
  page.privacy.value = 'allowed'; page.emit('bq:privacy'); page.flush();
  assert.deepEqual(page.sent.map(hit => hit.data.p), ['/bio']);
  page.privacy.value = 'denied'; page.emit('bq:privacy'); page.location.pathname = '/contact'; page.emit('bq:route'); page.flush();
  assert.equal(page.sent.length, 1, 'declining must also cancel an already queued visit');
});
