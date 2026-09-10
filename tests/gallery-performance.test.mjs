import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');

function setup({ observers = true } = {}) {
  const instances = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); instances.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
    emit(entries) { this.callback(entries, this); }
  }
  const window = {};
  const context = { window, document: { addEventListener() {} } };
  if (observers) context.IntersectionObserver = Observer;
  vm.runInNewContext(source, context);
  return { controller: window.BQ_GALLERY.createVideoPreviews(), instances, window };
}

function video(index = 1) {
  const listeners = new Map();
  return {
    isConnected: true, src: '', paused: true, plays: 0, pauses: 0,
    dataset: { src: `https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main/Videos/Videos${index}.mp4` },
    addEventListener(name, callback) { listeners.set(name, callback); },
    emit(name) { listeners.get(name)?.(); },
    play() { this.paused = false; this.plays++; return Promise.resolve(); },
    pause() { this.paused = true; this.pauses++; this.emit('pause'); },
  };
}

const intersects = target => ({ target, isIntersecting: true });

test('hydrated video covers leave the prefetch observer without changing their first-frame source', () => {
  const { controller, instances: [prefetch, playback] } = setup();
  const videos = Array.from({ length: 30 }, (_, index) => video(index + 1));
  videos.forEach(controller.observe);
  assert.equal(prefetch.options.rootMargin, '1200px 0px');
  prefetch.emit(videos.slice(0, 8).map(intersects));
  assert.equal(prefetch.targets.size, 22);
  assert.equal(playback.targets.size, 0, 'paused covers require no playback visibility tracking');
  videos.slice(0, 8).forEach(media => assert.equal(media.src, `${media.dataset.src}#t=0.1`));
  videos.slice(8).forEach(media => assert.equal(media.src, ''));
  prefetch.emit(videos.slice(8).map(intersects));
  assert.equal(prefetch.targets.size, 0, 'scrolling past loaded covers must not keep notifying JavaScript');
});

test('stale intersection records do not fetch detached cards and returning cards still hydrate', () => {
  const { controller, instances: [prefetch] } = setup();
  const media = video();
  controller.observe(media);
  media.isConnected = false;
  prefetch.emit([intersects(media)]);
  assert.equal(media.src, '');
  assert.equal(prefetch.targets.has(media), true);
  media.isConnected = true;
  prefetch.emit([intersects(media)]);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`);
  assert.equal(prefetch.targets.has(media), false);
});

test('only actively playing previews need viewport checks or global pause work', () => {
  const { controller, instances: [prefetch, playback], window } = setup();
  // A global pause must not read the gallery catalogue or query every image card.
  Object.defineProperty(window, 'BQ_ALL_CARDS', { get() { throw new Error('full catalogue scanned'); } });
  const media = video();
  controller.observe(media);
  controller.play(media);
  assert.equal(prefetch.targets.has(media), false);
  assert.equal(playback.targets.has(media), true);
  playback.emit([{ target: media, isIntersecting: false }]);
  assert.equal(media.pauses, 1);
  assert.equal(playback.targets.size, 0);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`, 'keep the decoded cover and cached source');
  controller.pauseAll();
  assert.equal(media.pauses, 1, 'already paused covers need no additional media operations');
});

test('a queued pause event from an earlier hover cannot stop tracking resumed playback', () => {
  const { controller, instances: [, playback] } = setup();
  const media = video();
  controller.observe(media);
  controller.play(media);
  controller.pause(media);
  controller.play(media);
  media.emit('pause'); // an earlier pause event can arrive after play resumes
  assert.equal(playback.targets.has(media), true);
  controller.pauseAll();
  assert.equal(media.paused, true);
  assert.equal(playback.targets.size, 0);
});

test('refresh clears observers and playing previews while preserving already selected fallback URLs', () => {
  const { controller, instances: [prefetch, playback] } = setup();
  const current = video();
  const pending = video(2);
  current.src = 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos1.mp4';
  controller.observe(current); controller.observe(pending);
  controller.play(current);
  assert.equal(current.src, 'https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/Videos/Videos1.mp4');
  controller.reset();
  assert.equal(current.paused, true);
  assert.equal(prefetch.targets.size, 0);
  assert.equal(playback.targets.size, 0);
});

test('browsers without intersection observers retain immediate video source loading', () => {
  const { controller } = setup({ observers: false });
  const media = video(); media.isConnected = false;
  controller.observe(media);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`);
});
