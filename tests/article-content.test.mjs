import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { articleContent, rewriteArticleContent } from '../functions/_article-content.js';

const post = {
  id: 27, title: 'Original title', subtitle: 'Original summary', tag: 'Design',
  body: 'First paragraph.\n\nSecond paragraph.', created_at: '2026-06-17T18:42:28.133Z',
  read_minutes: 6, cover: 'assets/article.webp', published: true,
  i18n: { ku: { title: 'ناونیشان', subtitle: 'پوختە', body: 'یەکەم\n\nدووەم' } }
};

function element(attributes = {}, tagName = 'div') {
  return {
    attributes: { ...attributes }, tagName, content: null, html: false, appended: '',
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    setInnerContent(value, options) { this.content = value; this.html = options?.html === true; },
    append(value) { this.appended += value; }
  };
}

function rewrite(row = post, lang = 'en', options = {}) {
  const handlers = new Map();
  const rewriter = { on(selector, handler) { handlers.set(selector, handler); return this; } };
  assert.equal(rewriteArticleContent(rewriter, row, lang, options), rewriter);
  const nodes = new Map([...handlers].map(([selector, handler]) => {
    const node = element(selector === '#reader' ? { class: 'reader', 'aria-hidden': 'true' } : {});
    handler.element(node);
    return [selector, node];
  }));
  return nodes;
}

test('article SSR uses stored translations and the reader field fallback rules', () => {
  const localized = articleContent(post, 'ku', { 'blog.minRead': '{n} خولەک', 'rd.back': 'گەڕانەوە' });
  assert.equal(localized.title, 'ناونیشان');
  assert.equal(localized.subtitle, 'پوختە');
  assert.deepEqual(localized.paragraphs, ['یەکەم', 'دووەم']);
  assert.equal(localized.blogUrl, '/ku/blog');
  assert.equal(localized.read, '6 خولەک');
  assert.equal(localized.back, 'گەڕانەوە');
  assert.equal(localized.date, 'JUN 2026');
  assert.equal(localized.cover, 'https://bqurtas.com/assets/article.webp');

  for (const translated of [{ title: '   ', body: ' ', subtitle: 'Summary only' }, {}]) {
    const fallback = articleContent({ ...post, i18n: { fr: translated } }, 'fr');
    assert.equal(fallback.title, post.title);
    assert.equal(fallback.subtitle, post.subtitle);
    assert.deepEqual(fallback.paragraphs, ['First paragraph.', 'Second paragraph.']);
  }
  const partial = articleContent({ ...post, i18n: { fr: { title: 'Titre', body: '  ' } } }, 'fr');
  assert.equal(partial.title, 'Titre');
  assert.deepEqual(partial.paragraphs, ['First paragraph.', 'Second paragraph.']);
});

test('article SSR treats authored markup as text and only emits escaped paragraphs', () => {
  const malicious = '<img src=x onerror="alert(1)"> & </p><script>alert(2)</script>';
  const nodes = rewrite({ ...post, title: malicious, body: malicious + '\n\nSecond < paragraph', i18n: {} });
  assert.equal(nodes.get('#rdTitle').content, malicious);
  assert.equal(nodes.get('#rdTitle').html, false, 'HTMLRewriter escapes text fields');
  const body = nodes.get('#rdText');
  assert.equal(body.html, true);
  assert.equal(body.content, '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &lt;/p&gt;&lt;script&gt;alert(2)&lt;/script&gt;</p><p>Second &lt; paragraph</p>');
  assert.doesNotMatch(body.content, /<script|<img/);
});

test('article covers reject executable, off-site and deceptive URLs', () => {
  for (const cover of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//evil.example/image.png',
    'https://evil.example/image.png', 'https://bqurtas.com@evil.example/a.png',
    'https://raw.githubusercontent.com/other/repo/main/a.png', '/\\evil.example/a.png', '/a\n.png', '']) {
    assert.equal(articleContent({ ...post, cover }).cover, '', cover);
    const image = rewrite({ ...post, cover }).get('#rdImg');
    assert.equal(image.attributes.src, undefined);
    assert.equal(image.attributes.hidden, '');
  }
  for (const cover of ['/assets/article.webp', 'https://bqurtas.com/media/Book/Book1.webp',
    'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Blog/blog1.webp']) {
    assert.ok(articleContent({ ...post, cover }).cover.startsWith('https://'));
  }
});

test('SSR opens the existing reader with semantic heading and no-JavaScript back navigation', async () => {
  const nodes = rewrite(post, 'ku', { nonce: 'abc123', dictionary: { 'rd.back': 'گەڕانەوە' } });
  const reader = nodes.get('#reader');
  assert.equal(reader.attributes.class, 'reader is-open');
  assert.equal(reader.attributes['aria-hidden'], 'false');
  assert.equal(reader.attributes['aria-modal'], 'true');
  assert.equal(reader.attributes['aria-labelledby'], 'rdTitle');
  assert.equal(reader.attributes['data-server-post'], '27');
  assert.equal(nodes.get('#rdTitle').tagName, 'h1');
  assert.equal(nodes.get('#readerBack').tagName, 'a');
  assert.equal(nodes.get('#readerBack').attributes.href, '/ku/blog');
  assert.equal(nodes.get('#readerBack').attributes['aria-label'], 'گەڕانەوە');
  assert.equal(nodes.get('head').appended, '<style nonce="abc123">body:has(#reader.is-open){overflow:hidden}</style>');
  assert.equal(rewrite(post, 'en', { nonce: '"><script>' }).has('head'), false);

  const shell = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  for (const selector of nodes.keys()) {
    if (!selector.startsWith('#')) continue;
    assert.match(shell, new RegExp('id="' + selector.slice(1) + '"'), `reuse the existing ${selector} element`);
  }
});
