import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');

function setup({ observers = true, root = null } = {}) {
  const instances = [], posters = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); instances.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
    emit(entries) { this.callback(entries, this); }
  }
  const window = {};
  const context = { window, document: {
    addEventListener() {},
    createElement(tag) {
      assert.equal(tag, 'img');
      const listeners = new Map();
      const poster = { src: '',
        addEventListener(name, callback) { listeners.set(name, callback); },
        emit(name) { listeners.get(name)?.(); },
      };
      posters.push(poster);
      return poster;
    },
  } };
  if (observers) context.IntersectionObserver = Observer;
  vm.runInNewContext(source, context);
  return { controller: window.BQ_GALLERY.createVideoPreviews({ root }), instances, posters, window };
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

test('a film cover loads only its own nearby poster, leaving MP4 and playback untouched', () => {
  const { controller, instances: [prefetch, playback], posters } = setup({ root: {} });
  const media = video();
  const frame = {};
  let ready = 0;
  media.dataset.poster = '/assets/thumbs/Videos/Videos1.jpg';
  media.closest = () => frame;
  controller.observe(media, () => ready++);
  assert.equal(posters.length, 0, 'offscreen cards do not request their frame');
  prefetch.emit([intersects(frame)]);
  prefetch.emit([intersects(frame)]);
  assert.equal(posters.length, 1, 'repeated intersections share one poster load');
  assert.equal(posters[0].src, media.dataset.poster);
  assert.equal(media.src, '', 'a poster must not start an MP4 request or decoder');
  posters[0].emit('load');
  assert.equal(media.poster, media.dataset.poster);
  assert.equal(ready, 1);
  assert.equal(prefetch.targets.size, 0);
  assert.equal(playback.targets.size, 0);
  assert.equal(media.plays, 0);
  controller.play(media);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`, 'actual playback hydrates the original film');
  assert.equal(media.preload, 'metadata');
  assert.equal(media.plays, 1);
});

test('a failed frame falls back once to the film, including after a detached card returns', () => {
  for (const detached of [false, true]) {
    const { controller, instances: [prefetch], posters } = setup();
    const media = video();
    media.dataset.poster = '/assets/thumbs/Videos/Videos1.jpg';
    controller.observe(media);
    prefetch.emit([intersects(media)]);
    media.isConnected = !detached;
    posters[0].emit('error');
    assert.equal(media.src, detached ? '' : `${media.dataset.src}#t=0.1`);
    media.isConnected = true;
    prefetch.emit([intersects(media)]);
    assert.equal(media.src, `${media.dataset.src}#t=0.1`);
    assert.equal(posters.length, 1, 'a broken poster is not retried during scrolling');
    assert.equal(prefetch.targets.size, 0);
  }
});

test('a stale failed poster cannot fetch a forgotten or reset video', () => {
  for (const operation of ['forget', 'reset']) {
    const { controller, instances: [prefetch], posters } = setup();
    const media = video();
    media.dataset.poster = '/assets/thumbs/Videos/Videos1.jpg';
    controller.observe(media);
    prefetch.emit([intersects(media)]);
    controller[operation](media);
    posters[0].emit('error');
    assert.equal(media.src, '', operation);
    assert.equal(prefetch.targets.size, 0);
  }
});

test('late poster success does not pause or stop tracking a preview already playing', () => {
  const { controller, instances: [prefetch, playback], posters } = setup();
  const media = video();
  media.dataset.poster = '/assets/thumbs/Videos/Videos1.jpg';
  controller.observe(media);
  prefetch.emit([intersects(media)]);
  controller.play(media);
  posters[0].emit('load');
  assert.equal(media.paused, false);
  assert.equal(playback.targets.has(media), true);
  assert.equal(media.plays, 1);
});

test('video prefetch uses the clipped gallery root and its sized card frame', () => {
  const root = {};
  const { controller, instances: [prefetch, playback] } = setup({ root });
  const media = video();
  const frame = {};
  media.closest = selector => selector === '.card-art' ? frame : null;
  controller.observe(media);
  assert.equal(prefetch.options.root, root, 'prefetch margin must extend the gallery viewport instead of being clipped by it');
  assert.equal(prefetch.options.rootMargin, '1200px 0px');
  assert.equal(prefetch.targets.has(frame), true, 'the sized frame remains observable while its video contents are skipped');
  assert.equal(prefetch.targets.has(media), false);
  assert.equal(playback.options?.root ?? null, null, 'playback visibility must still use the browser viewport');
  prefetch.emit([intersects(frame)]);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`);
  assert.equal(prefetch.targets.size, 0, 'the frame is unobserved after its video hydrates');
  assert.equal(playback.targets.size, 0, 'prefetch must not start playback tracking');
});

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
  const frame = {};
  media.closest = () => frame;
  controller.observe(media);
  media.isConnected = false;
  prefetch.emit([intersects(frame)]);
  assert.equal(media.src, '');
  assert.equal(prefetch.targets.has(frame), true);
  media.isConnected = true;
  prefetch.emit([intersects(frame)]);
  assert.equal(media.src, `${media.dataset.src}#t=0.1`);
  assert.equal(prefetch.targets.has(frame), false);
});

test('playing a preview removes its frame prefetch and observes only the video for playback', () => {
  const { controller, instances: [prefetch, playback] } = setup({ root: {} });
  const media = video();
  const frame = {};
  media.closest = () => frame;
  controller.observe(media);
  controller.play(media);
  assert.equal(prefetch.targets.size, 0);
  assert.equal(playback.targets.has(media), true);
  assert.equal(playback.targets.has(frame), false);
  assert.equal(media.plays, 1);
  playback.emit([{ target: media, isIntersecting: false }]);
  assert.equal(media.paused, true);
  assert.equal(playback.targets.size, 0);
});

test('forgetting or resetting a card discards queued frame-prefetch records', () => {
  for (const operation of ['forget', 'reset']) {
    const { controller, instances: [prefetch] } = setup();
    const media = video();
    const frame = {};
    media.closest = () => frame;
    controller.observe(media);
    controller[operation](media);
    assert.equal(prefetch.targets.size, 0, `${operation} must remove frame observation`);
    prefetch.emit([intersects(frame)]);
    assert.equal(media.src, '', `${operation} must discard its target-to-video mapping`);
    controller.observe(media);
    prefetch.emit([intersects(frame)]);
    assert.equal(media.src, `${media.dataset.src}#t=0.1`, 'a returning card can be observed again');
  }
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
