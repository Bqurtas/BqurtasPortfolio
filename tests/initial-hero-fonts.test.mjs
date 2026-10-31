import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const start = main.indexOf('  const initialHeroFontLoads = () => {');
const end = main.indexOf("  document.addEventListener('DOMContentLoaded', () => {", start);
assert.ok(start > 0 && end > start);
const source = main.slice(start, end);
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ route = 'home', texts = [], load = () => Promise.resolve(), supported = true, hero = true } = {}) {
  const requests = [], events = [], timers = new Map();
  let timerId = 0;
  const nodes = texts.map(({ text, font = 'Manrope', visible = true }) => ({
    textContent: text,
    parentElement: {
      getClientRects: () => visible ? [{}] : [],
      computed: { fontStyle: 'normal', fontWeight: '400', fontSize: '16px', fontFamily: font },
    },
  }));
  const heroElement = {};
  const context = {
    Map, Promise, NodeFilter: { SHOW_TEXT: 4 },
    shellFontsReady: !supported, shellFontsStarted: false, shellRevision: 0,
    getComputedStyle: element => element.computed,
    CustomEvent: class { constructor(type) { this.type = type; } },
    window: { dispatchEvent: event => events.push(event.type) },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    document: {
      documentElement: { dataset: { initialRoute: route } },
      querySelector(selector) {
        assert.equal(selector, '.room:not(.is-hidden) > .hero, .room:not(.is-hidden) > .room-hero');
        return hero ? heroElement : null;
      },
      createTreeWalker(element, filter) {
        assert.equal(element, heroElement);
        assert.equal(filter, 4);
        let index = 0;
        return { nextNode: () => nodes[index++] || null };
      },
      fonts: supported ? { load(font, text) { requests.push({ font, text }); return load(font, text); } } : undefined,
    },
  };
  const prepare = vm.runInNewContext(`${source}\nprepareShellFonts;`, context);
  return {
    prepare, requests, events, timers, context,
    expire() { for (const { fn } of [...timers.values()]) fn(); },
  };
}

test('startup loads only rendered initial hero fonts with their actual glyphs', async () => {
  const page = fixture({ texts: [
    { text: 'Barakat Qurtas', font: 'Liana, Fraunces, serif' },
    { text: 'Designer in Hewlêr' }, { text: 'View the work' },
    { text: 'هەولێر', font: 'Noto Kufi Arabic, sans-serif' },
    { text: 'Hidden decorative label', font: 'Unused', visible: false }, { text: '  \n  ' },
  ] });
  page.prepare();
  assert.deepEqual(page.requests, [
    { font: 'normal 400 16px Liana, Fraunces, serif', text: 'Barakat Qurtas' },
    { font: 'normal 400 16px Manrope', text: 'Designer in Hewlêr View the work' },
    { font: 'normal 400 16px Noto Kufi Arabic, sans-serif', text: 'هەولێر' },
  ]);
  await tick();
  assert.equal(page.context.shellFontsReady, true);
  assert.equal(page.context.shellRevision, 1, 'the previous fallback-font fit must be measured again');
  assert.deepEqual(page.events, ['bq:shell-fonts-ready']);
  assert.equal(page.timers.size, 0, 'healthy fonts remove the recovery timer');
});

test('a pending hero face holds readiness until every requested face settles', async () => {
  let resolveLate;
  const late = new Promise(resolve => { resolveLate = resolve; });
  const page = fixture({ texts: [{ text: 'Name', font: 'Liana' }, { text: 'Description' }],
    load: font => font.includes('Manrope') ? late : Promise.resolve() });
  page.prepare(); page.prepare();
  await tick();
  assert.equal(page.requests.length, 2, 'initial preparation only runs once');
  assert.equal(page.context.shellFontsReady, false);
  assert.equal(page.context.shellRevision, 0);
  assert.deepEqual(page.events, []);
  resolveLate();
  await tick();
  assert.equal(page.context.shellFontsReady, true);
  assert.deepEqual(page.events, ['bq:shell-fonts-ready']);
});

test('failed and unavailable font loading retain a usable startup fallback', async () => {
  for (const load of [() => Promise.reject(new Error('offline')), () => { throw new Error('invalid face'); }]) {
    const page = fixture({ texts: [{ text: 'Name' }], load });
    page.prepare();
    await tick();
    assert.equal(page.context.shellFontsReady, true);
    assert.deepEqual(page.events, ['bq:shell-fonts-ready']);
  }
  const unsupported = fixture({ supported: false });
  unsupported.prepare();
  assert.equal(unsupported.context.shellFontsReady, true);
  assert.equal(unsupported.timers.size, 0);
  const absentHero = fixture({ hero: false });
  absentHero.prepare();
  await tick();
  assert.equal(absentHero.context.shellFontsReady, true);
  assert.equal(absentHero.requests.length, 0);
});

test('stalled fonts recover within existing loader limits and late completion cannot restart startup', async () => {
  for (const route of ['home', 'design', 'blog', 'bio', 'contact']) {
    let resolveLate;
    const late = new Promise(resolve => { resolveLate = resolve; });
    const page = fixture({ route, texts: [{ text: 'Title' }], load: () => late });
    page.prepare();
    assert.equal([...page.timers.values()][0].delay, route === 'home' ? 1200 : 500);
    assert.equal(page.context.shellFontsReady, false);
    page.expire();
    assert.equal(page.context.shellFontsReady, true);
    assert.equal(page.context.shellRevision, 1);
    resolveLate();
    await tick();
    assert.deepEqual(page.events, ['bq:shell-fonts-ready']);
    assert.equal(page.context.shellRevision, 1);
  }
});
