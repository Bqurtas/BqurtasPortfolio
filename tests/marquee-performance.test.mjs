import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const motion = await readFile(new URL('../preview_site/js/motion.js', import.meta.url), 'utf8');
const start = motion.indexOf('    /* Infinite marquees only run while on-screen; pause in background tabs. */');
const end = motion.indexOf('\n  });\n})();', start);
assert.ok(start >= 0 && end > start);
const source = motion.slice(start, end);

function classes(...initial) {
  const names = new Set(initial);
  return {
    contains: name => names.has(name),
    toggle(name, on) { if (on) names.add(name); else names.delete(name); },
  };
}

function fixture({ observersSupported = true, hidden = false } = {}) {
  const observed = [], listeners = new Map();
  let observer;
  const tracks = ['software-track', 'hero-marquee-track', 'logo-marquee-track'].map(name => ({
    name, parentElement: { name: name + '-viewport' }, classList: classes(name),
    getBoundingClientRect() { throw new Error('marquee suspension must not measure during native scroll'); },
  }));
  const document = {
    hidden, documentElement: { classList: classes() },
    querySelectorAll(selector) { return tracks.filter(track => selector.split(', ').includes('.' + track.name)); },
    addEventListener(type, handler) { listeners.set(type, handler); },
  };
  const IntersectionObserver = class {
    constructor(callback, options) { observer = { callback, options }; }
    observe(track) { observed.push(track); }
  };
  const window = observersSupported ? { IntersectionObserver } : {};
  vm.runInNewContext(source, {
    document, window, IntersectionObserver,
    requestAnimationFrame() { throw new Error('offscreen marquee suspension must remain observer-driven'); },
  });
  return {
    tracks, document, observed,
    get observer() { return observer; },
    visibility(next) { document.hidden = next; listeners.get('visibilitychange')(); },
  };
}

test('all authored marquees, including the client logo strip, suspend outside the viewing area', () => {
  const page = fixture();
  assert.deepEqual(page.observed, page.tracks.map(track => track.parentElement), 'the logo strip must not animate unobserved throughout the portfolio');
  assert.equal(page.observer.options.rootMargin, '12% 0px', 'motion resumes shortly before the strip arrives');
  page.observer.callback(page.tracks.map(track => ({ target: track.parentElement, isIntersecting: false })));
  assert.ok(page.tracks.every(track => track.classList.contains('is-offscreen')));
  const logo = page.tracks.find(track => track.name === 'logo-marquee-track');
  page.observer.callback([{ target: logo.parentElement, isIntersecting: true }]);
  assert.equal(logo.classList.contains('is-offscreen'), false, 'the existing animation resumes when the logo strip is visible');
  assert.equal(page.tracks[0].classList.contains('is-offscreen'), true);
});

test('the endless orbit and live dots below the hero rest off-screen the same way', async () => {
  assert.match(source, /querySelectorAll\('\.software-track, \.hero-marquee-track, \.logo-marquee-track, \.portrait-orbit, \.recent-live-dot, \.site-live'\)/);
  const css = await readFile(new URL('../preview_site/css/modern-framer.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.software-track.is-offscreen,'), css.indexOf('animation-play-state: paused !important;', css.indexOf('.software-track.is-offscreen,')));
  for (const selector of ['.recent-live-dot.is-offscreen', '.site-live.is-offscreen::after',
    // four ids: above polish.css's three-id `animation: … !important` on the orbit and its glyphs
    'html body #design#design#design#design .portrait-orbit.is-offscreen',
    'html body #design#design#design#design .portrait-orbit.is-offscreen .orbit-ic::before',
    // a fully covered sticky paper still intersects the viewport, but its content is hidden
    // listed one by one: an engine without :is() would drop the whole shared rule
    '.is-paper-gone .software-track', '.is-paper-gone .hero-marquee-track',
    '.is-paper-gone .logo-marquee-track', '.is-paper-gone .recent-live-dot',
    '.is-paper-gone .site-live::after',
    'html body #design#design#design#design .is-paper-gone .portrait-orbit',
    'html body #design#design#design#design .is-paper-gone .portrait-orbit .orbit-ic::before']) {
    assert.ok(rule.includes(selector), selector);
  }
  assert.doesNotMatch(rule, /:is\(/, 'no :is() in the shared pause rule');
  const experience = await readFile(new URL('../preview_site/css/experience.css', import.meta.url), 'utf8');
  assert.match(experience, /\.paper-sheet\.is-paper-gone > \.paper-scroll > \*,[\s\S]{0,200}?visibility: hidden !important;/,
    'resting is invisible only while a covered paper hides its content');
});

test('background tabs pause and restore marquee motion without discarding offscreen state', () => {
  const page = fixture({ hidden: true });
  assert.equal(page.document.documentElement.classList.contains('bq-paused'), true);
  page.observer.callback([{ target: page.tracks[2].parentElement, isIntersecting: false }]);
  page.visibility(false);
  assert.equal(page.document.documentElement.classList.contains('bq-paused'), false);
  assert.equal(page.tracks[2].classList.contains('is-offscreen'), true, 'returning to the tab does not resume a distant logo strip');
  page.visibility(true);
  assert.equal(page.document.documentElement.classList.contains('bq-paused'), true);
});

test('browsers without intersection observation retain content and background suspension', () => {
  const page = fixture({ observersSupported: false });
  assert.equal(page.observed.length, 0);
  assert.ok(page.tracks.every(track => !track.classList.contains('is-offscreen')), 'unsupported observation must leave the strip visible');
  page.visibility(true);
  assert.equal(page.document.documentElement.classList.contains('bq-paused'), true);
  page.visibility(false);
  assert.equal(page.document.documentElement.classList.contains('bq-paused'), false);
});
