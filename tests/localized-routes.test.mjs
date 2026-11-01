import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/[[route]].js';
import { LOCALIZED_COPY } from '../functions/_localized-copy.js';
import { LANGUAGES, localizedCopySource } from '../scripts/generate-localized-copy.mjs';

test('edge translations equal the current fully loaded browser dictionaries', async () => {
  const generated = await readFile(new URL('../functions/_localized-copy.js', import.meta.url), 'utf8');
  assert.equal(generated, await localizedCopySource(), 'run npm run build after changing translation text or markup');
  assert.equal(LOCALIZED_COPY.en['name.first'], 'Barakat');
  assert.equal(LOCALIZED_COPY.en['name.last'], 'Qurtas');
});

test('all seven localized routes translate existing content and retain authored inline markup', async (t) => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const originalRewriter = globalThis.HTMLRewriter;
  let registrations;
  globalThis.HTMLRewriter = class {
    constructor() { registrations = new Map(); }
    on(selector, handler) { registrations.set(selector, handler); return this; }
    transform(response) { return response; }
  };
  t.after(() => {
    if (originalRewriter === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = originalRewriter;
  });

  // Read real attributes from the page, so deleted/renamed selectors cannot
  // silently make this contract pass as the old data-local-seo handlers did.
  function elementFor(attribute, key) {
    const tag = [...html.matchAll(/<[a-z][^>]*>/gi)]
      .map((match) => match[0]).find((tag) => tag.includes(`${attribute}="${key}"`));
    assert.ok(tag, `${attribute}="${key}" must exist in the current document`);
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)]
      .map((match) => [match[1], match[2]]));
    return {
      attrs, replacement: undefined,
      getAttribute(name) { return attrs[name]; },
      setAttribute(name, value) { attrs[name] = value; },
      setInnerContent(value, options) { this.replacement = { value, html: options?.html === true }; }
    };
  }

  const bcp47 = { en: 'en', ku: 'ckb', kmr: 'ku', ar: 'ar', fr: 'fr', tr: 'tr', sv: 'sv' };
  for (const lang of LANGUAGES) {
    const prefix = lang === 'en' ? '' : '/' + lang;
    for (const room of ['', '/bio', '/contact']) {
      const response = await onRequest({
        request: new Request('https://bqurtas.com' + (prefix + room || '/')),
        env: { ASSETS: { fetch: async () => new Response(html) } },
        next: () => assert.fail('known routes must render their localized shell')
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-language'), bcp47[lang]);
      const textHandler = registrations.get('[data-i18n]');
      assert.ok(textHandler, 'localized body text must be rendered before browser JavaScript');
      for (const key of ['hero.lede', 'hero.place', 'svc.title', 'svc.identity.desc', 'bio.lede', 'bp.p1', 'contact.title', 'f.loc']) {
        const element = elementFor('data-i18n', key);
        textHandler.element(element);
        assert.ok(LOCALIZED_COPY[lang][key], `${lang}.${key} should have authored text`);
        assert.deepEqual(element.replacement, { value: LOCALIZED_COPY[lang][key], html: true });
        if (lang !== 'en') assert.notEqual(element.replacement.value, LOCALIZED_COPY.en[key], `${lang}.${key} should be translated`);
      }
      const bio = elementFor('data-i18n', 'bio.lede');
      textHandler.element(bio);
      assert.match(bio.replacement.value, /<span class="dropcap">/, 'inline biography styling is kept');

      for (const [attribute, key, output] of [
        ['data-i18n-aria', 'a11y.menuOpen', 'aria-label'],
        ['data-i18n-ph', 'cf.name.ph', 'placeholder']
      ]) {
        const element = elementFor(attribute, key);
        registrations.get('[' + attribute + ']').element(element);
        assert.equal(element.attrs[output], LOCALIZED_COPY[lang][key]);
        assert.equal(element.replacement, undefined, 'attribute translation must leave child icons intact');
      }
      const option = elementFor('data-i18n-opt', 'cf.choose');
      registrations.get('[data-i18n-opt]').element(option);
      assert.deepEqual(option.replacement, { value: LOCALIZED_COPY[lang]['cf.choose'], html: false });
    }
  }
});
