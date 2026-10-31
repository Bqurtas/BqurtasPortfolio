import { SITE_SCHEMA } from './_site-schema-data.js';

const SITE = 'https://bqurtas.com';
const PERSON = SITE + '/#person';
const LANGUAGES = { en: 'en', ku: 'ckb', kmr: 'ku', ar: 'ar', fr: 'fr', tr: 'tr', sv: 'sv' };
const ROOM_NAMES = { design: 'nav.design', blog: 'nav.blog', bio: 'nav.bio', contact: 'nav.contact' };

// Global entity IDs stay stable across languages; the page itself describes
// the requested URL, instead of publishing the English homepage on every route.
export function pageSchema(route, meta, copy = {}) {
  const schema = structuredClone(SITE_SCHEMA);
  const graph = schema['@graph'];
  const page = graph.find(node => node['@type'] === 'ProfilePage');
  const profile = route.key === 'home' || route.key === 'bio';
  const type = profile ? 'ProfilePage' : route.key === 'contact' ? 'ContactPage'
    : route.key === 'blogpost' ? 'WebPage' : 'CollectionPage';
  Object.assign(page, {
    '@type': type,
    '@id': route.canon + '#webpage',
    url: route.canon,
    name: meta.t,
    description: meta.d,
    inLanguage: LANGUAGES[route.lang] || 'en'
  });
  delete page.dateModified;
  if (profile) page.mainEntity = { '@id': PERSON };
  else if (route.key === 'blogpost') page.mainEntity = { '@id': route.canon + '#article' };
  else delete page.mainEntity;
  const prefix = route.lang === 'en' ? '' : '/' + route.lang;
  for (const node of graph) {
    if (node['@type'] !== 'SiteNavigationElement') continue;
    const room = new URL(node.url).pathname.slice(1);
    node.url = SITE + prefix + '/' + room;
    node.name = copy[ROOM_NAMES[room]] || node.name;
  }
  return schema;
}

export function rewritePageSchema(rewriter, route, meta, copy) {
  const json = JSON.stringify(pageSchema(route, meta, copy)).replace(/</g, '\\u003c');
  rewriter.on('#site-schema', { element(el) { el.setInnerContent(json, { html: true }); } });
}
