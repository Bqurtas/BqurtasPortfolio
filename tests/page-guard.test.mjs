import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { PAGE_GUARD_JS } from '../functions/_page-guard.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

/* A minimal DOM: elements answer closest() from their own selector list and
   their ancestors', which is all the guard asks of them. */
function element(matches, parent = null, inside = []) {
  return {
    querySelector(selector) {
      const wanted = selector.split(',').map((part) => part.trim());
      return inside.find((name) => wanted.includes(name)) ? {} : null;
    },
    closest(selector) {
      const wanted = selector.split(',').map((part) => part.trim());
      for (let node = this; node; node = node.parent) {
        if (node.matches.some((name) => wanted.includes(name))) return node;
      }
      return null;
    },
    matches, parent,
  };
}

function guard({ coarse = false, platform = 'MacIntel' } = {}) {
  const listeners = {};
  const target = (scope) => ({
    addEventListener(type, handler, capture) {
      assert.equal(capture, true, `${scope} ${type} listens in the capture phase`);
      listeners[type] = handler;
    },
  });
  const window = { ...target('window'), navigator: { platform }, matchMedia: () => ({ matches: coarse }) };
  vm.runInNewContext(PAGE_GUARD_JS, { window, document: target('document') });
  const fire = (type, init) => {
    const event = { ...init, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
    listeners[type](event);
    return event;
  };
  return { fire, window, listeners };
}

const body = element(['body']);
const dash = element(['#dash'], body);
const cardLink = element(['a'], body, ['img']);
const image = element(['img'], cardLink);
const textLink = element(['a'], body);
const video = element(['video'], body);
const input = element(['input'], body);
const textarea = element(['textarea'], body);
const dashField = element(['textarea'], dash);
const editor = element(['[contenteditable]:not([contenteditable="false"])'], dash);

test('the site and the archive carry the guard verbatim', async () => {
  for (const path of ['preview_site/js/main.js', 'preview_site/js/archive.js']) {
    assert.ok((await read(path)).includes(PAGE_GUARD_JS), `${path} must carry functions/_page-guard.js verbatim`);
  }
});

test('right-click opens no browser menu on artwork, links or the page', () => {
  const { fire } = guard();
  for (const target of [image, video, body, dash, input, textarea]) {
    assert.equal(fire('contextmenu', { target, pointerType: 'mouse' }).defaultPrevented, true);
  }
  // A text node target (no closest) is still covered.
  assert.equal(fire('contextmenu', { target: {}, pointerType: 'mouse' }).defaultPrevented, true);
});

test('text fields keep their menu on a touch screen and in the Studio dashboard', () => {
  const desktop = guard();
  assert.equal(desktop.fire('contextmenu', { target: dashField, pointerType: 'mouse' }).defaultPrevented, false);
  assert.equal(desktop.fire('contextmenu', { target: editor, pointerType: 'mouse' }).defaultPrevented, false);
  assert.equal(desktop.fire('contextmenu', { target: input, pointerType: 'touch' }).defaultPrevented, false);
  assert.equal(desktop.fire('contextmenu', { target: dash, pointerType: 'mouse' }).defaultPrevented, true,
    'the dashboard itself is not exempt — only its text fields');

  const phone = guard({ coarse: true });
  assert.equal(phone.fire('contextmenu', { target: textarea }).defaultPrevented, false);
  assert.equal(phone.fire('contextmenu', { target: image }).defaultPrevented, true, 'a long-press on artwork stays closed');
});

test('artwork cannot be dragged out of the page; text still can', () => {
  const { fire } = guard();
  assert.equal(fire('dragstart', { target: image }).defaultPrevented, true);
  assert.equal(fire('dragstart', { target: video }).defaultPrevented, true);
  assert.equal(fire('dragstart', { target: cardLink }).defaultPrevented, true,
    'a gallery card drags as its link, carrying the image inside it');
  assert.equal(fire('dragstart', { target: textLink }).defaultPrevented, false);
  assert.equal(fire('dragstart', { target: body }).defaultPrevented, false, 'nothing to carry, nothing blocked');
  assert.equal(fire('dragstart', { target: {} }).defaultPrevented, false);
});

const swallowed = (platform, keys) => {
  const event = guard({ platform }).fire('keydown', keys);
  assert.equal(event.defaultPrevented, event.stopped, JSON.stringify(keys));
  return event.defaultPrevented;
};

test('DevTools, view-source and save-page shortcuts are swallowed on a Mac', () => {
  const blocked = [
    { code: 'F12', key: 'F12' }, { code: 'F12', key: 'F12', shiftKey: true },
    ...['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyE'].flatMap((code) => [
      { code, metaKey: true, shiftKey: true }, { code, metaKey: true, altKey: true },
    ]),
    { code: 'KeyU', metaKey: true }, { code: 'KeyU', metaKey: true, altKey: true }, { code: 'KeyS', metaKey: true },
  ];
  for (const keys of blocked) assert.equal(swallowed('MacIntel', keys), true, JSON.stringify(keys));
});

test('DevTools, view-source and save-page shortcuts are swallowed on Windows and Linux', () => {
  for (const platform of ['Win32', 'Linux x86_64']) {
    const blocked = [
      { code: 'F12', key: 'F12' },
      ...['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyE'].map((code) => ({ code, ctrlKey: true, shiftKey: true })),
      { code: 'KeyU', ctrlKey: true }, { code: 'KeyS', ctrlKey: true },
    ];
    for (const keys of blocked) assert.equal(swallowed(platform, keys), true, `${platform} ${JSON.stringify(keys)}`);
  }
});

test('ordinary keys, typing and the site shortcuts are untouched', () => {
  const everywhere = [
    { code: 'KeyS', shiftKey: true, key: 'S' }, { code: 'KeyI', key: 'i' },    // typing
    { code: 'Escape', key: 'Escape' }, { code: 'ArrowDown', key: 'ArrowDown' },
    { code: 'Tab', key: 'Tab', shiftKey: true }, { code: 'Enter', key: 'Enter' },
    { key: 'Unidentified' },
  ];
  const mac = [
    ...everywhere,
    { code: 'KeyB', metaKey: true },                                          // opens the Studio dashboard
    { code: 'KeyC', metaKey: true }, { code: 'KeyV', metaKey: true }, { code: 'KeyA', metaKey: true },
    { code: 'KeyS', metaKey: true, shiftKey: true },
    { code: 'KeyE', ctrlKey: true, shiftKey: true },                          // Cocoa: select to end of line
    { code: 'KeyS', ctrlKey: true }, { code: 'KeyU', ctrlKey: true },
  ];
  const windows = [
    ...everywhere,
    { code: 'KeyB', ctrlKey: true },
    { code: 'KeyC', ctrlKey: true }, { code: 'KeyV', ctrlKey: true }, { code: 'KeyA', ctrlKey: true },
    { code: 'KeyS', ctrlKey: true, shiftKey: true },
    // AltGr arrives as Ctrl+Alt: Polish (Programmers) types Ę and Ć this way.
    { code: 'KeyE', ctrlKey: true, altKey: true, shiftKey: true, key: 'Ę' },
    { code: 'KeyC', ctrlKey: true, altKey: true, shiftKey: true, key: 'Ć' },
    { code: 'KeyS', ctrlKey: true, altKey: true, key: 'ś' },
    { code: 'KeyI', metaKey: true, altKey: true },                            // the Mac combo means nothing here
  ];
  for (const keys of mac) assert.equal(swallowed('MacIntel', keys), false, `Mac ${JSON.stringify(keys)}`);
  for (const keys of windows) assert.equal(swallowed('Win32', keys), false, `Windows ${JSON.stringify(keys)}`);
});

test('running a second copy on the same page adds no second set of listeners', () => {
  const listeners = [];
  const target = { addEventListener: (type) => listeners.push(type) };
  const context = { window: { ...target, matchMedia: () => ({ matches: false }) }, document: target };
  vm.runInNewContext(PAGE_GUARD_JS, context);
  vm.runInNewContext(PAGE_GUARD_JS, context);
  assert.deepEqual(listeners.sort(), ['contextmenu', 'dragstart', 'keydown']);
});
