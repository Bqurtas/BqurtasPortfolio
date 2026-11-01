import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const lux = await readFile(new URL('../preview_site/js/lux.js', import.meta.url), 'utf8');
const start = lux.indexOf('  /* ---- the client-logo marquee SLOWS');
const end = lux.indexOf('\n  })();', start);
assert.ok(start > 0 && end > start);
const hoverSource = lux.slice(start, end + '\n  })();'.length);

function fixture({ finePointer = true, animationsSupported = true, updateRate = true } = {}) {
  const listeners = new Map();
  const animation = {
    currentTime: 12345,
    playbackRate: 1,
    pause() { assert.fail('hover must slow the moving strip, never stop it'); },
    play() { assert.fail('hover must not restart an animation paused for another reason'); },
  };
  if (updateRate) animation.updatePlaybackRate = value => { animation.playbackRate = value; };
  const track = animationsSupported ? { getAnimations: () => [animation] } : {};
  const marquee = {
    querySelector: () => track,
    addEventListener: (type, handler) => listeners.set(type, handler),
  };
  vm.runInNewContext(hoverSource, {
    document: { querySelector: () => marquee },
    matchMedia: () => ({ matches: finePointer }),
  });
  return { animation, listeners };
}

for (const updateRate of [true, false]) test(`designed logo hover slows without jumping with ${updateRate ? 'updatePlaybackRate' : 'playbackRate fallback'}`, () => {
  const page = fixture({ updateRate });
  page.listeners.get('mouseenter')();
  assert.equal(page.animation.playbackRate, .22);
  assert.equal(page.animation.currentTime, 12345, 'the visible mark keeps its current position');
  page.listeners.get('mouseleave')();
  assert.equal(page.animation.playbackRate, 1);
  assert.equal(page.animation.currentTime, 12345);
});

test('touch-only devices retain uninterrupted normal marquee speed', () => {
  const page = fixture({ finePointer: false });
  assert.equal(page.listeners.size, 0, 'synthetic mobile hover cannot leave the strip stuck at a slower speed');
  assert.equal(page.animation.playbackRate, 1);
});

test('browsers without animation inspection keep their CSS animation', () => {
  const page = fixture({ animationsSupported: false });
  assert.equal(page.listeners.size, 0);
  assert.equal(page.animation.playbackRate, 1);
});
