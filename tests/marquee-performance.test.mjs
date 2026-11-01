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
