import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const motion = await readFile(new URL('../preview_site/js/motion.js', import.meta.url), 'utf8');
const start = motion.indexOf('(function customCursor() {');
const end = motion.indexOf('\n})();', start) + '\n})();'.length;
assert.ok(start > 0 && end > start);
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
function classes() {
  const names = new Set();
  const state = {
    writes: 0,
    add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name),
    toggle(name, on) { state.writes++; if (on) names.add(name); else names.delete(name); },
  };
  return state;
}
function fixture({ full = true, wide = true, finePointer = true } = {}) {
  const frames = new Map(), created = [], observers = [];
  let id = 0;
  const root = { classList: classes() };
  if (full) root.classList.add('bq-reactive-motion');
  function element() {
    const state = { textWrites: 0, datasetWrites: 0, styleWrites: 0 };
    const item = {
      state, children: [], classList: classes(), setAttribute() {},
      appendChild(child) { this.children.push(child); },
      dataset: new Proxy({}, { set(target, key, value) { state.datasetWrites++; target[key] = value; return true; } }),
      style: new Proxy({}, { set(target, key, value) { state.styleWrites++; target[key] = value; return true; } }),
      set textContent(value) { state.textWrites++; state.text = value; },
      get textContent() { return state.text; },
    };
    created.push(item);
    return item;
  }
  const body = { classList: classes(), appendChild() {} };
  const document = { ...events(), documentElement: root, body, hidden: false, querySelector: () => null, createElement: element };
  const fine = { ...events(), matches: finePointer }, desktop = { ...events(), matches: wide };
  const window = { ...events(), BQ_DICT: {}, scrollTo() { throw new Error('cursor must not control native scrolling'); } };
  vm.runInNewContext(source, {
    window, document,
    matchMedia: query => query.includes('min-width') ? desktop : fine,
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(key) { frames.delete(key); },
    MutationObserver: class { constructor(callback) { observers.push(callback); } observe() {} },
  });
  const [dot, ring, label] = created;
  function target(kind = 'cta') {
    const item = {
      reads: 0,
      closest(selector) {
        if (selector.startsWith('a[href], button')) return this;
        if (kind === 'gallery' && selector.includes('#grid .card')) return this;
        if (kind === 'cta' && selector.startsWith('.mm-link, .hero-cta')) return this;
        return null;
      },
      matches: selector => kind === 'cta' && selector.includes('.hero-cta'),
      getBoundingClientRect() { item.reads++; return { left: 100, top: 100, width: 100, height: 40 }; },
    };
    return item;
  }
  return {
    window, document, root, fine, desktop, dot, ring, label, frames, target,
    pointer(target, x = 120, y = 110, pointerType = 'mouse', type = 'pointermove') {
      document.fire(type, { target, clientX: x, clientY: y, pointerType });
    },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    settle() {
      for (let pass = 0; frames.size && pass < 100; pass++) this.frame();
      assert.equal(frames.size, 0, 'the pointer spring must settle instead of running forever');
    },
    menu(state) {
      for (const name of ['menu-open', 'menu-closing']) body.classList.remove(name);
      if (state) body.classList.add(state);
      observers.forEach(callback => callback());
    },
  };
}

test('cursor coalesces pointer bursts and caches magnetic geometry and unchanged semantic writes', () => {
  const page = fixture(), button = page.target();
  for (let index = 0; index < 40; index++) page.pointer(button, 120 + index / 10);
  assert.equal(page.frames.size, 1);
  assert.equal(button.reads, 0, 'the raw pointer event must not force layout');
  page.settle();
  assert.equal(button.reads, 1, 'settling spring frames must not repeat the geometry read');
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
  const writes = [page.label.state.textWrites, page.ring.state.datasetWrites, page.ring.classList.writes];
  page.pointer(button, 140, 115); page.settle();
  assert.equal(button.reads, 1, 'the same target reuses its rectangle');
  assert.deepEqual([page.label.state.textWrites, page.ring.state.datasetWrites, page.ring.classList.writes], writes);
  assert.match(page.dot.style.transform, /translate\(140px,115px\)/);
});

test('gallery cursor keeps View semantics and translates its label without layout reads', () => {
  const page = fixture(), card = page.target('gallery');
  page.pointer(card); page.settle();
  assert.equal(page.label.textContent, 'View');
  assert.equal(page.ring.classList.contains('is-open'), true);
  assert.equal(card.reads, 0);
  const classWrites = page.ring.classList.writes;
  page.window.BQ_DICT['cursor.view'] = 'بینین';
  page.document.fire('bq:language'); page.settle();
  assert.equal(page.label.textContent, 'بینین');
  assert.equal(card.reads, 0);
  assert.equal(page.ring.classList.writes, classWrites, 'translation alone does not reapply semantic classes');
});

test('scroll and resize only invalidate the next pointer sample instead of scheduling layout work', () => {
  const page = fixture(), button = page.target();
  page.pointer(button); page.settle();
  for (const type of ['scroll', 'resize']) {
    const reads = button.reads;
    for (let index = 0; index < 30; index++) page.window.fire(type);
    assert.equal(page.frames.size, 0);
    assert.equal(button.reads, reads);
    page.pointer(button, 130, 115); page.settle();
    assert.equal(button.reads, reads + 1, `${type} invalidates geometry for the next real pointer sample`);
  }
});

test('live motion, width, and fine-pointer preferences return control to the native cursor', () => {
  const page = fixture(), button = page.target();
  for (const mode of ['preference', 'desktop', 'fine']) {
    page.pointer(button); page.frame();
    assert.equal(page.root.classList.contains('bq-cursor-on'), true);
    page.pointer(button, 180, 140);
    if (mode === 'preference') {
      page.root.classList.remove('bq-reactive-motion'); page.document.fire('bq:motion-preference');
    } else { page[mode].matches = false; page[mode].fire('change'); }
    assert.equal(page.frames.size, 0);
    assert.equal(page.root.classList.contains('bq-cursor-on'), false);
    assert.equal(page.dot.style.opacity, '0');
    page.pointer(button);
    assert.equal(page.frames.size, 0, 'an ineligible pointer cannot restart the animation');
    if (mode === 'preference') {
      page.root.classList.add('bq-reactive-motion'); page.document.fire('bq:motion-preference');
    } else { page[mode].matches = true; page[mode].fire('change'); }
  }
  page.pointer(button); page.settle();
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
});

test('a compact initial viewport enables the cursor only after becoming eligible and receiving mouse input', () => {
  const page = fixture({ wide: false }), button = page.target();
  page.pointer(button);
  assert.equal(page.frames.size, 0);
  assert.equal(page.root.classList.contains('bq-cursor-on'), false);
  page.desktop.matches = true; page.desktop.fire('change');
  assert.equal(page.frames.size, 0);
  page.pointer(button); page.settle();
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
});

test('an initially reduced motion preference preserves the native cursor until full motion is enabled', () => {
  const page = fixture({ full: false }), button = page.target();
  page.pointer(button);
  assert.equal(page.frames.size, 0);
  assert.equal(page.root.classList.contains('bq-cursor-on'), false);
  page.root.classList.add('bq-reactive-motion'); page.document.fire('bq:motion-preference');
  page.pointer(button); page.settle();
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
});

test('blur, hidden tabs, routes, and menu transitions cancel pending cursor work', () => {
  const page = fixture(), button = page.target();
  for (const state of ['blur', 'hidden', 'route', 'menu-open', 'menu-closing']) {
    page.pointer(button); page.frame();
    page.pointer(button, 180, 140);
    if (state === 'blur') page.window.fire('blur');
    else if (state === 'hidden') { page.document.hidden = true; page.document.fire('visibilitychange'); }
    else if (state === 'route') page.document.fire('bq:route');
    else page.menu(state);
    assert.equal(page.frames.size, 0, `${state} cancels a queued spring`);
    assert.equal(page.root.classList.contains('bq-cursor-on'), false);
    if (state === 'blur') page.window.fire('focus');
    else if (state === 'hidden') { page.document.hidden = false; page.document.fire('visibilitychange'); }
    else if (state.startsWith('menu')) { page.menu(null); page.document.fire('bq:menu-closed'); }
  }
  page.pointer(button); page.settle();
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
});

test('a pen or finger restores the native cursor and a later mouse can reactivate the custom cursor', () => {
  const page = fixture(), button = page.target();
  for (const pointerType of ['touch', 'pen']) {
    page.pointer(button); page.frame();
    page.document.fire('pointerdown', { pointerType });
    assert.equal(page.frames.size, 0);
    assert.equal(page.root.classList.contains('bq-cursor-on'), false);
    page.pointer(button, 120, 110, pointerType);
    assert.equal(page.frames.size, 0);
  }
  page.pointer(button); page.settle();
  assert.equal(page.root.classList.contains('bq-cursor-on'), true);
  page.pointer(button, 140, 120, 'pen', 'pointerover');
  assert.equal(page.root.classList.contains('bq-cursor-on'), false, 'hovering a pen also returns control to the real pointer');
  assert.equal(page.frames.size, 0);
});
