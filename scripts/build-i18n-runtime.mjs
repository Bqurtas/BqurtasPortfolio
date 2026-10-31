import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// These are the final tables read by the application. I18N_EXTRA_* and the
// authored identity/room patches only construct these tables; shipping both
// the patches and their merged results repeats the same copy in the browser.
export const I18N_RUNTIME_TABLES = [
  'I18N', 'BQ_LOCAL_SEO_I18N', 'BQ_UI_I18N', 'TAB_META_I18N',
  'BLOG_I18N', 'HONORS_I18N', 'GAL_I18N', 'BLOG_BODY_I18N',
  'TABCARD_I18N', 'ROOMCARD_I18N'
];
const EAGER_CHROME = new Set(['BQ_UI_I18N', 'TAB_META_I18N', 'TABCARD_I18N', 'ROOMCARD_I18N']);
const serialize = tables => Object.entries(tables).map(([key, value]) =>
  `window.${key}=Object.assign(window.${key}||{},${JSON.stringify(value)});`
).join('\n');

export async function buildI18nRuntime(siteRoot) {
  // Execute only the repository's own translation constructors at build time,
  // just as generate-localized-copy does for the edge-rendered HTML.
  const context = vm.createContext({
    window:{}, document:{documentElement:{dataset:{}},querySelectorAll(){return [];}},
    localStorage:{setItem(){}}
  });
  const base = await readFile(path.join(siteRoot, 'js/i18n.js'), 'utf8');
  const extra = await readFile(path.join(siteRoot, 'js/i18n-more.js'), 'utf8');
  vm.runInContext(base, context, {filename:'i18n.js',timeout:1000});
  const initialTables = {};
  for (const key of I18N_RUNTIME_TABLES) {
    const table = context.window[key];
    if (!table || typeof table !== 'object') throw new Error(`Missing runtime translation table: ${key}`);
    // Small dynamic menu/tab labels stay available while translated HTML waits
    // for its full dictionary. English visitors never fetch the larger bundle.
    initialTables[key] = JSON.parse(JSON.stringify(EAGER_CHROME.has(key) ? table : (table.en ? {en:table.en} : {})));
  }
  const runtime = ['__loadI18nMore','applyLang'].map(key => {
    if (typeof context.window[key] !== 'function') throw new Error(`Missing translation runtime: ${key}`);
    return `window.${key}=${context.window[key].toString()};`;
  }).join('\n');
  const initial = serialize(initialTables) + '\n'
    + 'window.__i18nMoreLoaded=Boolean(window.__i18nMoreLoaded);\n'
    + 'window.__i18nMoreCbs=Array.isArray(window.__i18nMoreCbs)?window.__i18nMoreCbs:[];\n'
    + runtime + '\n';
  vm.runInContext(extra, context, {filename:'i18n-more.js',timeout:1000});
  const deferredTables = {};
  for (const key of I18N_RUNTIME_TABLES) {
    deferredTables[key] = Object.fromEntries(Object.entries(context.window[key]).filter(([lang,value]) =>
      JSON.stringify(value) !== JSON.stringify(initialTables[key][lang])
    ));
  }
  return { initial, more:serialize(deferredTables) + '\n' };
}
