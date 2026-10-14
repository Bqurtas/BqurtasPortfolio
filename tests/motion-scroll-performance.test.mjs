import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const motion = await readFile(new URL('../preview_site/js/motion.js', import.meta.url), 'utf8');

test('motion uses a content-named release path so an older CDN response cannot collide', async () => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const match = html.match(/src="(js\/motion\.([a-f0-9]{12})\.min\.js)\?v=([a-f0-9]{12})"/);
  assert.ok(match, 'the shipped motion script uses its content hash in the filename');
  const bytes = await readFile(new URL(`../preview_site/${match[1]}`, import.meta.url));
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  assert.equal(match[2], digest);
  assert.equal(match[3], digest);
  const sw = await readFile(new URL('../preview_site/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes(`/${match[1]}?v=${digest}`), 'offline preload requests the same release');
});
function slice(from, to) {
  const start = motion.indexOf(from), end = motion.indexOf(to, start);
  assert.ok(start >= 0 && end > start);
  return motion.slice(start, end);
}
const driftSource = slice('    /* ---- slow section-title drift', '    /* Infinite marquees');
const riseStart = motion.indexOf('        var pending = riseSheets.slice();');
const riseEnd = motion.indexOf('        queueRise();', riseStart) + '        queueRise();'.length;
assert.ok(riseStart > 0 && riseEnd > riseStart);
const riseSource = motion.slice(riseStart, riseEnd);

function eventTarget() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(handler); },
    removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
    fire(type) { for (const handler of handlers.get(type) || []) handler(); },
    count(type) { return handlers.get(type)?.size || 0; },
  };
}
function classes() {
  const names = new Set();
  return { add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name) };
}
function fixture() {
  const timeline = [], frames = new Map();
  let frameId = 0;
  const window = { ...eventTarget(), innerHeight: 800 };
  const document = { ...eventTarget(), hidden: false, body: { classList: classes() } };
  const compact = { ...eventTarget(), matches: false }, reduced = { ...eventTarget(), matches: false };
  const design = { classList: classes() }, bio = { classList: classes() };
  bio.classList.add('is-hidden');
  function item(room, top, height = 100) {
    const state = { top, height, reads: 0, writes: 0, removes: 0, value: null };
    return {
      state, classList: classes(), closest: () => room,
      getBoundingClientRect() {
        state.reads++; timeline.push('read');
        return { top: state.top, height: state.height, bottom: state.top + state.height };
      },
      style: {
        setProperty(_, value) { state.writes++; state.value = value; timeline.push('write'); },
        removeProperty() { state.removes++; state.value = null; timeline.push('write'); },
      },
    };
  }
  const visible = item(design, 150), hidden = item(bio, 0), offscreen = item(design, 1100);
  const items = [visible, hidden, offscreen];
  document.querySelectorAll = () => items;
  const context = {
    window, document, innerHeight: window.innerHeight,
    matchMedia: query => query.includes('prefers-reduced-motion') ? reduced : compact,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    addEventListener: window.addEventListener, removeEventListener: window.removeEventListener,
    reduce: false, clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
  };
  return {
    context, window, document, compact, reduced, design, bio, visible, hidden, offscreen, timeline, frames,
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    startDrift() { vm.runInNewContext(driftSource, context); },
    startRise() {
      context.riseSheets = [{ sheet: visible, items: [visible] }, { sheet: hidden, items: [hidden] }];
      vm.runInNewContext(riseSource, context);
    },
  };
}

test('title drift batches native scroll events, skips hidden rooms, and avoids unchanged paints', () => {
  const page = fixture();
  page.startDrift();
  assert.equal(page.hidden.state.reads, 0);
  assert.equal(page.hidden.state.writes, 0);
  assert.equal(page.visible.state.value, '-3.50px');
  assert.equal(page.offscreen.state.writes, 0);
  page.timeline.length = 0;
  for (let index = 0; index < 40; index++) page.window.fire('scroll');
  assert.equal(page.frames.size, 1);
  page.flush();
  assert.equal(page.visible.state.reads, 2, 'one rect read for the entire event burst');
  assert.equal(page.visible.state.writes, 1, 'a fixed visible title should not invalidate its styles again');
  page.visible.state.top = 200;
  page.window.fire('scroll'); page.flush();
  assert.equal(page.visible.state.value, '-2.63px');
  assert.equal(page.hidden.state.reads, 0);
  assert.deepEqual(page.timeline.slice(-3), ['read', 'read', 'write'], 'all active geometry is read before painting');
});

test('title drift stays idle behind the menu and in a background tab, then resumes in the active room', () => {
  const page = fixture();
  page.startDrift();
  for (const state of ['menu-open', 'menu-closing']) {
    page.document.body.classList.add(state);
    page.window.fire('scroll'); page.flush();
    page.document.body.classList.remove(state);
  }
  page.document.hidden = true;
  page.document.fire('visibilitychange'); page.flush();
  assert.equal(page.visible.state.reads, 1);
  page.document.hidden = false;
  page.design.classList.add('is-hidden'); page.bio.classList.remove('is-hidden');
  page.document.fire('bq:route'); page.flush();
  assert.equal(page.visible.state.reads, 1, 'the previous room is skipped after routing');
  assert.equal(page.hidden.state.reads, 1);
  assert.equal(page.hidden.state.value, '-6.13px');
});

for (const mode of ['compact', 'reduced']) {
  test(`desktop drift clears once when switching to ${mode} mode and restores without scroll interception`, () => {
    const page = fixture();
    page.startDrift();
    page[mode].matches = true;
    page[mode].fire('change'); page.flush();
    assert.equal(page.visible.state.value, null);
    assert.equal(page.visible.state.removes, 1);
    page.window.fire('scroll'); page.flush();
    assert.equal(page.visible.state.reads, 1, 'disabled drift does not read layout');
    assert.equal(page.visible.state.removes, 1);
    page[mode].matches = false;
    page[mode].fire('change'); page.flush();
    assert.equal(page.visible.state.value, '-3.50px');
    assert.equal(page.visible.state.writes, 2);
  });
}

test('home reveal checks skip hidden rooms and resume on route before removing their listeners', () => {
  const page = fixture();
  page.startRise(); page.flush();
  assert.equal(page.visible.classList.contains('is-risen'), true);
  assert.equal(page.hidden.classList.contains('is-risen'), false);
  assert.equal(page.hidden.state.reads, 0, 'a hidden zero rect must not consume a future reveal');
  page.bio.classList.remove('is-hidden');
  page.document.fire('bq:route'); page.flush();
  assert.equal(page.hidden.classList.contains('is-risen'), true);
  assert.equal(page.window.count('scroll'), 0);
  assert.equal(page.window.count('resize'), 0);
  assert.equal(page.document.count('bq:route'), 0);
  assert.equal(page.document.count('bq:menu-closed'), 0);
  assert.equal(page.document.count('visibilitychange'), 0);
});

test('home reveal does not measure during menu transitions and resumes on menu closure', () => {
  const page = fixture();
  page.document.body.classList.add('menu-open');
  page.startRise(); page.flush();
  assert.equal(page.visible.state.reads, 0);
  assert.equal(page.visible.classList.contains('is-risen'), false);
  page.document.body.classList.remove('menu-open');
  page.document.fire('bq:menu-closed'); page.flush();
  assert.equal(page.visible.classList.contains('is-risen'), true);
});
