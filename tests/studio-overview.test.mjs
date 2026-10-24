import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = source.indexOf('    const renderOverview = () => {');
const end = source.indexOf('    const wkApi = ', start);
assert.ok(start >= 0 && end > start);

function fixture({ connected = true, result } = {}) {
  let current, resolve;
  const calls = [];
  const view = {};
  Object.defineProperty(view, 'innerHTML', { set(markup) {
    current = { textContent:'—' };
    assert.match(markup, /id="dashOverviewBlogs" aria-live="polite">—</);
  } });
  const context = {
    window:{ __bqBlogCount:0 }, view, inboxTotal:null,
    collections:() => ({ book:{ count:3 } }), getAdmins:() => [], DT:key => key,
    $:selector => selector === '#dashOverviewBlogs' ? current : null,
    editToken:() => connected ? 'test-editor' : '',
    cmsApi:payload => {
      calls.push(payload);
      return result ? Promise.resolve(result) : new Promise(done => { resolve = done; });
    }
  };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.render = renderOverview;', context);
  return { render:context.render, calls, get count() { return current; },
    get complete() { return resolve; }, leave:() => { current = null; } };
}

test('Overview reads the Cloudflare editor list including drafts instead of the uninitialized public Journal count', async () => {
  const page = fixture();
  page.render();
  assert.equal(page.count.textContent, '—');
  assert.deepEqual(JSON.parse(JSON.stringify(page.calls)), [{ action:'list' }]);
  page.complete({ ok:true, posts:[{ id:27, published:true }, { id:28, published:false }] });
  await Promise.resolve();
  assert.equal(page.count.textContent, '2');
});

test('Overview distinguishes an empty Cloudflare list from an unavailable or disconnected editor', async () => {
  const empty = fixture({ result:{ ok:true, posts:[] } });
  empty.render(); await Promise.resolve();
  assert.equal(empty.count.textContent, '0');
  for (const result of [{ error:'studio-database-unavailable' }, { ok:true, posts:null }]) {
    const page = fixture({ result }); page.render(); await Promise.resolve();
    assert.equal(page.count.textContent, '—');
  }
  const disconnected = fixture({ connected:false }); disconnected.render();
  assert.equal(disconnected.calls.length, 0);
  assert.equal(disconnected.count.textContent, '—');
});

test('late Overview data never updates a replacement view or overwrites a newer request', async () => {
  const page = fixture(); page.render(); const oldCount = page.count;
  page.leave(); page.complete({ ok:true, posts:[{ id:27 }] });
  await Promise.resolve(); assert.equal(oldCount.textContent, '—');
  page.render(); const staleCount = page.count, completeOld = page.complete;
  page.leave(); page.render();
  assert.notEqual(page.count, staleCount);
  page.complete({ ok:true, posts:[{ id:27 }, { id:28 }] });
  await Promise.resolve(); assert.equal(page.count.textContent, '2');
  completeOld({ ok:true, posts:[] });
  await Promise.resolve(); assert.equal(page.count.textContent, '2');
  assert.equal(staleCount.textContent, '—');
});
