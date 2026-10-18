import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
function section(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `application section exists: ${from}`);
  return source.slice(start, end);
}
function events() {
  const handlers = new Map();
  return {
    addEventListener(type, callback) { handlers.set(type, [...(handlers.get(type) || []), callback]); },
    fire(type, values = {}) {
      const event = { type, currentTarget: this, target: this, cancelable: true,
        preventDefault() { this.defaultPrevented = true; }, ...values };
      for (const callback of handlers.get(type) || []) callback(event);
      return event;
    },
  };
}
function clock() {
  let now = 0, id = 0;
  const pending = new Map();
  return {
    setTimeout(callback, delay) { pending.set(++id, { callback, at: now + delay }); return id; },
    clearTimeout(timer) { pending.delete(timer); },
    get count() { return pending.size; },
    advance(duration) {
      const end = now + duration;
      for (;;) {
        const next = [...pending].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        pending.delete(next[0]); now = next[1].at; next[1].callback();
      }
      now = end;
    },
  };
}
function fixture(kind) {
  const timer = clock();
  const document = { ...events(), contains: () => true };
  function element() {
    const names = new Set(), attrs = new Map();
    return {
      ...events(), attrs, children: new Set(), focusCount: 0,
      classList: { add: value => names.add(value), remove: value => names.delete(value), contains: value => names.has(value) },
      style: { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } },
      setAttribute(name, value) { attrs.set(name, value); },
      removeAttribute(name) { attrs.delete(name); },
      toggleAttribute(name, force) { if (force) attrs.set(name, ''); else attrs.delete(name); },
      focus() { this.focusCount++; document.activeElement = this; },
      contains(node) { return node === this || this.children.has(node); },
    };
  }
  const panel = element(), backdrop = element(), trigger = element(), otherTrigger = element();
  const head = element(), dismiss = element(), input = element();
  panel.children.add(head); panel.children.add(dismiss); panel.children.add(input);
  panel.querySelector = () => head;
  document.activeElement = trigger;
  const window = { ...events(), matchMedia: () => ({ matches: true }), __bqLangCb: [] };
  const context = {
    document, window, panel, backdrop, input, min: dismiss, triggers: [trigger, otherTrigger], bell: trigger, bellM: otherTrigger,
    $: selector => selector === '#latestClose' ? dismiss : backdrop,
    restore: () => false, add() {}, getGreet: () => 'Hello', buildQuick() {},
    setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout,
  };
  const chat = section('    let greeted = false;', '    /* rebuild quick chips');
  const latest = section('  /* a quiet minute with no interaction → Latest closes itself */', '  const setBadge = ')
    + section('  bell && bell.addEventListener', '  if (window.__bqLangCb)');
  vm.runInNewContext(kind === 'chat' ? chat : latest, context);
  return { timer, document, window, panel, backdrop, trigger, otherTrigger, head, dismiss, input,
    open() { trigger.focus(); trigger.fire('click'); }, close() { window.__bqPanels[kind](); } };
}

test('a dismissed chat cannot refocus its hidden input when its old entrance timer expires', () => {
  const page = fixture('chat');
  page.open(); page.timer.advance(100); page.close(); page.timer.advance(400);
  assert.equal(page.input.focusCount, 0);
  assert.equal(page.panel.attrs.has('inert'), true);
  page.open(); page.timer.advance(300);
  assert.equal(page.input.focusCount, 1, 'a fresh open retains its own autofocus');
});

for (const kind of ['chat', 'latest']) {
  test(`${kind} closes with Escape, restores its trigger and leaves hidden controls inert`, () => {
    const page = fixture(kind);
    assert.equal(page.panel.attrs.has('inert'), true);
    assert.equal(page.trigger.attrs.get('aria-expanded'), 'false');
    page.open();
    assert.equal(page.panel.attrs.has('inert'), false);
    assert.equal(page.trigger.attrs.get('aria-expanded'), 'true');
    page.dismiss.focus();
    const event = page.document.fire('keydown', { key: 'Escape' });
    assert.equal(event.defaultPrevented, true);
    assert.equal(page.document.activeElement, page.trigger);
    assert.equal(page.panel.classList.contains('is-open'), false);
    assert.equal(page.panel.attrs.get('aria-hidden'), 'true');
    assert.equal(page.panel.attrs.has('inert'), true);
  });

  test(`${kind} dismissal does not steal focus from the next panel's trigger`, () => {
    const page = fixture(kind);
    page.open(); page.otherTrigger.focus(); page.close(); page.timer.advance(400);
    assert.equal(page.document.activeElement, page.otherTrigger);
  });

  test(`${kind} drag reports distance without replacing centering and resets on cancel or external close`, () => {
    const page = fixture(kind);
    page.open();
    page.head.fire('touchstart', { touches: [{ clientY: 100 }] });
    page.head.fire('touchmove', { touches: [{ clientY: 140 }] });
    assert.equal(page.panel.style['--bq-panel-drag-y'], '40px');
    assert.equal(page.panel.style.transform, undefined);
    assert.equal(page.panel.attrs.has('data-panel-dragging'), true);
    page.head.fire('touchcancel');
    assert.equal(page.panel.classList.contains('is-open'), true);
    assert.equal(page.panel.style['--bq-panel-drag-y'], undefined);
    page.head.fire('pointerdown', { pointerType: 'mouse', clientY: 100 });
    page.window.fire('pointermove', { pointerType: 'mouse', clientY: 170 });
    page.window.fire('pointercancel');
    assert.equal(page.panel.classList.contains('is-open'), true);
    assert.equal(page.panel.attrs.has('data-panel-dragging'), false);
    page.head.fire('touchstart', { touches: [{ clientY: 100 }] });
    page.head.fire('touchmove', { touches: [{ clientY: 170 }] });
    page.head.fire('touchend');
    assert.equal(page.panel.classList.contains('is-open'), false);
    page.open();
    page.head.fire('touchstart', { touches: [{ clientY: 100 }] });
    page.head.fire('touchmove', { touches: [{ clientY: 130 }] });
    page.close();
    assert.equal(page.panel.style['--bq-panel-drag-y'], undefined);
    assert.equal(page.panel.attrs.has('data-panel-dragging'), false);
  });
}

test('height-only phone resizes preserve marquee markup; width, font and language changes rebuild it', () => {
  const timer = clock(), fonts = events();
  let writes = 0;
  const track = { style: {}, scrollWidth: 1000, set innerHTML(_) { writes++; } };
  const wrap = { clientWidth: 390 };
  const window = { ...events(), __bqLangCb: [] };
  vm.runInNewContext(section("    const track = $('.hero-marquee-track');", '    /* delegated discipline hover'), {
    window, document: { fonts }, $: selector => selector.includes('track') ? track : wrap,
    setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout,
  });
  assert.equal(writes, 2);
  for (let i = 0; i < 20; i++) window.fire('resize');
  assert.equal(timer.count, 0, 'browser toolbar movement does not schedule work');
  assert.equal(writes, 2);
  wrap.clientWidth = 600; window.fire('resize');
  wrap.clientWidth = 700; window.fire('resize'); timer.advance(250);
  assert.equal(writes, 4, 'a burst of actual width changes rebuilds once');
  fonts.fire('loadingdone');
  assert.equal(writes, 6);
  window.__bqLangCb[0]();
  assert.equal(writes, 8);
});
