import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { LOCALIZED_COPY } from '../functions/_localized-copy.js';

const source = await readFile(new URL('../preview_site/js/i18n.js', import.meta.url), 'utf8');
const more = await readFile(new URL('../preview_site/js/i18n-more.js', import.meta.url), 'utf8');
const codes = { en: 'en', ku: 'ckb', kmr: 'ku', ar: 'ar', fr: 'fr', tr: 'tr', sv: 'sv' };

function page(lang, { serverRendered = true } = {}) {
  const writes = [], saved = [], pending = [];
  const copy = LOCALIZED_COPY[serverRendered ? lang : 'en'];
  function element(key, sourceAttribute, target) {
    const attrs = { [sourceAttribute]: key };
    let value = copy[key];
    if (target !== 'innerHTML' && target !== 'textContent') attrs[target] = value;
    const node = {
      getAttribute(name) { return attrs[name]; },
      setAttribute(name, next) { writes.push([key, name, next]); attrs[name] = next; }
    };
    for (const property of ['innerHTML', 'textContent']) Object.defineProperty(node, property, {
      get() { return value; },
      set(next) { writes.push([key, property, next]); value = next; }
    });
    return node;
  }
  const textKeys = ['hero.lede', 'bio.lede', 'nav.bio'];
  const nodes = {
    '[data-i18n]': textKeys.map(key => element(key, 'data-i18n', 'innerHTML')),
    '[data-i18n-ph]': [element('cf.name.ph', 'data-i18n-ph', 'placeholder')],
    '[data-i18n-aria]': [element('a11y.menuOpen', 'data-i18n-aria', 'aria-label')],
    '[data-i18n-opt]': [element('cf.choose', 'data-i18n-opt', 'textContent')]
  };
  const root = {
    lang: codes[lang], dir: ['ku', 'ar'].includes(lang) ? 'rtl' : 'ltr',
    dataset: { lang, ...(serverRendered ? { renderedLang: lang } : {}) }
  };
  const context = vm.createContext({
    window: {},
    document: { documentElement: root, querySelectorAll(selector) { return nodes[selector] || []; } },
    localStorage: { setItem(key, value) { saved.push([key, value]); } }
  });
  vm.runInContext(source, context);
  context.window.__loadI18nMore = callback => pending.push(callback);
  return {
    context, root, writes, saved, nodes,
    apply(lang) { return context.window.applyLang(lang); },
    complete() {
      vm.runInContext(more, context);
      context.window.__i18nMoreLoaded = true;
      pending.splice(0).forEach(callback => callback());
    }
  };
}

test('translated server pages keep their text, direction and chrome while dictionaries load', () => {
  for (const lang of Object.keys(codes).filter(lang => lang !== 'en')) {
    const browser = page(lang);
    const { context, root, writes, saved } = browser;
    assert.equal(browser.apply(lang), lang);
    assert.equal(browser.apply(lang), lang, 'a repeated request must also preserve the server copy');
    assert.deepEqual(writes, [], `${lang} must not be repainted in English before loading`);
    assert.equal(root.lang, codes[lang]);
    assert.equal(root.dir, ['ku', 'ar'].includes(lang) ? 'rtl' : 'ltr');
    for (const key of ['hero.lede', 'bio.lede', 'nav.bio', 'cf.name.ph', 'a11y.menuOpen', 'cf.choose']) {
      assert.equal(context.window.BQ_DICT[key], LOCALIZED_COPY[lang][key], `${lang}.${key} supports initial chrome rendering`);
    }
    assert.equal(context.window.BQ_DICT['meta.title.bio'], undefined, 'initial chrome leaves the server route title intact');
    assert.deepEqual(saved, [], 'persist only a completed language choice');
    browser.complete();
    assert.equal(context.window.BQ_DICT['hero.lede'], LOCALIZED_COPY[lang]['hero.lede']);
    assert.equal(context.window.BQ_DICT['bio.lede'], LOCALIZED_COPY[lang]['bio.lede']);
    assert.deepEqual(saved, [['bq_lang', lang]], 'only the newest pending request completes');
  }
});

test('static previews retain English fallback even when bootstrap marks a localized URL', () => {
  const browser = page('ku', { serverRendered: false });
  assert.equal(browser.apply('ku'), 'en');
  assert.equal(browser.root.lang, 'en');
  assert.equal(browser.root.dir, 'ltr');
  assert.equal(browser.context.window.BQ_DICT['hero.lede'], LOCALIZED_COPY.en['hero.lede']);
  browser.complete();
  assert.equal(browser.root.lang, 'ckb');
  assert.equal(browser.context.window.BQ_DICT['hero.lede'], LOCALIZED_COPY.ku['hero.lede']);
});

test('a newer language choice wins over pending SSR hydration and stale server markers', () => {
  const browser = page('ku');
  assert.equal(browser.apply('ku'), 'ku');
  assert.equal(browser.apply('en'), 'en');
  assert.equal(browser.apply('ku'), 'en', 'the original server marker cannot label repainted English as Kurdish');
  assert.equal(browser.apply('ar'), 'en');
  browser.complete();
  assert.equal(browser.root.lang, 'ar');
  assert.equal(browser.root.dir, 'rtl');
  assert.equal(browser.context.window.BQ_DICT['hero.lede'], LOCALIZED_COPY.ar['hero.lede']);
  assert.deepEqual(browser.saved, [['bq_lang', 'en'], ['bq_lang', 'ar']]);
});
