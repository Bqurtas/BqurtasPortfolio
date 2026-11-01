import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [main, enhance, lux] = await Promise.all(['main', 'enhance', 'lux'].map(name =>
  readFile(new URL(`../preview_site/js/${name}.js`, import.meta.url), 'utf8')));

function section(source, from, to, after = 0) {
  const start = source.indexOf(from, after);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `actual handler found: ${from}`);
  return source.slice(start, end);
}

function link(route, href) {
  return {
    tagName: 'A', dataset: { route }, href,
    getAttribute(name) { return name === 'href' ? this.href : this.dataset.route; },
    setAttribute(name, value) { if (name === 'href') this.href = value; },
    addEventListener(type, callback) { if (type === 'click') this.click = callback; }
  };
}

function activation(overrides = {}) {
  return { button: 0, prevented: 0, preventDefault() { this.prevented++; }, ...overrides };
}
const nativeActivations = [
  { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true },
  { button: 1 }, { button: 2 }, { defaultPrevented: true }
];

test('room links retain native modified clicks and normal clicks use the SPA', () => {
  const anchor = link('bio', '/bio');
  const opened = [], closed = [];
  vm.runInNewContext(section(main, '  routeLinks.forEach(a => {', '\n\n  // Browser back/forward'), {
    routeLinks: [anchor], window: { __bqCloseReader: () => closed.push('reader'), __bqCloseWorkCase: () => closed.push('case') },
    showRoomAfterTransitionCurtain: (...args) => opened.push(args)
  });
  for (const options of nativeActivations) {
    const event = activation(options);
    anchor.click(event);
    assert.equal(event.prevented, 0);
  }
  assert.deepEqual(opened, []);
  assert.deepEqual(closed, []);
  const event = activation();
  anchor.click(event);
  assert.equal(event.prevented, 1);
  assert.deepEqual(opened, [['bio', true]]);
  assert.deepEqual(closed, ['reader', 'case']);
});

test('room hrefs track every language without replacing home, query or fragment destinations', () => {
  const anchors = [link('design', '#'), link('design', '/design'), link('bio', '/ku/bio'),
    link('contact', '/contact?from=nav#pitchForm'), link('blog', '/blog')];
  const external = link('bio', 'https://example.com/bio');
  const listeners = {};
  const window = { __bqDesiredLang: 'ku' };
  const context = {
    routeLinks: [...anchors, external], validRooms: ['design', 'blog', 'bio', 'contact'],
    URL_LANGS: ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'], currentLang: 'en', window,
    document: { addEventListener(type, callback) { listeners[type] = callback; } }
  };
  vm.runInNewContext(section(main, '  const routeHrefPaths = ', '\n  let triggerReveals'), context);
  assert.deepEqual(anchors.map(anchor => anchor.href), ['/ku', '/ku/design', '/ku/bio', '/ku/contact?from=nav#pitchForm', '/ku/blog'],
    'the requested Kurdish prefix survives the temporary English dictionary fallback');
  for (const language of ['kmr', 'ar', 'fr', 'tr', 'sv', 'en', 'ku']) {
    window.__bqDesiredLang = language;
    context.currentLang = language;
    listeners['bq:language']();
    const prefix = language === 'en' ? '' : '/' + language;
    assert.deepEqual(anchors.map(anchor => anchor.href), [prefix || '/', prefix + '/design', prefix + '/bio', prefix + '/contact?from=nav#pitchForm', prefix + '/blog']);
  }
  assert.equal(external.href, 'https://example.com/bio');
});

test('journal index links preserve native activations while an ordinary desktop click opens the reader', () => {
  const anchor = link('blog', '/ku/blog/27');
  const post = { id: 27 };
  const opened = [];
  const after = enhance.indexOf('a.href = blogBase()');
  const source = section(enhance, "        a.addEventListener('click', (e) => {", '\n        list.appendChild(a);', after);
  vm.runInNewContext(source, { a: anchor, p: post, window: { matchMedia: () => ({ matches: false }) }, openReader: p => opened.push(p) });
  for (const options of nativeActivations) {
    const event = activation(options);
    anchor.click(event);
    assert.equal(event.prevented, 0);
  }
  assert.deepEqual(opened, []);
  const event = activation();
  anchor.click(event);
  assert.equal(event.prevented, 1);
  assert.deepEqual(opened, [post]);
});

test('home journal cards also preserve native activations', () => {
  const card = { ...link('blog', '/blog/27'), getAttribute: () => '27' };
  const post = { id: 27 }, opened = [];
  vm.runInNewContext(section(enhance, "      grid.querySelectorAll('.blog-card').forEach((c) => {", '\n    };'), {
    grid: { querySelectorAll: () => [card] }, findPostBySlug: () => post, openReader: p => opened.push(p)
  });
  for (const options of nativeActivations) {
    const event = activation(options);
    card.click(event);
    assert.equal(event.prevented, 0);
  }
  assert.deepEqual(opened, []);
  const event = activation();
  card.click(event);
  assert.equal(event.prevented, 1);
  assert.deepEqual(opened, [post]);
});

test('opening a route in another tab does not animate the current page curtain', () => {
  let click;
  const played = [];
  const anchor = link('bio', '/ku/bio');
  const source = section(lux, "    document.addEventListener('click', function (ev) {", "\n    addEventListener('pagehide'", lux.indexOf('window.__bqPlayRoomCurtain ='));
  vm.runInNewContext(source, { document: { addEventListener(type, callback) { click = callback; } }, playCurtain: route => played.push(route) });
  const target = { closest: () => anchor };
  for (const options of nativeActivations) click(activation({ target, ...options }));
  assert.deepEqual(played, []);
  click(activation({ target }));
  assert.deepEqual(played, ['bio']);
});
