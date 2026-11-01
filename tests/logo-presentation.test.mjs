import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');
const start = source.indexOf('  /* ── WorkWith:');
const end = source.lastIndexOf('\n});');
assert.ok(start >= 0 && end > start);

function attributes(text) {
  return Object.fromEntries([...text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(match => [match[1], match[2] ?? '']));
}

function element(text) {
  const attrs = attributes(text);
  return {
    attrs,
    dataset: Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-'))
      .map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value])),
    setAttribute(key, value) { attrs[key] = value; },
    getAttribute(key) { return attrs[key] ?? null; },
    removeAttribute(key) { delete attrs[key]; },
  };
}

function container() {
  const node = element('aria-busy="true" data-logos-empty');
  node.marks = [];
  node.listeners = {};
  Object.defineProperty(node, 'innerHTML', { set(html) {
    node.marks = [...html.matchAll(/<(div|button|a)\b([^>]+)>\s*<img\b([^>]+)\/?>(?:\s*)<\/\1>/g)].map(match => {
      const mark = element(match[2]);
      mark.tagName = match[1].toUpperCase();
      mark.image = element(match[3]);
      mark.image.loading = mark.image.attrs.loading;
      mark.querySelector = () => mark.image;
      mark.closest = () => mark;
      return mark;
    });
  } });
  node.querySelectorAll = selector => selector === 'img'
    ? node.marks.map(mark => mark.image)
    : node.marks.filter(mark => !selector.includes(':not') || !('loopCopy' in mark.dataset));
  node.addEventListener = (name, handler) => { node.listeners[name] = handler; };
  return node;
}

function fixture({ observation = true, initialLanguage = 'en' } = {}) {
  const clients = container(), designed = container(), fallbacks = [], observers = [], openings = [];
  let language = initialLanguage;
  const items = Array.from({ length: 10 }, (_, i) => ({ index: i + 2, url: `/media/TickerLogo/TickerLogo${i + 2}.webp`, rawUrl: `https://raw.example/${i + 2}.webp` }));
  const window = {
    BQ_GALLERY: {
      MEDIA_BASE: '/media', RAW_BASE: 'https://raw.example', items: () => items,
      thumb: url => url.replace('/media/', '/assets/thumbs/'),
      bindMediaFallback: (image, urls, exhausted) => fallbacks.push({ image, urls, exhausted }),
    },
    __bqOpenLightboxPool: (pool, index) => openings.push({ pool, index }),
  };
  const document = {
    querySelector: selector => selector === '.logos-grid--clients' ? clients : selector === '.logo-marquee-track' ? designed : null,
    querySelectorAll: selector => selector === '.logo-marquee-track .logo-mark--ticker' ? designed.marks : [],
  };
  const context = {
    window, document,
    galLang: () => language,
    galTag: () => `${language} Logos`,
    galTitle: (_collection, index) => `${language} logo ${index}`,
    galViewLabel: title => `${language} view ${title}`,
    IntersectionObserver: observation ? class {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    } : undefined,
  };
  vm.runInNewContext(source.slice(start, end), context);
  return { clients, designed, fallbacks, observers, openings, items, context, setLanguage(value) { language = value; } };
}

test('all sixteen client marks are stationary and load together only as their grid approaches', () => {
  const page = fixture();
  assert.equal(page.clients.marks.length, 16);
  const files = page.clients.marks.map(mark => mark.image.dataset.clientFile);
  assert.equal(new Set(files).size, 16, 'the stationary grid must not repeat a marquee half');
  const names = page.clients.marks.map(mark => mark.image.attrs.alt);
  assert.equal(new Set(names).size, 16);
  assert.ok(names.every(name => name && !/WorkLogo|\.webp/i.test(name)), 'each organisation remains identifiable to screen readers');
  assert.equal(names[0], 'Kurdistan Region Presidency');
  assert.equal(names[15], 'Qandil Center');
  assert.deepEqual(files, Array.from({ length: 16 }, (_, i) => `WorkLogo${i + 1}.webp`));
  assert.ok(page.clients.marks.every(mark => !mark.attrs.class.includes('ticker') && !mark.attrs['data-loop-copy']));
  assert.ok(page.clients.marks.every(mark => !mark.attrs.class.includes('logo-mark--img')),
    'informative client marks must not be converted into legacy lightbox keyboard controls');
  assert.equal(page.clients.attrs['aria-busy'], undefined);
  assert.equal(page.observers.length, 1);
  assert.equal(page.observers[0].target, page.clients);
  assert.ok(page.clients.marks.every(mark => mark.image.loading === 'lazy'));
  page.observers[0].callback([{ isIntersecting: false }]);
  assert.ok(page.clients.marks.every(mark => mark.image.loading === 'lazy'));
  page.observers[0].callback([{ isIntersecting: true }]);
  assert.ok(page.clients.marks.every(mark => mark.image.loading === 'eager'));
  assert.equal(page.observers[0].disconnected, true);
  assert.equal(page.fallbacks.filter(entry => entry.image.dataset.clientFile).length, 16);
});

test('both designed-logo loop halves link to the Logo portfolio without duplicate keyboard stops', () => {
  const page = fixture({ observation: false });
  const marks = page.designed.marks;
  assert.equal(marks.length, 16);
  assert.deepEqual(marks.slice(0, 8).map(mark => mark.dataset.full), marks.slice(8).map(mark => mark.dataset.full));
  assert.ok(marks.slice(0, 8).every(mark => !('loopCopy' in mark.dataset) && !mark.attrs['aria-hidden']));
  assert.ok(marks.slice(8).every(mark => mark.attrs['aria-hidden'] === 'true' && mark.attrs.tabindex === '-1'));
  assert.ok(marks.every(mark => mark.tagName === 'A' && mark.attrs.href === '/design/logo'));
  assert.ok(marks.every(mark => mark.attrs['aria-label'] === 'en view en Logos'));
  assert.equal(page.designed.listeners.click, undefined, 'ordinary, modified and middle clicks retain native link navigation');
  assert.equal(page.openings.length, 0, 'the strip does not open a single-image lightbox');
  assert.ok(page.fallbacks.filter(entry => !entry.image.dataset.clientFile).every(entry => !entry.exhausted),
    'a failed thumbnail must retain its fixed cell instead of shrinking one loop half');
  assert.ok(page.clients.marks.every(mark => mark.image.loading === 'eager'), 'without observation the stationary grid remains available');
});

test('changing locale updates designed-logo labels and destinations in both loop halves', () => {
  const page = fixture();
  const relocalizeStart = source.indexOf('  window.__bqRelocalizeGallery =');
  const relocalizeEnd = source.indexOf('  window.__bqLangCb =', relocalizeStart);
  vm.runInNewContext(source.slice(relocalizeStart, relocalizeEnd), page.context);
  page.setLanguage('ku');
  page.context.window.__bqRelocalizeGallery();
  assert.ok(page.designed.marks.every(mark => mark.dataset.title.startsWith('ku logo ')));
  assert.ok(page.designed.marks.every(mark => mark.attrs['aria-label'].startsWith('ku view ')));
  assert.ok(page.designed.marks.every(mark => mark.image.alt.startsWith('ku logo ')));
  assert.ok(page.designed.marks.every(mark => mark.attrs.href === '/ku/design/logo'));
  page.setLanguage('en');
  page.context.window.__bqRelocalizeGallery();
  assert.ok(page.designed.marks.every(mark => mark.attrs.href === '/design/logo'));
});

for (const language of ['ku', 'ar', 'kmr', 'fr', 'tr', 'sv']) test(`designed logos preserve the initial ${language} route`, () => {
  const page = fixture({ initialLanguage: language });
  assert.ok(page.designed.marks.every(mark => mark.attrs.href === `/${language}/design/logo`));
});

test('initial, event and mutation accessibility sweeps preserve informative clients and native links', async () => {
  const page = fixture();
  const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
  const sweepStart = main.indexOf('  const makeTilesReachable =');
  const sweepEnd = main.indexOf('  /* ---------- ROUTER', sweepStart);
  assert.ok(sweepStart > 0 && sweepEnd > sweepStart);
  const certificate = element('class="cert-item"');
  certificate.tagName = 'DIV'; certificate.image = element('alt="Design certificate"');
  certificate.querySelector = () => certificate.image;
  const legacyClient = element('class="logo-mark logo-mark--img logo-mark--client"');
  legacyClient.tagName = 'DIV'; legacyClient.querySelector = () => element('alt="Existing client"');
  const marks = [...page.clients.marks, ...page.designed.marks, certificate, legacyClient];
  for (const mark of marks) {
    mark.keys = [];
    mark.addEventListener = (type, handler) => { if (type === 'keydown') mark.keys.push(handler); };
    mark.clicks = 0; mark.click = () => { mark.clicks++; };
  }
  const handlers = new Map(), frames = [], observers = [];
  const includesClass = (mark, name) => (mark.attrs.class || '').split(/\s+/).includes(name);
  const query = page.context.document.querySelector;
  page.context.document.querySelector = selector => selector === '.logos-grid' ? page.clients : query(selector);
  page.context.document.getElementById = id => id === 'certGrid' ? { id } : null;
  page.context.document.querySelectorAll = selector => marks.filter(mark => mark === certificate || (
    includesClass(mark, 'logo-mark--img')
    && !(selector.includes(':not(.logo-mark--client)') && includesClass(mark, 'logo-mark--client'))
  ));
  page.context.window.addEventListener = (name, handler) => handlers.set(name, handler);
  page.context.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  page.context.MutationObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  };
  vm.runInNewContext(main.slice(sweepStart, sweepEnd), page.context);
  for (const handler of handlers.values()) { handler(); handler(); }
  observers[0].callback(); observers[0].callback();
  assert.equal(frames.length, 1, 'multiple grid mutations coalesce into one sweep');
  frames.shift()();
  for (const mark of [...page.clients.marks, legacyClient]) {
    assert.equal(mark.attrs.role, undefined);
    assert.equal(mark.attrs.tabindex, undefined);
    assert.equal(mark.dataset.bqKeyed, undefined);
    assert.equal(mark.keys.length, 0, 'noninteractive clients never gain fake keyboard actions, even with the old class');
  }
  assert.ok(page.designed.marks.every(mark => mark.attrs.role === undefined && mark.keys.length === 0));
  assert.equal(certificate.attrs.role, 'button');
  assert.equal(certificate.attrs['aria-label'], 'Design certificate');
  assert.equal(certificate.keys.length, 1, 'a real legacy lightbox tile remains keyboard reachable without duplicate handlers');
  let prevented = 0;
  certificate.keys[0]({ key:'Enter', preventDefault() { prevented++; } });
  assert.equal(certificate.clicks, 1); assert.equal(prevented, 1);
});
