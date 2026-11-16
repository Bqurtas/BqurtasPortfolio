import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/hero-work-trail.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url), 'utf8'));
const behance = JSON.parse(await readFile(new URL('../preview_site/assets/behance/projects.json', import.meta.url), 'utf8'));

/* The fixture drives public pointer, button, media-query and lifecycle events.
   Artwork and geometry come from the real published catalogs. */
async function fixture() {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.listeners = new Map();
      this.dataset = {};
      this.properties = new Map();
      this.style = { setProperty: (key, value) => this.properties.set(key, value) };
      this.clientWidth = 1280;
      this.clientHeight = 900;
      this.isConnected = true;
      this.complete = true;
      this.naturalWidth = 800;
      this.classes = new Set();
      this.classList = {
        contains: name => this.classes.has(name),
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    append(...nodes) {
      for (const node of nodes) {
        node.parent = this;
        node.isConnected = true;
        this.children.push(node);
      }
    }
    set innerHTML(value) { this.copy = new Element('span'); }
    querySelector(selector) {
      if (selector === ':scope > .paper-scroll') return this.paper;
      if (selector === '.hero-work-discover-copy') return this.copy;
      return null;
    }
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) || [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    fire(type, event = {}) { this.listeners.get(type)?.forEach(callback => callback(event)); }
    setAttribute(name, value) { this[name] = value; }
    closest(selector) { return selector === '.is-hidden' ? this.hiddenAncestor || null : this.interactive ? this : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 900 }; }
    remove() {
      this.isConnected = false;
      this.parent.children = this.parent.children.filter(node => node !== this);
    }
    animate(keyframes, options) {
      this.animation = { cancel() {}, onfinish: null, keyframes, options };
      return this.animation;
    }
  }
  const hero = new Element(), paper = new Element();
  hero.paper = paper;
  const body = new Element();
  const documentEvents = new Element(), windowEvents = new Element();
  const timers = new Map(), intervals = new Map(), frames = new Map();
  let identifier = 0, now = 1000, intersection = null;
  const media = () => ({
    matches: false, callbacks: [],
    addEventListener(type, callback) { this.callbacks.push(callback); },
    set(value) { this.matches = value; this.callbacks.forEach(callback => callback()); },
  });
  const reduced = media(), coarse = media();
  const document = {
    hidden: false, body,
    documentElement: { dataset: { lang: 'en' }, lang: 'en' },
    querySelector: selector => selector === '#design > .hero' ? hero : null,
    getElementById: () => null,
    createElement: tag => new Element(tag),
    addEventListener: (type, callback) => documentEvents.addEventListener(type, callback),
  };
  const window = {
    addEventListener: (type, callback) => windowEvents.addEventListener(type, callback),
    IntersectionObserver: true,
  };
  const context = {
    window, document, performance: { now: () => now }, AbortSignal,
    matchMedia: query => query.includes('reduced-motion') ? reduced : coarse,
    fetch: async url => ({ ok: true, json: async () => url.includes('gallery-manifest') ? manifest : behance }),
    Image: class { set src(value) {} },
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} },
    setTimeout: (callback, delay) => { timers.set(++identifier, { callback, delay }); return identifier; },
    clearTimeout: timer => timers.delete(timer),
    setInterval: (callback, delay) => { intervals.set(++identifier, { callback, delay }); return identifier; },
    clearInterval: timer => intervals.delete(timer),
    requestAnimationFrame: callback => { frames.set(++identifier, callback); return identifier; },
    cancelAnimationFrame: frame => frames.delete(frame),
  };
  vm.runInNewContext(source, context);
  await window.__bqHeroWorkTrail.refresh();
  const stage = paper.children.find(node => node.className === 'hero-work-trail');
  const button = paper.children.find(node => node.className === 'hero-work-discover');
  const pointer = (type, options = {}) => hero.fire(type, {
    pointerType: 'mouse', pointerId: 1, clientX: 300, clientY: 300, target: hero, ...options,
  });
  return {
    hero, stage, button, window, document, timers, intervals, frames, pointer, reduced, coarse,
    click: () => button.fire('click'),
    clear: () => window.__bqHeroWorkTrail.clear(),
    advance(milliseconds = 100) { now += milliseconds; },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    hold() { const pending = [...timers.values()].find(timer => timer.delay === 360); assert.ok(pending); pending.callback(); },
    intersect(ratio) { intersection([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]); },
    fireDocument: (type, event) => documentEvents.fire(type, event),
    fireWindow: (type, event) => windowEvents.fire(type, event),
    interactiveTarget() { const target = new Element('a'); target.interactive = true; return target; },
  };
}

test('hero preview includes real case studies, films and artwork with original geometry', async () => {
  const f = await fixture();
  assert.ok(f.hero.classes.has('has-work-trail'));
  for (let index = 0; index < 8; index++) f.click();
  const images = f.stage.children.map(node => node.children[0]);
  assert.ok(images.some(image => image.src.startsWith('/assets/behance/')), 'Includes full project covers');
  assert.ok(images.some(image => image.src.startsWith('/assets/thumbs/Videos/')), 'Includes film posters');
  assert.ok(images.some(image => image.src.startsWith('/assets/thumbs/Book/')), 'Includes book covers');
  assert.ok(images.every(image => image.src.startsWith('/assets/') && image.width > 0 && image.height > 0));
  assert.ok(f.stage.children.every(node => node.properties.get('--work-width') && node.properties.get('--work-height')));
});

test('repeated pointer input is coalesced per frame and never retains more than eight prints', async () => {
  const f = await fixture();
  for (let index = 0; index < 30; index++) {
    f.advance();
    f.pointer('pointermove', { clientX: index % 2 ? 250 : 900 });
    f.pointer('pointermove', { clientX: index % 2 ? 200 : 950 });
    assert.equal(f.frames.size, 1);
    f.frame();
    assert.ok(f.stage.children.length <= 8);
  }
  assert.equal(f.stage.children.length, 8);
  f.clear();
  assert.equal(f.stage.children.length, 0);
  assert.equal(f.frames.size, 0);
});

test('animation completion disposes its print and lifetime fallback timer', async () => {
  const f = await fixture();
  f.click();
  const print = f.stage.children[0];
  assert.equal(f.stage.children.length, 1);
  const lifetime = print.animation.options.duration;
  assert.ok(lifetime >= 3500, 'Preview has time to settle before fading');
  assert.ok([...f.timers.values()].some(timer => timer.delay === lifetime));
  print.animation.onfinish();
  assert.equal(f.stage.children.length, 0);
  assert.equal([...f.timers.values()].filter(timer => timer.delay === lifetime).length, 1, 'Only the lightweight hint timer remains');
});

test('pointer inertia settles in a finite number of frames and stops when leaving the hero', async () => {
  const f = await fixture();
  f.pointer('pointermove', { clientX: 200 }); f.frame();
  f.advance(160);
  f.pointer('pointermove', { clientX: 1000 });
  f.frame();
  assert.equal(f.frames.size, 1, 'Gesture has a soft settling tail');
  let frames = 1;
  while (f.frames.size && frames < 30) { f.advance(16); f.frame(); frames++; }
  assert.ok(frames > 2 && frames <= 18);
  assert.equal(f.frames.size, 0, 'No idle animation loop remains');
  f.pointer('pointermove', { clientX: 250 });
  f.pointer('pointerleave');
  assert.equal(f.frames.size, 0, 'Leaving the hero immediately ends gesture tracking');
});

test('a touch hold reveals work, while vertical scrolling cancels without interception', async () => {
  const f = await fixture();
  let prevented = false;
  const touch = { pointerType: 'touch', pointerId: 7, clientX: 250, clientY: 300, preventDefault: () => { prevented = true; } };
  f.pointer('pointerdown', touch);
  assert.equal(f.stage.children.length, 0, 'Normal touch starts no animation');
  f.pointer('pointermove', { ...touch, clientY: 324 });
  assert.equal([...f.timers.values()].some(timer => timer.delay === 360), false, 'Ordinary swipe cancels pending hold');
  f.pointer('pointerdown', touch);
  f.hold();
  assert.equal(f.stage.children.length, 1);
  assert.equal(f.intervals.size, 1);
  f.pointer('pointermove', { ...touch, clientY: 350 });
  assert.equal(f.intervals.size, 0, 'Vertical movement stops active hold');
  assert.equal(prevented, false, 'Native scrolling is never prevented');
});

test('reduced motion keeps a keyboard/tap preview and disables automatic pointer animation', async () => {
  const f = await fixture();
  f.reduced.set(true);
  assert.equal(f.button.copy.textContent, 'Preview a work');
  f.pointer('pointermove');
  assert.equal(f.frames.size, 0);
  f.click(); f.click();
  assert.equal(f.stage.children.length, 1);
  assert.equal(f.stage.children[0].animation, undefined, 'Static preview has no animation');
  f.document.documentElement.dataset.lang = 'ku';
  f.fireDocument('bq:language');
  assert.equal(f.button.copy.textContent, 'پێشبینیی کارێک');
});

test('links, hidden rooms, offscreen hero and document lifecycle stop the effect', async () => {
  const f = await fixture();
  f.pointer('pointermove', { target: f.interactiveTarget() });
  assert.equal(f.frames.size, 0, 'Interactive controls retain their behavior');
  f.click(); f.intersect(0);
  assert.equal(f.stage.children.length, 0);
  f.click();
  assert.equal(f.stage.children.length, 0, 'Offscreen hero cannot generate new work');
  f.intersect(1); f.click();
  assert.equal(f.stage.children.length, 1);
  f.document.hidden = true;
  f.fireDocument('visibilitychange');
  assert.equal(f.stage.children.length, 0);
  f.document.hidden = false;
  f.click(); f.fireDocument('bq:route');
  assert.equal(f.stage.children.length, 0);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.frames.size, 0);
});
