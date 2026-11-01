import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SITE_SCHEMA } from '../functions/_site-schema-data.js';
import { pageSchema, rewritePageSchema } from '../functions/_page-schema.js';

test('every room describes its own canonical page while preserving a single person identity', () => {
  for (const [lang, tag] of Object.entries({ en:'en', ku:'ckb', kmr:'ku', ar:'ar', fr:'fr', tr:'tr', sv:'sv' })) {
    for (const [key, type] of Object.entries({ home:'ProfilePage', bio:'ProfilePage', contact:'ContactPage', blog:'CollectionPage', logo:'CollectionPage', blogpost:'WebPage' })) {
      const prefix = lang === 'en' ? '' : '/' + lang;
      const path = key === 'home' ? prefix || '/' : prefix + (key === 'logo' ? '/design/logo' : key === 'blogpost' ? '/blog/27' : '/' + key);
      const canon = 'https://bqurtas.com' + path;
      const graph = pageSchema({ lang, key, canon }, { t:'Localized title', d:'Localized description' }, { 'nav.bio':'Localized biography' })['@graph'];
      const page = graph.find(n => n['@id'] === canon + '#webpage');
      assert.equal(page['@type'], type);
      assert.equal(page.url, canon);
      assert.equal(page.inLanguage, tag);
      assert.equal(page.name, 'Localized title');
      assert.equal(page.description, 'Localized description');
      assert.equal(page.dateModified, undefined, 'no stale or fabricated freshness');
      const person = graph.find(n => n['@type'] === 'Person');
      assert.equal(person['@id'], 'https://bqurtas.com/#person');
      assert.ok(person.alternateName.includes('بەرەکات قورتاس'));
      assert.equal(graph.find(n => n['@type'] === 'SiteNavigationElement' && n.name === 'Localized biography').url, 'https://bqurtas.com' + prefix + '/bio');
      if (key === 'blogpost') assert.equal(page.mainEntity['@id'], canon + '#article');
      else if (key !== 'home' && key !== 'bio') assert.equal(page.mainEntity, undefined);
      assert.ok(!graph.some(n => n['@type'] === 'FAQPage'), 'removed visible FAQ must not survive as hidden markup');
    }
  }
  assert.equal(SITE_SCHEMA['@graph'].find(n => n['@type'] === 'ProfilePage').url, 'https://bqurtas.com/', 'requests do not mutate shared source');
});

test('schema rewrite safely serializes titles that could otherwise end the script', () => {
  let handler;
  rewritePageSchema({ on(selector, value) { assert.equal(selector, '#site-schema'); handler=value; } },
    { lang:'en', key:'bio', canon:'https://bqurtas.com/bio' }, { t:'</script><img src=x>', d:'Example' });
  let source;
  handler.element({ setInnerContent(value) { source=value; } });
  assert.ok(!source.includes('</script>'));
  assert.equal(JSON.parse(source)['@graph'].find(n => n.url === 'https://bqurtas.com/bio').name, '</script><img src=x>');
});

test('generated identity graph matches the authored static fallback', async () => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const source = JSON.parse(html.match(/<script id="site-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(SITE_SCHEMA, source);
});
