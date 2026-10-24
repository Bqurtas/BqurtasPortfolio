import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../preview_site/js/studio-inbox.js', import.meta.url), 'utf8');

function fixture(fetchImpl) {
  const created = []; const requests = []; let expired = false;
  const create = (tag, text = '') => {
    const node = { tagName:tag, textContent:text, style:{}, attrs:{}, children:[], handlers:{}, isConnected:true,
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(event, handler) { this.handlers[event] = handler; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children.forEach(child => { child.isConnected = false; }); this.children = children; }
    };
    Object.defineProperty(node, 'innerHTML', { set() { throw new Error('Untrusted inbox content must not be rendered as HTML'); } });
    created.push(node); return node;
  };
  const root = create('main');
  const context = { window:{}, document:{ createElement:create, createTextNode:text => create('#text', text) }, AbortSignal,
    fetch:async (url, options) => { requests.push({ url, options }); return fetchImpl(JSON.parse(options.body)); }
  };
  vm.runInNewContext(source, context);
  return { root, created, requests,
    render:options => context.window.BQStudioInbox.render({ root, lang:'en', getToken:() => 'test-editor', onSessionRequired:() => { expired = true; }, ...options }),
    get expired() { return expired; }
  };
}
const reply = data => ({ ok:true, json:async () => data });

test('private inbox uses same-origin credentialed requests and renders hostile text literally', async () => {
  const message = '<script>alert("untrusted enquiry")</script>';
  const page = fixture(async body => reply({ ok:true, items:[{ id:1, name:'Client', email:'name+tag@example.test', message, project_type:'Identity', created_at:'2026-10-24T10:00:00.000Z', read_at:null }], total:1, unread:1, next:null }));
  await page.render();
  assert.equal(page.requests.length, 1); assert.equal(page.requests[0].url, '/api/inbox');
  assert.equal(page.requests[0].options.credentials, 'same-origin'); assert.equal(page.requests[0].options.cache, 'no-store');
  assert.equal(page.requests[0].options.headers['x-edit-token'], 'test-editor');
  assert.ok(page.created.some(node => node.textContent === message));
  const link = page.created.find(node => node.tagName === 'a');
  assert.equal(link.href, 'mailto:name%2Btag%40example.test');
  assert.ok(page.created.some(node => node.textContent === 'Mark as read'));
});

test('private inbox cannot expose entries without an editor connection and expires the owner session on server rejection', async () => {
  const page = fixture(async () => ({ ok:false, json:async () => ({ error:'session-required' }) }));
  await page.render({ getToken:() => '' });
  assert.equal(page.requests.length, 0);
  assert.ok(page.created.some(node => /Connect the editor/.test(node.textContent)));
  await page.render();
  assert.equal(page.expired, true);
  assert.ok(page.created.some(node => /session expired/.test(node.textContent)));
});

test('a removed inbox view ignores a late private response', async () => {
  let complete;
  const page = fixture(() => new Promise(resolve => { complete = resolve; }));
  const pending = page.render();
  page.root.replaceChildren();
  complete(reply({ ok:true, items:[{ id:1, name:'Must not render', email:'private@example.test', message:'Late private payload', created_at:'2026-10-24T10:00:00.000Z' }], total:1, unread:1, next:null }));
  await pending;
  assert.ok(!page.created.some(node => node.textContent === 'Late private payload'));
});
