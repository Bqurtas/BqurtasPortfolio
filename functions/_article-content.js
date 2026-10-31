/* Render a published journal row into the existing reader. The client fills
   these same elements after /api/journal loads; no crawler-only copy is added. */
const SITE = 'https://bqurtas.com';
const LANGS = new Set(['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv']);
const text = value => typeof value === 'string' ? value : '';
const hasText = value => text(value).trim().length > 0;
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function coverUrl(value) {
  const source = text(value).trim();
  // Match the CMS media policy, including legacy assets/ paths. Resolve those
  // paths from the site root, not from the current /blog/<id> URL.
  if (!/^(?:https:\/\/|\/(?!\/)|assets\/)/i.test(source)
    || /[\\\u0000-\u001f\u007f]/.test(source)) return '';
  try {
    const url = new URL(source, SITE + '/');
    const repository = url.origin === 'https://raw.githubusercontent.com'
      && /^\/Bqurtas\/BqurtasPortfolio\/[^/]+\/.+/.test(url.pathname);
    return !url.username && !url.password && (url.origin === SITE || repository) ? url.href : '';
  } catch { return ''; }
}

export function articleContent(post, lang = 'en', dictionary = {}) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) throw new TypeError('published article required');
  const language = LANGS.has(lang) ? lang : 'en';
  const translation = post.i18n?.[language];
  // Keep the same field-by-field fallback as L(p) in enhance.js. A translation
  // with only a subtitle does not replace the original article.
  const localized = translation && (hasText(translation.title) || hasText(translation.body));
  const field = name => localized && hasText(translation[name]) ? translation[name] : text(post[name]);
  const title = field('title');
  const date = text(post.date) || (text(post.created_at) && Number.isFinite(Date.parse(post.created_at))
    ? new Date(post.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
  const minutes = Number.isInteger(post.read_minutes) && post.read_minutes > 0 ? post.read_minutes : 4;
  return {
    id: String(post.id ?? ''),
    title,
    subtitle: field('subtitle'),
    paragraphs: field('body').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean),
    tag: text(post.tag) || 'Note',
    date: date.toUpperCase(),
    read: (text(dictionary['blog.minRead']) || '{n} MIN READ').replace('{n}', String(minutes)),
    cover: coverUrl(post.cover),
    back: text(dictionary['rd.back']) || 'Back',
    blogUrl: (language === 'en' ? '' : '/' + language) + '/blog'
  };
}

export function rewriteArticleContent(rewriter, post, lang = 'en', { nonce = '', dictionary = {} } = {}) {
  const article = articleContent(post, lang, dictionary);
  const setText = value => ({ element(el) { el.setInnerContent(value); } });
  rewriter.on('#reader', { element(el) {
    const classes = new Set((el.getAttribute('class') || '').split(/\s+/).filter(Boolean));
    classes.add('is-open');
    el.setAttribute('class', [...classes].join(' '));
    el.setAttribute('aria-hidden', 'false');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'rdTitle');
    el.setAttribute('data-server-post', article.id);
  } });
  rewriter.on('#rdTitle', { element(el) {
    el.tagName = 'h1';
    el.setInnerContent(article.title);
  } });
  for (const [id, value] of Object.entries({ rdTag: article.tag, rdDate: article.date,
    rdRead: article.read, rdHighlight: article.subtitle })) rewriter.on('#' + id, setText(value));
  rewriter.on('#rdText', { element(el) {
    el.setInnerContent(article.paragraphs.map(paragraph => '<p>' + escape(paragraph) + '</p>').join(''), { html: true });
  } });
  rewriter.on('#rdImg', { element(el) {
    el.setAttribute('alt', article.title);
    if (article.cover) {
      el.setAttribute('src', article.cover);
      el.removeAttribute('hidden');
    } else {
      el.removeAttribute('src');
      el.setAttribute('hidden', '');
    }
  } });
  rewriter.on('#readerBack', { element(el) {
    el.tagName = 'a';
    el.removeAttribute('type');
    el.setAttribute('href', article.blogUrl);
    el.setAttribute('aria-label', article.back);
  } });
  // This follows the reader's existing is-open state, so closing it restores
  // page scrolling even before the client has fetched its copy of the post.
  if (/^[A-Za-z0-9_-]+$/.test(nonce)) rewriter.on('head', { element(el) {
    el.append('<style nonce="' + nonce + '">body:has(#reader.is-open){overflow:hidden}</style>', { html: true });
  } });
  return rewriter;
}
