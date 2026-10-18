import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const gallerySource = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const manifest = { images: [{ path: 'GeneralDesign/GDesign1.webp', width: 320, height: 400 }], videos: [] };
const response = (data = manifest) => ({ ok: true, json: async () => data });

function loadGallery(fetchImpl = async () => response(), doc = { addEventListener() {}, baseURI: 'https://bqurtas.com/' }) {
  const window = {};
  vm.runInNewContext(gallerySource, { window, document: doc, fetch: fetchImpl, URL, AbortController, setTimeout, clearTimeout });
  return window.BQ_GALLERY;
}

test('passing video covers during scrolling do not start hover playback', () => {
  let moving = true, playCalls = 0, hover;
  const video = { dataset: {} };
  const card = { dataset: { type: 'video' }, contains: () => false, querySelector: () => video };
  const start = gallerySource.indexOf('  /* Play video on card hover');
  const end = gallerySource.indexOf("  grid.addEventListener('mouseout'", start);
  vm.runInNewContext(gallerySource.slice(start, end), {
    grid: { addEventListener: (_type, callback) => { hover = callback; } },
    matchMedia: () => ({ matches: true }), navigator: {},
    document: { documentElement: { classList: { contains: () => moving } } },
    videoPreviews: { play: () => { playCalls++; } }
  });
  const event = { target: { closest: () => card }, relatedTarget: null };
  for (let passed = 0; passed < 20; passed++) hover(event);
  assert.equal(playCalls, 0, 'native scrolling does not request passing MP4 files');
  moving = false;
  hover(event);
  assert.equal(playCalls, 1, 'deliberate hover at rest still previews the film');
});

test('concurrent gallery consumers wait for one validated manifest', async () => {
  let resolveFetch, fetches = 0;
  const gallery = loadGallery(() => { fetches++; return new Promise(resolve => { resolveFetch = resolve; }); });
  const first = gallery.loadManifest();
  const second = gallery.loadManifest();
  assert.equal(fetches, 1);
  assert.equal(gallery._loaded, false);
  resolveFetch(response({ images: [
    ...manifest.images,
    ...manifest.images,
    { path: 'GeneralDesign/GDesign2.webp', width: -1, height: 400 },
    { path: 'GeneralDesign/nested/image.webp', width: 320, height: 400 },
    { path: 'Unknown/image.webp', width: 320, height: 400 },
  ], videos: [] }));
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(gallery.items('general').length, 1);
  assert.equal(gallery.items('general')[0].height, 400);
  assert.equal(gallery.items('book').length, 0, 'removed collections must not use stale static counts');
});

test('manifest refresh revalidates and preserves usable content if a response is malformed', async () => {
  const requests = [];
  const replies = [response(), response({}), response({ images: [], videos: [] })];
  const gallery = loadGallery(async (_url, options) => { requests.push(options); return replies.shift(); });
  await gallery.loadManifest();
  await gallery.loadManifest({ force: true });
  assert.equal(gallery.items('general').length, 1);
  assert.equal(requests[1].cache, 'reload');
  await gallery.loadManifest({ force: true });
  assert.equal(gallery.items('general').length, 0);
  assert.equal(gallery._manifestPromise, null);
});

test('video catalogue keeps its exact dimensions and only its own first-party frame poster', async () => {
  const gallery = loadGallery(async () => response({ images: [], videos: [
    { path: 'Videos/Videos1.mp4', width: 406, height: 720, poster: '/assets/thumbs/Videos/Videos1.jpg' },
    { path: 'Videos/Videos2.mp4', width: 720, height: 406, poster: 'https://outside.example/Videos2.jpg' },
    { path: 'Videos/Videos3.mp4', width: 720, height: 720, poster: '/assets/thumbs/Videos/Videos1.jpg' },
  ] }));
  await gallery.loadManifest();
  const items = gallery.items('video');
  assert.equal(items[0].poster, '/assets/thumbs/Videos/Videos1.jpg');
  assert.equal(items[0].width, 406);
  assert.equal(items[0].height, 720);
  assert.equal(items[1].poster, '', 'unrelated origins must not introduce card requests');
  assert.equal(items[2].poster, '', 'another film’s frame must not stand in for this film');
});

test('video playback uses first-party streaming while image thumbnails and raw fallbacks keep their existing URLs', async () => {
  const gallery = loadGallery(async () => response({
    images: [{ path: 'Book/BookCover7.webp', width: 696, height: 1039 }],
    videos: [{ path: 'Videos/Videos26.mp4', width: 720, height: 720, poster: '/assets/thumbs/Videos/Videos26.jpg' }]
  }));
  assert.equal(gallery.url('video', 26), '/media/Videos/Videos26.mp4', 'the fallback catalogue also avoids the video CDN');
  await gallery.loadManifest();
  const [film] = gallery.items('video');
  const [image] = gallery.items('book');
  assert.equal(film.url, '/media/Videos/Videos26.mp4', 'manifest filenames determine the streamed file');
  assert.equal(film.rawUrl, gallery.RAW_BASE + '/Videos/Videos26.mp4');
  assert.equal(film.poster, '/assets/thumbs/Videos/Videos26.jpg');
  assert.equal(image.url, gallery.CDN_BASE + '/Book/BookCover7.webp');
  assert.equal(gallery.thumb(image.url, 320), 'assets/thumbs/Book/BookCover7.webp');
});

test('an initial manifest outage can be retried without discarding the fallback catalogue', async () => {
  let calls = 0;
  const gallery = loadGallery(async () => { if (++calls === 1) throw new Error('offline'); return response(); });
  assert.equal(await gallery.loadManifest(), false);
  assert.equal(gallery.items('general').length, 84);
  assert.equal(await gallery.loadManifest(), true);
  assert.equal(gallery.items('general').length, 1);
});

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase(); this.document = document; this.children = [];
    this.dataset = {}; this.style = {}; this.attributes = {}; this.listeners = {};
    this.hidden = false; this.inert = false; this.src = ''; this.currentSrc = '';
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
    };
  }
  set id(value) { this._id = value; this.document.ids.set(value, this); }
  get id() { return this._id; }
  set className(value) { this.classes = new Set(value.split(/\s+/)); }
  get className() { return [...this.classes].join(' '); }
  setAttribute(name, value) { this.attributes[name] = value; if (name === 'id') this.id = value; }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; if (name === 'src') this.src = ''; }
  appendChild(element) { element.parent = this; this.children.push(element); return element; }
  insertBefore(element, before) { element.parent = this; this.children.splice(this.children.indexOf(before), 0, element); }
  remove() { if (this.parent) { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; } }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  get isConnected() { return this.document.body.contains(this); }
  getClientRects() { return this.hidden ? [] : [{}]; }
  focus() { this.document.activeElement = this; }
  blur() { this.document.activeElement = this.document.body; }
  pause() { this.paused = true; }
  load() {}
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  removeEventListener(name, callback) { this.listeners[name] = (this.listeners[name] || []).filter(handler => handler !== callback); }
  dispatch(name, data = {}) { for (const callback of this.listeners[name] || []) callback({ target: this, preventDefault() {}, ...data }); }
  closest(selector) {
    if (selector === '#grid .card--photo') {
      for (let node = this; node; node = node.parent) if (node.classes.has('card--photo')) return node;
      return null;
    }
    const tags = selector.split(',').map(tag => tag.trim().toUpperCase());
    for (let node = this; node; node = node.parent) if (tags.includes(node.tagName)) return node;
    return null;
  }
  querySelectorAll() {
    const all = [];
    const visit = node => { node.children.forEach(child => { if (child.tagName === 'BUTTON' || (child.tagName === 'VIDEO' && child.controls)) all.push(child); visit(child); }); };
    visit(this); return all;
  }
  set innerHTML(html) {
    // Build only the modal's named controls; media nodes are added by the code under test.
    for (const match of html.matchAll(/<(div|button|span)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
      const element = this.document.createElement(match[1]); element.id = match[2];
      element.hidden = /\bhidden\b/.test(match[0]);
      const parent = /^lb(Close|Status|Retry|Caption|Counter)$/.test(element.id) ? this.document.getElementById('lbWrap') : this;
      parent.appendChild(element);
    }
  }
}

function makeDocument() {
  const document = { ids: new Map(), listeners: {}, baseURI: 'https://bqurtas.com/' };
  document.createElement = tag => new Element(tag, document);
  document.body = document.createElement('body');
  document.documentElement = document.createElement('html'); document.documentElement.dataset.lang = 'en';
  document.activeElement = document.body;
  document.getElementById = id => document.ids.get(id);
  document.addEventListener = (name, callback) => { (document.listeners[name] ||= []).push(callback); };
  document.dispatchEvent = event => { for (const callback of document.listeners[event.type] || []) callback(event); };
  return document;
}

test('media fallbacks terminate once even with stale currentSrc and repeated errors', () => {
  const document = makeDocument(); const gallery = loadGallery(undefined, document);
  const media = document.createElement('img'); let exhausted = 0;
  media.src = 'assets/thumbs/logo.webp'; media.currentSrc = media.src;
  const release = gallery.bindMediaFallback(media, ['https://cdn.example/logo.webp', 'https://raw.example/logo.webp'], () => exhausted++);
  media.dispatch('error'); assert.equal(media.src, 'https://cdn.example/logo.webp');
  media.dispatch('error'); assert.equal(media.src, 'https://raw.example/logo.webp');
  media.dispatch('error'); media.dispatch('error');
  assert.equal(exhausted, 1);
  release(); assert.equal(media.listeners.error.length, 0);
});

function lightboxFixture() {
  const document = makeDocument();
  const gallery = loadGallery(undefined, document);
  const window = { BQ_GALLERY: gallery, BQ_DICT: {} };
  const timers = new Map(); let nextTimer = 0;
  const entries = [];
  const source = mainSource.slice(mainSource.indexOf('  window.__bqInitLightbox = () => {'), mainSource.indexOf('  /* ---------- INDEX LAYOUT'));
  vm.runInNewContext(source, {
    window, document, matchingCards: () => entries, matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => callback(), CustomEvent: class { constructor(type) { this.type = type; } },
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
  });
  window.__bqInitLightbox();
  const element = id => document.getElementById(id);
  const media = () => element('lbWrap').children.find(child => /^(IMG|VIDEO)$/.test(child.tagName));
  const key = value => document.dispatchEvent({ type: 'keydown', key: value, target: document.activeElement, preventDefault() {} });
  return { document, window, element, media, key, entries };
}

const pool = [
  { full: 'https://cdn.example/certificate-one.webp', title: 'Certificate 1', type: 'image' },
  { full: 'https://cdn.example/certificate-two.webp', title: 'Certificate 2', type: 'image' },
];

test('custom lightbox pools keep buttons and keyboard in the same pool and ignore stale image loads', () => {
  const { window, element, media, key } = lightboxFixture();
  window.__bqOpenLightboxPool(pool, 0);
  const staleLoad = media().onload;
  element('lbNext').dispatch('click');
  assert.equal(media().src, pool[1].full);
  staleLoad();
  assert.equal(media().style.opacity, '0', 'old image load must not reveal the current image');
  media().onload(); assert.equal(media().style.opacity, '1');
  key('ArrowLeft'); assert.equal(media().src, pool[0].full);
  assert.equal(element('lbOverlay').getAttribute('aria-hidden'), 'false');
  assert.equal(element('lbCounter').textContent, '1 / 2');
});

test('closing a lightbox restores focus, scroll state and each background inert state', () => {
  const { document, window, element, key } = lightboxFixture();
  const trigger = document.body.appendChild(document.createElement('button'));
  const alreadyInert = document.body.appendChild(document.createElement('section')); alreadyInert.inert = true;
  document.body.style.overflow = 'clip'; trigger.focus();
  window.__bqOpenLightboxPool(pool.slice(0, 1), 0);
  assert.equal(trigger.inert, true);
  assert.equal(document.activeElement, element('lbClose'));
  assert.equal(element('lbNext').hidden, true);
  key('Escape');
  assert.equal(document.activeElement, trigger);
  assert.equal(document.body.style.overflow, 'clip');
  assert.equal(trigger.inert, false); assert.equal(alreadyInert.inert, true);
  assert.equal(element('lbOverlay').inert, true);
  assert.equal(element('lbOverlay').getAttribute('aria-hidden'), 'true');
});

test('a first-party film opened from its gallery card retains the bounded raw fallback', () => {
  const { document, element, media, entries } = lightboxFixture();
  const card = document.createElement('article');
  card.className = 'card--photo';
  card.dataset = {
    full: '/media/Videos/Videos26.mp4',
    raw: 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos26.mp4',
    type: 'video', title: 'Video 26'
  };
  document.body.appendChild(card);
  entries.push({ el: card });
  document.dispatchEvent({ type: 'click', target: card });
  assert.equal(media().src, card.dataset.full);
  media().dispatch('error');
  assert.equal(media().src, card.dataset.raw, 'a local file preview or unavailable edge can still use the existing raw mirror');
  assert.equal(element('lbRetry').hidden, true);
  media().dispatch('error');
  assert.equal(element('lbRetry').hidden, false, 'failure of both sources exposes retry instead of cycling requests');
});

test('failed full images expose a retry action and RTL keyboard navigation stays consistent', () => {
  const { document, window, element, media, key } = lightboxFixture();
  document.documentElement.dir = 'rtl';
  window.__bqOpenLightboxPool(pool, 0);
  media().dispatch('error');
  assert.equal(element('lbRetry').hidden, false);
  assert.equal(element('lbWrap').getAttribute('aria-busy'), 'false');
  element('lbRetry').dispatch('click');
  assert.equal(element('lbRetry').hidden, true);
  assert.equal(media().src, pool[0].full);
  key('ArrowRight'); assert.equal(media().src, pool[1].full);
});
