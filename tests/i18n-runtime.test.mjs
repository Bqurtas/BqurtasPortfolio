import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { minify } from 'terser';
import { buildI18nRuntime, I18N_RUNTIME_TABLES } from '../scripts/build-i18n-runtime.mjs';

const siteRoot = fileURLToPath(new URL('../preview_site',import.meta.url));
const authored = await readFile(new URL('../preview_site/js/i18n.js',import.meta.url),'utf8');
const authoredMore = await readFile(new URL('../preview_site/js/i18n-more.js',import.meta.url),'utf8');
const built = await buildI18nRuntime(siteRoot);
const plain = value => JSON.parse(JSON.stringify(value));
const languages = ['en','ku','kmr','ar','fr','tr','sv'];

function browser({lang='en',server=false}={}) {
  const scripts=[], saved=[];
  const node={innerHTML:'SERVER TRANSLATION',getAttribute:()=> 'svc.title'};
  const root={lang:lang==='ku'?'ckb':lang,dir:['ku','ar'].includes(lang)?'rtl':'ltr',dataset:{lang,...(server?{renderedLang:lang}:{})}};
  const context=vm.createContext({window:{},document:{documentElement:root,
    querySelectorAll:selector=>server&&selector==='[data-i18n]'?[node]:[],
    createElement:()=>({}),head:{appendChild:script=>scripts.push(script)}},
    localStorage:{setItem:(key,value)=>saved.push([key,value])}});
  return {context,root,node,scripts,saved,run:source=>vm.runInContext(source,context),
    load(){vm.runInContext(built.more,context);scripts.at(-1).onload();}};
}

test('compact initial and deferred tables reproduce every authored runtime table and all seven dictionaries',()=>{
  const expected=browser();expected.run(authored);expected.run(authoredMore);expected.context.window.__i18nMoreLoaded=true;
  const actual=browser();actual.run(built.initial);actual.run(built.more);actual.context.window.__i18nMoreLoaded=true;
  for(const key of I18N_RUNTIME_TABLES) assert.deepEqual(plain(actual.context.window[key]),plain(expected.context.window[key]),key);
  for(const lang of languages) {
    assert.equal(actual.context.window.applyLang(lang),expected.context.window.applyLang(lang));
    assert.deepEqual(plain(actual.context.window.BQ_DICT),plain(expected.context.window.BQ_DICT),lang);
    assert.deepEqual(actual.root,expected.root,lang);
  }
});

test('English startup needs no extra request and keeps every English runtime label',()=>{
  const expected=browser();expected.run(authored);expected.context.window.applyLang('en');
  const actual=browser();actual.run(built.initial);actual.context.window.applyLang('en');
  assert.deepEqual(plain(actual.context.window.BQ_DICT),plain(expected.context.window.BQ_DICT));
  assert.equal(actual.scripts.length,0);
  assert.equal(actual.context.window.I18N.ku,undefined,'full non-English text is deferred');
  assert.equal(actual.context.window.BLOG_BODY_I18N.ku,undefined,'translated article bodies do not block the initial page');
  assert.equal(actual.context.window.I18N_EXTRA,undefined,'already-merged construction tables are not downloaded twice');
});

test('translated edge content and small navigation labels remain intact until its requested dictionary arrives',()=>{
  const authoredPage=browser();authoredPage.run(authored);
  for(const lang of languages.filter(value=>value!=='en')) {
    const page=browser({lang,server:true});page.run(built.initial);
    assert.equal(page.context.window.applyLang(lang),lang);
    assert.equal(page.node.innerHTML,'SERVER TRANSLATION');
    assert.equal(page.root.dataset.lang,lang);
    assert.equal(page.scripts.length,1);
    assert.ok(page.context.window.BQ_UI_I18N[lang]);
    assert.equal(Boolean(page.context.window.TAB_META_I18N[lang]),Boolean(authoredPage.context.window.TAB_META_I18N[lang]),'preserve the existing localized tab table or its English fallback');
    page.load();
    assert.equal(page.root.dataset.lang,lang);
    assert.notEqual(page.node.innerHTML,'SERVER TRANSLATION');
    assert.equal(page.context.window.BQ_DICT['svc.title'],page.node.innerHTML);
  }
});

test('preloaded dictionaries can arrive before the initial deferred runtime without losing translations',()=>{
  for(const lang of languages.filter(value=>value!=='en')) {
    const page=browser();page.run(built.more);page.context.window.__i18nMoreLoaded=true;page.run(built.initial);
    assert.equal(page.context.window.applyLang(lang),lang);
    assert.equal(page.scripts.length,0);
    assert.ok(page.context.window.I18N[lang]['svc.title']);
  }
});

test('slow or failed requests cannot override a newer language, and a failed load can be retried',()=>{
  const page=browser();page.run(built.initial);
  page.context.window.applyLang('ku');page.context.window.applyLang('ar');page.context.window.applyLang('en');
  assert.equal(page.scripts.length,1,'multiple switches share one in-flight download');
  page.load();assert.equal(page.root.dataset.lang,'en');
  page.context.window.applyLang('ar');assert.equal(page.root.dataset.lang,'ar');
  const failed=browser();failed.run(built.initial);failed.context.window.applyLang('ku');failed.scripts[0].onerror();
  assert.equal(failed.root.dataset.lang,'en');assert.equal(failed.context.window.__i18nMoreLoading,false);
  failed.context.window.applyLang('ku');assert.equal(failed.scripts.length,2);failed.load();
  assert.equal(failed.root.dataset.lang,'ku');
});

test('runtime compaction cuts the initial translation payload by more than two thirds and is deterministic',async()=>{
  const [base,extra,oldBase,oldExtra]=await Promise.all([built.initial,built.more,authored,authoredMore].map(code=>minify(code,{compress:{passes:2},mangle:true})));
  assert.ok(Buffer.byteLength(base.code)<Buffer.byteLength(oldBase.code)/3);
  assert.ok(Buffer.byteLength(base.code)+Buffer.byteLength(extra.code)<Buffer.byteLength(oldBase.code)+Buffer.byteLength(oldExtra.code));
  assert.deepEqual(await buildI18nRuntime(siteRoot),built);
});

test('the built picker and translated-route preload request the same fingerprinted dictionary',async()=>{
  const hash=createHash('sha256').update(await readFile(new URL('../preview_site/js/i18n-more.min.js',import.meta.url))).digest('hex').slice(0,12);
  const runtime=await readFile(new URL('../preview_site/js/i18n.v420.min.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../preview_site/index.html',import.meta.url),'utf8');
  assert.ok(runtime.includes(`js/i18n-more.min.js?v=${hash}`));
  assert.ok(html.includes(`js/i18n-more.min.js?v=${hash}`));
});
