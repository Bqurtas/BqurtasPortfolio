import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = authored.indexOf('  (function blog() {');
const reader = authored.indexOf('    /* ----- reader (', start);
const load = authored.indexOf('    const loadCmsPosts = () => {', reader);
const loaded = authored.indexOf('\n    try { window.__bqBlogCount = POSTS.length; } catch (e) {}   // initial', load);
assert.ok(start >= 0 && reader > start && load > reader && loaded > load);
// Run the real index, preview and feed paths; the modal reader is a separate
// consumer and is replaced by a spy so no simulated layout or network is needed.
const source = authored.slice(start, reader) + authored.slice(load, loaded) + `
    renderPage();
    const initialLoad = loadCmsPosts();
    window.journal = { renderPage, loadCmsPosts, initialLoad };
  })();`;

function element(tagName = 'div') {
  const attributes = new Map(), listeners = new Map();
  let html = '', content = '';
  const el = {
    tagName: tagName.toUpperCase(), attributes, children: [], className: '',
    hidden: false, disabled: false, dataset: {}, style: {}, value: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    fire(type, options = {}) {
      const event = { button: 0, preventDefault() {}, ...options };
      return (listeners.get(type) || []).map(callback => callback(event));
    },
    appendChild(child) { child.parentNode = child.parentElement = el; el.children.push(child); return child; },
    insertBefore(child, before) {
      child.parentNode = child.parentElement = el;
      el.children.splice(el.children.indexOf(before), 0, child);
    },
    after(child) {
      child.parentNode = child.parentElement = el.parentNode;
      el.parentNode.children.splice(el.parentNode.children.indexOf(el) + 1, 0, child);
    },
    remove() {
      if (el.parentNode) el.parentNode.children.splice(el.parentNode.children.indexOf(el), 1);
      el.parentNode = el.parentElement = null;
    },
    querySelectorAll(selector) {
      const matches = child => selector.split(',').some(part => {
        const names = part.trim().split('.').filter(Boolean);
        return names.length && names.every(name => child.classList.contains(name));
      });
      return el.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
    },
    querySelector(selector) { return el.querySelectorAll(selector)[0] || null; },
    get nextElementSibling() {
      return el.parentNode?.children[el.parentNode.children.indexOf(el) + 1] || null;
    },
    get textContent() { return content; },
    set textContent(value) { content = String(value); el.children = []; },
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = String(value); content = html.replace(/<[^>]+>/g, ''); el.children = [];
      for (const match of html.matchAll(/<button class="([^"]+)"(?: data-cat="([^"]*)")?[^>]*>/g)) {
        const button = element('button');
        button.className = match[1];
        if (match[2] != null) button.setAttribute('data-cat', match[2]);
        el.appendChild(button);
      }
    }
  };
  el.classList = {
    contains: name => el.className.split(/\s+/).includes(name),
    add(...names) { el.className = [...new Set([...el.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
    remove(...names) { el.className = el.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); }
  };
  return el;
}

function fixture({ configured = true, mobile = false, lang = 'en' } = {}) {
  const ids = ['blogIndex', 'blogList', 'blogGhost', 'blogCard', 'bcImg', 'bcTag', 'bcTitle', 'bcSub', 'bcMeta', 'bcRead',
    'blogPager', 'blogPages', 'blogPrev', 'blogNext', 'blogGoForm', 'blogGoInput'];
  const nodes = Object.fromEntries(ids.map(id => [id, element()]));
  const section = element(), preview = element(), foot = element(), cta = element();
  section.appendChild(nodes.blogIndex);
  section.appendChild(nodes.blogPager);
  nodes.blogIndex.appendChild(nodes.blogList);
  nodes.blogIndex.appendChild(preview);
  nodes.blogList.appendChild(nodes.blogGhost);
  preview.appendChild(nodes.blogCard);
  foot.className = 'blog-card-foot'; cta.className = 'blog-card-cta';
  nodes.blogCard.appendChild(foot); nodes.blogCard.appendChild(cta);
  nodes.bcTitle.textContent = 'On the architecture of meaning';
  nodes.bcRead.textContent = '6 MIN';
  const document = { createElement: element, documentElement: { dataset: { lang } } };
  const window = { BQ_SUPA: configured ? { url: 'https://cms.example', key: 'public' } : {}, matchMedia: () => ({ matches: mobile }) };
  const requests = [], timers = new Map(), opened = [];
  let timer = 0;
  vm.runInNewContext(source, {
    $: selector => nodes[selector.slice(1)] || null,
    document, window, CDN: '', blogBase: () => '/blog', scrollTarget() {},
    openReader: post => opened.push(post), renderLatest() {}, pendingSlug: null,
    setTimeout(callback) { timers.set(++timer, callback); return timer; },
    clearTimeout: id => timers.delete(id),
    fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }))
  });
  const flushPreview = () => {
    const scheduled = [...timers.values()];
    timers.clear();
    scheduled.forEach(callback => callback());
  };
  const rows = () => nodes.blogList.querySelectorAll('.index-row');
  return { nodes, section, document, window, requests, timers, opened, foot, cta, rows, flushPreview,
    status: () => nodes.blogList.querySelector('.blog-feed-status'),
    async complete(data, index = 0, ok = true, promise = window.journal.initialLoad) {
      requests[index].resolve({ ok, json: async () => data });
      await promise;
    }
  };
}
const post = (id, tag = 'Type') => ({ id, title: `Note ${id}`, subtitle: `Summary ${id}`, tag, date: 'OCT 2026', read_minutes: 4, body: 'A real published note.' });

test('loading and confirmed empty feeds never expose a fictional or interactive post', async () => {
  const f = fixture();
  assert.equal(f.nodes.blogIndex.dataset.blogState, 'loading');
  assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'true');
  assert.match(f.status().textContent, /Loading the journal/);
  assert.equal(f.nodes.blogCard.getAttribute('role'), null);
  assert.equal(f.nodes.blogCard.getAttribute('tabindex'), null);
  assert.equal(f.nodes.bcRead.textContent, '');
  assert.equal(f.nodes.blogPager.hidden, true);
  assert.equal(f.cta.hidden, true);
  f.nodes.blogCard.fire('click');
  assert.equal(f.opened.length, 0);
  await f.complete([]);
  assert.equal(f.nodes.blogIndex.dataset.blogState, 'empty');
  assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'false');
  assert.match(f.nodes.bcTitle.textContent, /No notes published/);
  assert.equal(f.status().getAttribute('role'), 'status');
  assert.equal(f.status().getAttribute('aria-live'), 'polite');
});

test('published previews follow keyboard focus and activate the visible post', async () => {
  const f = fixture();
  await f.complete([post(1), post(2)]);
  f.flushPreview();
  assert.equal(f.status().hidden, true);
  assert.equal(f.nodes.blogIndex.dataset.blogState, 'ready');
  assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'false');
  assert.equal(f.nodes.blogCard.getAttribute('role'), 'button');
  assert.equal(f.nodes.blogCard.getAttribute('tabindex'), '0');
  assert.equal(f.nodes.blogCard.getAttribute('aria-labelledby'), 'bcTitle');
  assert.equal(f.cta.hidden, false);
  f.rows()[1].fire('focus');
  f.flushPreview();
  assert.equal(f.nodes.bcTitle.textContent, 'Note 2');
  let prevented = false;
  f.nodes.blogCard.fire('keydown', { key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.opened[0].id, 2);
});

test('mobile disclosures are removed when the list changes category or page', async () => {
  const f = fixture({ mobile: true });
  await f.complete(Array.from({ length: 10 }, (_, i) => post(i + 1, i < 8 ? 'Type' : 'Place')));
  f.rows()[0].fire('click');
  assert.equal(f.nodes.blogList.querySelectorAll('.index-inline').length, 1);
  f.nodes.blogNext.fire('click');
  assert.equal(f.nodes.blogList.querySelectorAll('.index-inline').length, 0);
  assert.match(f.rows()[0].href, /\/9$/);
  f.rows()[0].fire('click');
  const filter = f.section.querySelectorAll('.blog-filter').find(button => button.getAttribute('data-cat') === 'type');
  filter.fire('click');
  assert.equal(f.nodes.blogList.querySelectorAll('.index-inline').length, 0);
  assert.match(f.rows()[0].href, /\/1$/);
  f.rows()[0].fire('click');
  f.window.journal.renderPage(); // Language changes use the same renderer.
  assert.equal(f.nodes.blogList.querySelectorAll('.index-inline').length, 0);
});

test('an empty refresh cancels a pending preview before it can revive an old post', async () => {
  const f = fixture();
  await f.complete([post(1)]);
  assert.equal(f.timers.size, 1);
  const refresh = f.window.journal.loadCmsPosts();
  await f.complete([], 1, true, refresh);
  f.flushPreview();
  assert.equal(f.nodes.blogIndex.dataset.blogState, 'empty');
  assert.equal(f.nodes.blogCard.getAttribute('tabindex'), null);
  assert.match(f.nodes.bcTitle.textContent, /No notes published/);
  f.nodes.blogCard.fire('click');
  assert.equal(f.opened.length, 0);
});

test('HTTP and malformed feed failures are errors, not confirmed empty journals', async () => {
  for (const [data, ok] of [[{ message: 'Unavailable' }, false], [{ unexpected: true }, true]]) {
    const f = fixture({ lang: 'ku' });
    await f.complete(data, 0, ok);
    assert.equal(f.nodes.blogIndex.dataset.blogState, 'error');
    assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'false');
    assert.match(f.nodes.bcTitle.textContent, /نەتوانرا/);
    assert.equal(f.nodes.blogCard.getAttribute('role'), null);
  }
  const missing = fixture({ configured: false });
  assert.equal(missing.requests.length, 0);
  assert.equal(missing.nodes.blogIndex.dataset.blogState, 'error');
  assert.equal(missing.nodes.blogIndex.getAttribute('aria-busy'), 'false');
});

test('a late older request cannot overwrite a newer feed, and a failed refresh keeps published notes', async () => {
  const f = fixture();
  const newest = f.window.journal.loadCmsPosts();
  await f.complete([post(2)], 1, true, newest);
  await f.complete([post(1)]);
  f.flushPreview();
  assert.equal(f.nodes.bcTitle.textContent, 'Note 2');
  const refresh = f.window.journal.loadCmsPosts();
  assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'true');
  f.requests[2].reject(new Error('network'));
  await refresh;
  f.flushPreview();
  assert.equal(f.nodes.blogIndex.dataset.blogState, 'ready');
  assert.equal(f.nodes.blogIndex.getAttribute('aria-busy'), 'false');
  assert.equal(f.nodes.bcTitle.textContent, 'Note 2');
});
