import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildDrawMap } from '../scripts/generate-logo-draw.mjs';

const site = new URL('../preview_site/', import.meta.url);
const film = await readFile(new URL('js/film.js', site), 'utf8');
const css = await readFile(new URL('css/film.css', site), 'utf8');
const html = await readFile(new URL('index.html', site), 'utf8');
const splashPart = film.slice(film.indexOf('/* ═════ part: splash ═════ */'), film.indexOf('/* ═════ part: evidence ═════ */'));

/* A stand-in page for the opening: a class list, events, a clip whose play() we
   control, frames on demand and a clock we move by hand. */
function page({ pending = true, visible = true, play = 'ok', theme = 'light' } = {}) {
  let now = 0, frames = [], timers = [];
  const classes = (...names) => {
    const set = new Set(names);
    return { add: (...n) => n.forEach(x => set.add(x)), remove: (...n) => n.forEach(x => set.delete(x)),
      contains: x => set.has(x), toggle: (x, on) => (on ?? !set.has(x)) ? set.add(x) : set.delete(x), set };
  };
  const listeners = new Map();
  const on = target => ({
    addEventListener(type, fn) { const key = target + type; if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); },
    removeEventListener(type, fn) { listeners.get(target + type)?.delete(fn); }
  });
  const fire = (target, type, event = {}) => [...(listeners.get(target + type) || [])].forEach(fn => fn(event));
  const root = { classList: classes('film-splashing', ...(pending ? ['bq-css-pending'] : [])), dataset: { theme } };
  const painted = [];
  const ctx = { putImageData() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }), createImageData: () => ({ data: new Uint8ClampedArray(4) }) };
  const video = { ...on('video:'), currentTime: 0, readyState: 0, paused: true, ended: false, plays: 0, setAttribute() {}, load() {},
    pause() { this.paused = true; },
    play() {
      this.plays++;
      if (play === 'refuse') return Promise.reject(Object.assign(new Error('autoplay refused'), { name: 'NotAllowedError' }));
      this.paused = false; this.readyState = 4;
      return Promise.resolve();
    } };
  const holder = { dataset: { src: 'logo-write.mp4', draw: 'logo-draw.bin' }, classList: classes(), append() {} };
  const el = { ...on('el:'), classList: classes(), style: { setProperty() {} }, removed: false,
    querySelector: () => holder, remove() { this.removed = true; } };
  const doc = { ...on('doc:'), visibilityState: visible ? 'visible' : 'hidden', hidden: !visible, prerendering: false,
    getElementById: id => (id === 'filmSplash' ? el : null),
    createElement: tag => (tag === 'video' ? video : { width: 0, height: 0, getContext: () => ctx }) };
  let begun = 0;
  const F = {
    doc, root, hero: { classList: classes(), getBoundingClientRect: () => ({ top: 0, height: 800 }) },
    raf2: fn => frames.push(() => frames.push(fn)),
    beginHero: () => { begun++; }, keyFrame: frame => frame,
    loadDrawMap: () => Promise.resolve({ W: 900, H: 200, n: 0, idx: [], tq: [], al: [] }),
    namePainter: () => (p, tone) => painted.push([Math.round(p * 1000) / 1000, tone])
  };
  const context = {
    window: { __bqFilm: F }, performance: { now: () => now },
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; }, cancelAnimationFrame() {},
    setTimeout: (fn, ms = 0) => { timers.push({ at: now + ms, fn }); return timers.length; }, clearTimeout() {},
    matchMedia: () => ({ matches: false }), getComputedStyle: () => ({ getPropertyValue: () => '61.8' }),
    addEventListener: on('win:').addEventListener, removeEventListener: on('win:').removeEventListener
  };
  vm.runInNewContext(splashPart, context);
  const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
  return {
    root, el, holder, video, doc, F, painted, fire, get begun() { return begun; },
    async frame() { const list = frames; frames = []; list.forEach(fn => fn(now)); await flush(); },
    async advance(ms) {
      const until = now + ms;
      while (true) {
        timers.sort((a, b) => a.at - b.at);
        const due = timers[0] && timers[0].at <= until ? timers.shift() : null;
        const step = Math.min(until, due ? due.at : until, now + 16);
        now = step;
        if (due && due.at <= now) due.fn(); else timers.unshift(...(due ? [due] : []));
        await this.frame();
        if (now >= until && !(timers[0] && timers[0].at <= until)) break;
      }
    },
    async reveal() { root.classList.remove('bq-css-pending'); fire('win:', 'bq:css-ready'); await this.frame(); await this.frame(); }
  };
}

test('the opening starts on sight: nothing plays behind the startup gate or out of sight', async () => {
  const gated = page({ pending: true });
  await gated.advance(3000);
  assert.equal(gated.video.plays, 0, 'no clip and no clock while the page is still gated');
  assert.equal(gated.el.classList.contains('is-open'), false, 'the window cannot open unseen');
  await gated.reveal();
  assert.equal(gated.video.plays, 1, 'the clip starts on the first visible frames');

  const hidden = page({ pending: false, visible: false });
  await hidden.advance(3000);
  assert.equal(hidden.video.plays, 0);
  hidden.doc.visibilityState = 'visible'; hidden.doc.hidden = false;
  hidden.fire('doc:', 'visibilitychange');
  await hidden.frame(); await hidden.frame();
  assert.equal(hidden.video.plays, 1);
});

test('refused autoplay writes the name stroke by stroke from the map, never a still', async () => {
  const p = page({ pending: false, play: 'refuse' });
  await p.frame(); await p.frame();
  await p.advance(1200);
  const progress = p.painted.map(([value]) => value);
  assert.ok(progress.length > 20, 'many frames of writing, not one');
  assert.ok(progress.some(v => v > 0 && v < 0.5) && progress.some(v => v >= 0.5 && v < 1), 'the name grows over time');
  await p.advance(1500);
  assert.equal(Math.max(...progress, ...p.painted.map(([value]) => value)), 1);
  assert.equal(p.el.classList.contains('is-open'), true, 'the window opens once the name is written');
  assert.equal(p.holder.classList.contains('is-still'), false);
  assert.ok(p.painted.every(([, tone]) => tone === 22), 'ink on paper in light mode');
  await p.advance(100);
  assert.equal(p.begun, 1, 'the hero starts as the window opens');
});

test('a theme change during the opening writes in the new tone', async () => {
  const p = page({ pending: false, play: 'refuse' });
  await p.frame(); await p.frame();
  await p.advance(400);
  p.root.dataset.theme = 'dark';
  await p.advance(300);
  assert.equal(p.painted.at(-1)[1], 243);
});

test('the opening never shows a finished still, and the hero never gets a second name', () => {
  assert.doesNotMatch(splashPart, /is-still|data-still|dataset\.still/);
  assert.doesNotMatch(css, /film-splash-write|\.is-still/);
  assert.match(html, /<span class="film-splash-name" data-src="assets\/film\/logo-write\.mp4\?v=[a-f0-9]{12}" data-draw="assets\/film\/logo-draw\.bin\?v=[a-f0-9]{12}">/);
  assert.match(html, /data-film-logo-draw="assets\/film\/logo-draw\.bin\?v=[a-f0-9]{12}"/);
  assert.doesNotMatch(html, /<video class="film-logo"[^>]*poster=/, 'the hero clip has no still poster to show beside the opening');
  assert.match(css, /:root\[data-film\] #design#design#design#design \.hero \.hero-sign-hand \{ display: none !important; \}/);
  assert.match(film, /writeFromMap\(hero\.dataset\.filmLogoDraw/);
});

test('light visits never start dark: the page is light-only and the hero keeps its ink on the cut', () => {
  assert.match(html, /<meta name="color-scheme" content="light" \/>/);
  assert.match(css, /\.film-hero\.film-intro\.film-behind-opening \.film-ink \{\s*clip-path: inset\(var\(--film-cut\) 0 0 0\);\s*transition: none;/);
  assert.match(splashPart, /F\.hero\.classList\.add\('film-behind-opening'\)/);
  assert.match(film, /if \(playIntro && root\.classList\.contains\('bq-css-pending'\)\) hero\.classList\.add\('film-behind-opening'\)/);
});

test('the write map records each pixel\'s keyed alpha and the moment it is first half lit', () => {
  const N = 900 * 200, count = 181;
  const frames = new Uint8Array(N * count).fill(20);
  // pixel 7 lights at frame 60 (1.0 s), pixel 9 at frame 150 (2.5 s), pixel 11 never
  for (let f = 60; f < count; f++) frames[f * N + 7] = 255;
  for (let f = 150; f < count; f++) frames[f * N + 9] = 140;
  const { rgb, ink } = buildDrawMap(frames, count);
  assert.equal(ink, 2);
  const at = i => ({ alpha: rgb[i * 3], q: (rgb[i * 3 + 1] << 2) | Math.round(rgb[i * 3 + 2] / 85) });
  assert.deepEqual(at(7), { alpha: 255, q: Math.round(1 / 3 * 1023) });
  assert.deepEqual(at(9), { alpha: Math.round(120 * 1.085), q: Math.round(2.5 / 3 * 1023) });
  assert.deepEqual(at(11), { alpha: 0, q: 0 });
});
