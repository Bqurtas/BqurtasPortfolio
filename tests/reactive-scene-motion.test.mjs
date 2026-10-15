import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const motion = await readFile(new URL('../preview_site/js/motion.js', import.meta.url), 'utf8');
const start = motion.indexOf('(function reactiveSceneMotion() {');
const end = motion.indexOf('\n})();', start) + '\n})();'.length;
assert.ok(start >= 0 && end > start);
const source = motion.slice(start, end);

function events() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
    },
    fire(type, event = {}) { for (const handler of handlers.get(type) || []) handler(event); },
  };
}
function classes(...initial) {
  const names = new Set(initial);
  return {
    add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name),
    toggle(name, on) { if (on) names.add(name); else names.delete(name); },
  };
}
function style() {
  const values = new Map();
  return {
    writes: 0,
    getPropertyValue: name => values.get(name) || '',
    setProperty(name, value) { this.writes++; values.set(name, value); },
    removeProperty(name) { this.writes++; values.delete(name); },
  };
}
function fixture({ reducedMotion = false, finePointer = true, stored = null } = {}) {
  const frames = new Map(), observers = [], created = [], dispatched = [];
  let frameId = 0;
  const root = { lang: 'en', dataset: {}, classList: classes() };
  const storage = new Map(stored === null ? [] : [['bq_motion', stored]]);
  const reduced = { ...events(), matches: reducedMotion }, pointer = { ...events(), matches: finePointer };
  const design = { classList: classes() }, bio = { classList: classes('is-hidden') };
  const layer = name => ({ classList: classes(name), style: style() });
  const portrait = layer('hero-portrait'), signature = layer('hero-sign');
  const title = layer('room-hero-title'), ghost = layer('room-hero-ghost');
  function hero(room, leaves, paperStart) {
    const scroller = { dataset: { paperStart: String(paperStart) }, appendChild(item) { created.push(item); } };
    return {
      scroller, closest: () => room, querySelectorAll: () => leaves, querySelector: () => scroller,
      getBoundingClientRect() { throw new Error('scene scroll must use the measured paper origin'); },
    };
  }
  const home = hero(design, [portrait, signature], 0), biography = hero(bio, [title, ghost], 2000);
  function chapter(room, paperStart, work = false) {
    const items = [layer('section-title'), layer('logos-title')];
    const scroller = { dataset: { paperStart: String(paperStart) } };
    return {
      items, scroller, classList: classes('section', ...(work ? ['work'] : [])),
      closest: () => room,
      querySelector(selector) {
        assert.equal(selector, ':scope > .paper-scroll');
        return scroller;
      },
      querySelectorAll(selector) {
        assert.equal(selector, '.section-title, .service-showcase-title, .bio-teaser-title, .software-title, .logos-title, .latest-blog-title, .bio-block-title, .bio-social-title, .pitch-head > h3, .subscribe-title');
        return items;
      },
      getBoundingClientRect() { throw new Error('chapter scroll must use cached paper metadata'); },
    };
  }
  const homeChapter = chapter(design, 1000), bioChapter = chapter(bio, 3000), gallery = chapter(design, 800, true);
  const body = { classList: classes() };
  const lightbox = { classList: classes('lb-overlay') };
  const document = {
    ...events(), readyState: 'complete', hidden: false, documentElement: root, body,
    querySelectorAll(selector) {
      if (selector === '.room > .hero, .room > .room-hero') return [home, biography];
      if (selector === '.room .section:not(.work)') return [homeChapter, bioChapter];
      assert.fail(`Unexpected reactive-motion selector: ${selector}`);
    },
    querySelector: selector => selector === '#design > .hero' ? home
      : selector === '.lb-overlay' ? lightbox
      : selector === '.lb-overlay.is-open' && lightbox.classList.contains('is-open') ? lightbox : null,
    createElement() {
      const item = { ...events(), attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
      created.push(item);
      return item;
    },
  };
  document.dispatchEvent = event => { dispatched.push(event.type); document.fire(event.type, event); };
  const window = {
    ...events(), innerWidth: 1200, innerHeight: 800, scrollY: 0,
    scrollTo() { throw new Error('reactive motion must never replace native scrolling'); },
  };
  const context = {
    document, window, innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    matchMedia: query => query.includes('prefers-reduced-motion') ? reduced : pointer,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    CustomEvent: class { constructor(type) { this.type = type; } },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(key) { frames.delete(key); },
    addEventListener: window.addEventListener,
    MutationObserver: class { constructor(callback) { observers.push(callback); } observe() {} },
  };
  vm.runInNewContext(source, context);
  function card() {
    const item = {
      reads: 0, style: style(), classList: classes(),
      closest: selector => selector === '#grid .card' ? item : null,
      getBoundingClientRect() { item.reads++; return { left: 100, top: 120, width: 400, height: 500 }; },
    };
    return item;
  }
  return {
    window, document, root, reduced, pointer, storage, dispatched, frames, created,
    design, bio, home, biography, portrait, signature, title, ghost, card,
    homeChapter, bioChapter, gallery,
    pointerMove(target, x = 1000, y = 650, pointerType = 'mouse') {
      document.fire('pointermove', {
        target, clientX: x, clientY: y, pointerType,
        preventDefault() { throw new Error('pointer decoration must not consume input'); },
      });
    },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    settle() {
      for (let pass = 0; frames.size && pass < 100; pass++) this.frame();
      assert.equal(frames.size, 0, 'the effect must settle without a permanent animation loop');
    },
    menu(state) {
      body.classList.remove('menu-open'); body.classList.remove('menu-closing');
      if (state) body.classList.add(state);
      observers.forEach(callback => callback());
    },
    setLightbox(open) { lightbox.classList.toggle('is-open', open); },
  };
}

test('motion creates no controls and retains saved on/off preferences and system defaults', () => {
  const page = fixture({ reducedMotion: true });
  assert.equal(page.root.dataset.motionMode, 'reduced');
  assert.equal(page.root.classList.contains('bq-reactive-motion'), false);
  assert.equal(page.created.length, 0);
  assert.equal(fixture().created.length, 0, 'full motion also creates no controls');
  assert.equal(page.frames.size, 0);
  page.storage.set('bq_motion', 'on');
  page.window.fire('storage', { key: 'bq_motion', newValue: 'on' }); page.settle();
  assert.equal(page.storage.get('bq_motion'), 'on');
  assert.equal(page.root.dataset.motionMode, 'full');
  const restored = fixture({ reducedMotion: true, stored: page.storage.get('bq_motion') });
  assert.equal(restored.root.dataset.motionMode, 'full', 'an explicit saved choice takes precedence over the system');
  page.storage.set('bq_motion', 'off');
  page.window.fire('storage', { key: 'bq_motion', newValue: 'off' });
  assert.equal(page.storage.get('bq_motion'), 'off');
  assert.equal(page.root.dataset.motionMode, 'reduced');
  assert.equal(fixture({ reducedMotion: false, stored: page.storage.get('bq_motion') }).root.dataset.motionMode, 'reduced',
    'a saved off choice is restored even when the system permits motion');
  page.reduced.matches = false; page.reduced.fire('change');
  assert.equal(page.root.dataset.motionMode, 'reduced', 'a manual off choice survives a system preference change');
  page.storage.delete('bq_motion'); page.window.fire('storage', { key: 'bq_motion', newValue: null }); page.settle();
  assert.equal(page.root.dataset.motionMode, 'full', 'clearing the saved choice restores the system default');
  page.reduced.matches = true; page.reduced.fire('change');
  assert.equal(page.root.dataset.motionMode, 'reduced');
  assert.ok(page.dispatched.includes('bq:motion-preference'), 'the cursor and other layers receive the shared preference event');
});

test('pointer bursts measure one active surface, reuse its geometry, and stop when settled', () => {
  const page = fixture(), first = page.card(), second = page.card();
  page.settle();
  for (let index = 0; index < 40; index++) page.pointerMove(first, 200 + index, 300);
  assert.equal(page.frames.size, 1);
  assert.equal(first.reads, 0, 'raw input events must not force layout');
  page.settle();
  assert.equal(first.reads, 1);
  assert.equal(first.style.getPropertyValue('--scene-light-x'), '34.8%');
  assert.equal(first.style.getPropertyValue('--scene-light-y'), '36.0%');
  page.pointerMove(first, 250, 350); page.settle();
  assert.equal(first.reads, 1, 'the active surface reuses its rectangle');
  page.pointerMove(second, 300, 400); page.settle();
  assert.equal(second.reads, 1);
  assert.equal(first.classList.contains('bq-motion-surface'), false);
  assert.equal(first.style.getPropertyValue('--scene-light-x'), '');
});

test('native scrolling uses the cached paper origin with no rectangle reads and no scroll interception', () => {
  const page = fixture(), card = page.card();
  page.settle();
  page.home.scroller.dataset.paperStart = '100';
  page.window.scrollY = 500;
  page.window.fire('scroll', { preventDefault() { throw new Error('native scrolling must remain free'); } });
  page.settle();
  assert.equal(page.window.scrollY, 500);
  assert.equal(page.portrait.style.getPropertyValue('--scene-y'), '-13.00px');
  assert.equal(page.signature.style.getPropertyValue('--scene-y'), '-6.00px');
  assert.equal(card.reads, 0);
  const writes = page.portrait.style.writes + page.signature.style.writes;
  page.window.fire('scroll'); page.settle();
  assert.equal(page.portrait.style.writes + page.signature.style.writes, writes, 'a settled unchanged progress does not repaint');
  page.window.scrollY = 650;
  page.pointerMove(card, 200, 300); page.settle();
  assert.equal(card.reads, 1);
  page.window.scrollY = 700; page.window.fire('scroll'); page.settle();
  assert.equal(card.reads, 1, 'scrolling clears the old hover instead of measuring moving cards');
  assert.equal(card.classList.contains('bq-motion-surface'), false);
  assert.equal(page.window.scrollY, 700);
});

test('routes reset the old scene and choose the active room without measuring its layout', () => {
  const page = fixture(), card = page.card();
  page.pointerMove(card); page.settle();
  assert.notEqual(page.portrait.style.getPropertyValue('--scene-x'), '0.00px');
  page.design.classList.add('is-hidden'); page.bio.classList.remove('is-hidden');
  page.window.scrollY = 2400;
  page.document.fire('bq:route'); page.settle();
  assert.equal(page.portrait.style.getPropertyValue('--scene-x'), '');
  assert.equal(page.signature.style.getPropertyValue('--scene-y'), '');
  assert.equal(page.title.style.getPropertyValue('--scene-y'), '-6.00px');
  assert.equal(page.ghost.style.getPropertyValue('--scene-y'), '6.00px');
  assert.equal(card.classList.contains('bq-motion-surface'), false);
  assert.equal(page.window.scrollY, 2400);
});

test('menu, visibility, blur, and lightbox changes cancel the spring and clear local decorations', () => {
  const page = fixture(), card = page.card();
  for (const state of ['menu-open', 'menu-closing', 'hidden', 'blur', 'lightbox']) {
    page.pointerMove(card); page.frame();
    assert.ok(page.frames.size > 0, 'the pointer spring is active before suspension');
    if (state.startsWith('menu')) page.menu(state);
    else if (state === 'hidden') { page.document.hidden = true; page.document.fire('visibilitychange'); }
    else if (state === 'blur') page.window.fire('blur');
    else { page.setLightbox(true); page.document.fire('bq:lightbox-open'); }
    assert.equal(page.frames.size, 0, `${state} cancels pending animation work`);
    assert.equal(page.portrait.style.getPropertyValue('--scene-x'), '');
    assert.equal(card.classList.contains('bq-motion-surface'), false);
    page.pointerMove(card);
    assert.equal(page.frames.size, 0, `${state} does not restart from a pointer event`);
    if (state.startsWith('menu')) { page.menu(null); page.document.fire('bq:menu-closed'); }
    else if (state === 'hidden') { page.document.hidden = false; page.document.fire('visibilitychange'); }
    else if (state === 'blur') page.window.fire('focus');
    else { page.setLightbox(false); page.window.fire('scroll'); }
    page.settle();
  }
});

test('coarse pointer devices ignore mouse and touch parallax while preserving a small native scroll response', () => {
  const page = fixture({ finePointer: false }), card = page.card();
  page.settle();
  page.pointerMove(card); page.pointerMove(card, 400, 600, 'touch');
  assert.equal(page.frames.size, 0);
  assert.equal(card.reads, 0);
  assert.equal(card.classList.contains('bq-motion-surface'), false);
  assert.equal(page.portrait.style.getPropertyValue('--scene-x'), '0.00px');
  page.window.scrollY = 400; page.window.fire('scroll'); page.settle();
  assert.equal(page.portrait.style.getPropertyValue('--scene-x'), '0.00px');
  assert.equal(page.portrait.style.getPropertyValue('--scene-y'), '-7.15px');
  assert.equal(page.window.scrollY, 400);
});

test('a live switch to a coarse pointer clears desktop hover decoration and settles at zero mouse offset', () => {
  const page = fixture(), card = page.card();
  page.pointerMove(card); page.frame();
  assert.ok(page.frames.size > 0);
  page.pointer.matches = false; page.pointer.fire('change'); page.settle();
  assert.equal(card.classList.contains('bq-motion-surface'), false);
  assert.equal(page.portrait.style.getPropertyValue('--scene-x'), '0.00px');
  assert.equal(page.portrait.style.getPropertyValue('--scene-rx'), '0.00deg');
  page.pointerMove(card);
  assert.equal(page.frames.size, 0);
});

function assertChapterPaint(chapter, y, opacity) {
  for (const item of chapter.items) {
    const offset = item.style.getPropertyValue('--chapter-y');
    const alpha = item.style.getPropertyValue('--chapter-opacity');
    assert.notEqual(offset, '', 'an arriving heading receives a local offset');
    assert.notEqual(alpha, '', 'an arriving heading receives a local opacity');
    assert.ok(Math.abs(Number(offset.replace('px', '')) - y) < .01, `${offset} should be approximately ${y}px`);
    assert.ok(Math.abs(Number(alpha) - opacity) < .001, `${alpha} should be approximately ${opacity}`);
  }
}

function chapterWrites(page) {
  return [...page.homeChapter.items, ...page.bioChapter.items, ...page.gallery.items]
    .reduce((total, item) => total + item.style.writes, 0);
}

test('incoming chapter titles settle with native scroll while remaining readable and leaving the gallery unchanged', () => {
  const page = fixture();
  page.settle();
  page.window.scrollY = 376; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 18, .76);
  page.window.scrollY = 608; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 9, .88);
  page.window.scrollY = 840; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 0, 1);
  page.window.scrollY = 1200; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 0, 1);
  for (const item of page.homeChapter.items) assert.equal(item.classList.contains('bq-chapter-title'), true);
  for (const item of [...page.bioChapter.items, ...page.gallery.items]) {
    assert.equal(item.style.getPropertyValue('--chapter-y'), '', 'hidden rooms and gallery titles are not animated');
    assert.equal(item.style.getPropertyValue('--chapter-opacity'), '');
  }
  assert.equal(page.window.scrollY, 1200, 'the effect decorates the browser\'s existing scroll position');
});

test('chapter motion reuses paper metadata, refreshes shifted origins, and stops writing when progress is unchanged', () => {
  const page = fixture();
  page.settle();
  page.window.scrollY = 840;
  for (let count = 0; count < 20; count++) page.window.fire('scroll');
  assert.equal(page.frames.size, 1, 'scroll bursts share the existing paint queue');
  page.settle();
  assertChapterPaint(page.homeChapter, 0, 1);
  const before = chapterWrites(page);
  page.window.fire('scroll'); page.settle();
  assert.equal(chapterWrites(page), before, 'settled unchanged titles do not invalidate their styles');
  page.homeChapter.scroller.dataset.paperStart = '1200';
  page.window.fire('bq:gallery-dimensions'); page.settle();
  const progress = (840 - 1200 + 800 * .78) / (800 * .58);
  const eased = progress * progress * (3 - 2 * progress);
  assertChapterPaint(page.homeChapter, 18 * (1 - eased), .76 + .24 * eased);
  assert.equal(page.window.scrollY, 840, 'gallery remeasurement never repositions the visitor');
  const refreshed = chapterWrites(page);
  page.window.fire('bq:gallery-dimensions'); page.settle();
  assert.equal(chapterWrites(page), refreshed, 'a repeated layout signal does no unchanged work');
});

test('chapter title motion resets for hidden tabs, menus, reduced motion, and room changes', () => {
  const page = fixture();
  page.window.scrollY = 608; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 9, .88);
  for (const state of ['menu-open', 'hidden', 'blur', 'reduced']) {
    if (state === 'menu-open') page.menu(state);
    else if (state === 'hidden') { page.document.hidden = true; page.document.fire('visibilitychange'); }
    else if (state === 'blur') page.window.fire('blur');
    else { page.reduced.matches = true; page.reduced.fire('change'); }
    assert.equal(page.frames.size, 0, `${state} cancels pending chapter work`);
    for (const item of page.homeChapter.items) {
      assert.equal(item.style.getPropertyValue('--chapter-y'), '', `${state} clears the offset`);
      assert.equal(item.style.getPropertyValue('--chapter-opacity'), '', `${state} restores full text visibility`);
    }
    if (state === 'menu-open') { page.menu(null); page.document.fire('bq:menu-closed'); }
    else if (state === 'hidden') { page.document.hidden = false; page.document.fire('visibilitychange'); }
    else if (state === 'blur') page.window.fire('focus');
    else { page.reduced.matches = false; page.reduced.fire('change'); }
    page.settle();
    assertChapterPaint(page.homeChapter, 9, .88);
  }
  page.design.classList.add('is-hidden'); page.bio.classList.remove('is-hidden');
  page.window.scrollY = 2608; page.document.fire('bq:route'); page.settle();
  for (const item of page.homeChapter.items) assert.equal(item.style.getPropertyValue('--chapter-y'), '');
  assertChapterPaint(page.bioChapter, 9, .88);
});

test('phone chapter titles use smaller scroll offsets without reacting to pointer movement', () => {
  const page = fixture({ finePointer: false });
  page.settle();
  page.window.scrollY = 608; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 5, .88);
  const before = chapterWrites(page);
  const card = page.card();
  page.pointerMove(card, 100, 200, 'touch');
  page.pointerMove(card, 300, 400, 'mouse');
  assert.equal(page.frames.size, 0);
  assert.equal(chapterWrites(page), before);
  assert.equal(card.reads, 0);
  page.window.scrollY = 840; page.window.fire('scroll'); page.settle();
  assertChapterPaint(page.homeChapter, 0, 1);
});
