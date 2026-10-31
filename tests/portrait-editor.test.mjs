import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { PORTRAIT_SIZES } from '../functions/api/_portrait.js';
import { BUNDLED_PORTRAIT_VARIANTS } from '../functions/_portrait-variants.js';

const authored = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = authored.indexOf('    const PORTRAIT_I18N =');
const end = authored.indexOf('    const renderProfile =', start);
assert.ok(start > 0 && end > start);
const source = authored.slice(start, end) + '\nglobalThis.render = renderWebsitePortrait; globalThis.apply = applyWebsitePortrait;';
const original = '/assets/hero-sketch.webp?v=original';
const published = { url:'/api/portrait?image=' + 'a'.repeat(64), width:900, height:1200 };

function node() {
  const handlers = new Map();
  return { value:'', innerHTML:'', textContent:'', src:'', files:[], disabled:false, dataset:{},
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type, event = {}) { return handlers.get(type)?.(event); },
    getAttribute(name) { return this[name]; }
  };
}

function fixture({ resize = async () => 'prepared-webp', api = async () => ({ ok:true, portrait:published }), get = async () => ({ ok:true, portrait:null }) } = {}) {
  const nodes = Object.fromEntries(['websitePortrait', 'portraitFile', 'portraitPublish', 'portraitReset', 'portraitPreview', 'portraitStatus', 'portraitConnect', 'portraitPreviewDark', 'portraitDarkMode', 'portraitAppearance'].map(id => ['#' + id, node()]));
  const connectionInput = node(), connectionButton = node();
  nodes['#portraitConnect'].querySelector = selector => selector === 'input' ? connectionInput : connectionButton;
  const images = [0, 1].map(() => ({ ...node(), src:original, width:768, height:768, dataset:{} }));
  const calls = [], preparations = [], getTokens = [];
  const store = new Map([['bq_edit_token', 'fixture-editor']]);
  let present = true;
  const context = {
    $:selector => present ? nodes[selector] : null,
    document:{ querySelector:() => images[0], querySelectorAll:() => images },
    curLang:() => 'en', editToken:() => store.get('bq_edit_token') || '', esc:value => String(value),
    sessionStorage:{ setItem:(key, value) => store.set(key, value), removeItem:key => store.delete(key) },
    studioCall:async (service, payload) => {
      assert.equal(service, 'site-portrait');
      if (payload.action === 'get') { getTokens.push(store.get('bq_edit_token')); return get(); }
      calls.push(payload); return api(payload);
    },
    cmsResize:async (...args) => { preparations.push(args); return resize(...args); }
  };
  vm.runInNewContext(source, context);
  context.render();
  nodes['#portraitPublish'].disabled = true;
  return { nodes, images, calls, preparations, store, getTokens, connectionInput, connectionButton, apply:context.apply,
    choose:file => { nodes['#portraitFile'].files = file ? [file] : []; return nodes['#portraitFile'].fire('change'); },
    publish:() => nodes['#portraitPublish'].fire('click'),
    appearance:() => nodes['#portraitAppearance'].fire('click'),
    darkMode:value => { nodes['#portraitDarkMode'].value = value; return nodes['#portraitDarkMode'].fire('change'); },
    reset:() => nodes['#portraitReset'].fire('click'),
    connect:token => { connectionInput.value = token; return nodes['#portraitConnect'].fire('submit', { preventDefault() {} }); },
    leave:() => { present = false; }
  };
}

const photo = (props = {}) => ({ name:'portrait.png', type:'image/png', size:200000, ...props });

test('portrait selection previews locally and publishes once, updating both public portraits', async () => {
  let complete;
  const f = fixture({ api:() => new Promise(resolve => { complete = resolve; }) });
  await f.choose(photo());
  assert.equal(f.calls.length, 0, 'selection must not publish before review');
  assert.equal(f.nodes['#portraitPreview'].src, 'data:image/webp;base64,prepared-webp');
  assert.equal(f.nodes['#portraitPublish'].disabled, false);
  const saving = f.publish(); await f.publish();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].action, 'publish');
  assert.equal(f.calls[0].contentType, 'image/webp');
  assert.equal(f.nodes['#portraitFile'].disabled, true);
  complete({ ok:true, portrait:published }); await saving;
  for (const image of f.images) {
    assert.equal(image.src, published.url);
    assert.equal(image.width, 900);
    assert.equal(image.height, 1200);
    assert.equal(image.dataset.portraitDefault, original);
  }
  assert.equal(f.nodes['#portraitPublish'].disabled, true);
  assert.equal(f.nodes['#portraitFile'].disabled, false);
  assert.match(f.nodes['#portraitStatus'].textContent, /published/);
});

test('failed publication keeps the prepared image available for retry without changing the public portrait', async () => {
  let succeed = false;
  const f = fixture({ api:async () => succeed ? { ok:true, portrait:published } : { error:'unavailable', detail:'Publishing is temporarily unavailable.' } });
  await f.choose(photo()); await f.publish();
  assert.equal(f.images[0].src, original);
  assert.equal(f.nodes['#portraitPublish'].disabled, false);
  assert.match(f.nodes['#portraitPreview'].src, /^data:image\/webp/);
  assert.match(f.nodes['#portraitStatus'].textContent, /temporarily unavailable/);
  succeed = true; await f.publish();
  assert.equal(f.calls.length, 2);
  assert.equal(f.images[0].src, published.url);
});

test('invalid and oversized files clear the previous selection and cannot publish it', async () => {
  for (const invalid of [photo({ type:'image/svg+xml' }), photo({ size:24 * 1024 * 1024 + 1 })]) {
    const f = fixture(); await f.choose(photo()); const preparations = f.preparations.length;
    await f.choose(invalid); await f.publish();
    assert.equal(f.calls.length, 0);
    assert.equal(f.preparations.length, preparations, 'reject before image decoding');
    assert.equal(f.nodes['#portraitPublish'].disabled, true);
    assert.match(f.nodes['#portraitStatus'].textContent, /under 24 MB/);
  }
});

test('portrait preparation bounds encoded size before sending to the server', async () => {
  const f = fixture({ resize:async () => 'x'.repeat(1333336) });
  await f.choose(photo()); await f.publish();
  assert.deepEqual(f.preparations.map(args => args[1]), [1200, 960]);
  assert.equal(f.calls.length, 0);
  assert.equal(f.nodes['#portraitPublish'].disabled, true);
  assert.match(f.nodes['#portraitStatus'].textContent, /too large after preparation/);
});

test('late image preparation cannot update a replaced dashboard view', async () => {
  let complete;
  const f = fixture({ resize:() => new Promise(resolve => { complete = resolve; }) });
  const preparing = f.choose(photo()); f.leave(); complete('late-image'); await preparing;
  assert.equal(f.nodes['#portraitPreview'].src, original, 'late preparation must leave the current portrait intact');
  assert.equal(f.calls.length, 0);
  assert.equal(f.images[0].src, original);
});

test('reset restores bundled sources and dimensions even after server-rendered custom portraits', async () => {
  const f = fixture({ api:async () => ({ ok:true, portrait:null }) });
  for (const image of f.images) {
    image.src = published.url;
    image.dataset = { portraitDefault:original, portraitDefaultWidth:'640', portraitDefaultHeight:'800' };
    image.width = 900; image.height = 1200;
  }
  await f.reset();
  assert.equal(f.calls[0].action, 'reset');
  for (const image of f.images) {
    assert.equal(image.src, original);
    assert.equal(image.width, 640); assert.equal(image.height, 800);
  }
  assert.match(f.nodes['#portraitStatus'].textContent, /restored/);
});

test('public portrait changes accept only the versioned first-party image endpoint', () => {
  const f = fixture();
  for (const url of ['https://third-party.test/image.webp', '/api/portrait?image=invalid', 'javascript:alert(1)']) {
    assert.equal(f.apply({ ...published, url }), false);
    assert.equal(f.images[0].src, original);
  }
});

test('portrait updates and reset keep responsive sources in sync with the selected image', () => {
  const f = fixture();
  f.images.forEach(image => { image.srcset = '/assets/original-small.webp 400w'; image.sizes = '50vw'; });
  const variants = [{ url:'/api/portrait?image=' + 'b'.repeat(64), width:480, height:640 }];
  assert.equal(f.apply({ ...published, variants }), true);
  for (const image of f.images) {
    assert.equal(image.srcset, `${variants[0].url} 480w, ${published.url} 900w`);
    assert.match(image.sizes, /max-width: 820px/);
  }
  assert.equal(f.apply({ ...published, variants:[{ ...variants[0], url:'https://other.test/image.webp' }] }), false);
  f.apply(null);
  for (const image of f.images) {
    assert.equal(image.src, original);
    assert.equal(image.srcset, '/assets/original-small.webp 400w');
    assert.equal(image.sizes, '50vw');
  }
  f.apply(published);
  assert.equal(f.images[0].srcset, '', 'an upload with no renditions cannot retain the default portrait sources');
});

test('the editor accepts every bundled rendition and retains the server/preload source sizes', () => {
  const f = fixture();
  const [hash, variants] = Object.entries(BUNDLED_PORTRAIT_VARIANTS)[0];
  const portrait = { url:'/api/portrait?image=' + hash, width:1200, height:1200, variants };
  assert.equal(f.apply(portrait), true);
  for (const image of f.images) {
    assert.equal(image.sizes, PORTRAIT_SIZES);
    assert.equal(image.srcset, [...variants.map(item => `${item.url} ${item.width}w`), `${portrait.url} 1200w`].join(', '));
  }
  f.apply(null);
  assert.equal(f.images[0].src, original);
  assert.equal(f.images[0].srcset, '');
});

test('portrait preparation includes smaller renditions inside the existing total upload budget', async () => {
  const f = fixture({ resize:async (_file, width) => 'x'.repeat(width === 1200 ? 600_000 : width === 640 ? 200_000 : 400_000) });
  await f.choose(photo()); await f.publish();
  assert.deepEqual(f.preparations.map(args => args[1]), [1200,640,960]);
  assert.deepEqual(Array.from(f.calls[0].variants, item => item.dataB64.length), [200_000,400_000]);
  const bounded = fixture({ resize:async (_file, width) => 'x'.repeat(width === 1200 ? 1_200_000 : 300_000) });
  await bounded.choose(photo()); await bounded.publish();
  assert.equal(bounded.calls[0].variants, undefined, 'optional variants cannot exceed the original request budget');
});

test('an optional rendition failure cannot disable publication of a prepared original', async () => {
  const f = fixture({ resize:async (_file, width) => { if (width === 640) throw new Error('canvas failure'); return 'prepared-webp'; } });
  await f.choose(photo()); await f.publish();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].dataB64, 'prepared-webp');
  assert.equal(f.calls[0].variants, undefined);
});

test('a stale editor credential on initial load presents a usable reconnect form', async () => {
  let calls = 0;
  const f = fixture({ get:async () => ++calls === 1 ? { error:'unauthorized' } : { ok:true, portrait:null } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.store.has('bq_edit_token'), false);
  assert.match(f.nodes['#websitePortrait'].innerHTML, /id="portraitConnect"/);
  assert.match(f.nodes['#websitePortrait'].innerHTML, /editor password is incorrect/);
  assert.doesNotMatch(f.nodes['#websitePortrait'].innerHTML, /id="portraitFile"/);
  await f.connect('replacement-editor');
  assert.equal(f.connectionInput.value, '', 'the password field is cleared immediately');
  assert.equal(f.connectionButton.disabled, false);
  assert.equal(f.getTokens[1], 'replacement-editor');
  assert.match(f.nodes['#websitePortrait'].innerHTML, /id="portraitFile"/);
});

test('publication authorization failure removes the stale credential and reopens the editor gate', async () => {
  const f = fixture({ api:async () => ({ error:'unauthorized' }) });
  await f.choose(photo()); await f.publish();
  assert.equal(f.calls.length, 1);
  assert.equal(f.store.has('bq_edit_token'), false);
  assert.match(f.nodes['#websitePortrait'].innerHTML, /id="portraitConnect"/);
  assert.match(f.nodes['#websitePortrait'].innerHTML, /editor password is incorrect/);
  assert.doesNotMatch(f.nodes['#websitePortrait'].innerHTML, /id="portraitPublish"/);
  assert.equal(f.images[0].src, original, 'failed authorization cannot alter the public image');
});


test('dark portrait appearance previews both modes and saves without uploading the image again', async () => {
  const f = fixture({ get:async () => ({ ok:true, portrait:{ ...published, dark_mode:'invert' } }),
    api:async body => ({ ok:true, portrait:{ ...published, dark_mode:body.dark_mode } }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.nodes['#portraitPreviewDark'].dataset.darkMode, 'invert');
  assert.equal(f.nodes['#portraitPreview'].src, published.url);
  assert.equal(f.nodes['#portraitPreviewDark'].src, published.url);
  f.darkMode('original');
  assert.equal(f.nodes['#portraitPreviewDark'].dataset.darkMode, 'original');
  assert.equal(f.images[0].dataset.portraitDarkMode, 'invert', 'preview must not publish a draft');
  assert.equal(f.nodes['#portraitAppearance'].disabled, false);
  await f.appearance();
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)), [{ action:'appearance', dark_mode:'original' }]);
  assert.equal(f.preparations.length, 0);
  assert.equal(f.images[0].dataset.portraitDarkMode, 'original');
  assert.equal(f.images[1].dataset.portraitDarkMode, 'original');
  assert.equal(f.nodes['#portraitAppearance'].disabled, true);
});

test('new portrait publishes the selected dark treatment and keeps both previews in sync', async () => {
  const f = fixture(); await f.choose(photo()); f.darkMode('original');
  assert.equal(f.nodes['#portraitPreviewDark'].src, f.nodes['#portraitPreview'].src);
  assert.equal(f.nodes['#portraitPreviewDark'].dataset.darkMode, 'original');
  assert.equal(f.nodes['#portraitAppearance'].disabled, true, 'unpublished image settings are included in Publish');
  await f.publish(); assert.equal(f.calls[0].dark_mode, 'original');
});

test('restoring the photographic fallback removes dark inversion markers', async () => {
  const f = fixture({ get:async () => ({ ok:true, portrait:published }), api:async () => ({ ok:true, portrait:null }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.images[0].dataset.portraitDarkMode, 'invert');
  await f.reset();
  for (const image of f.images) {
    assert.equal(image.dataset.portraitDarkMode, undefined);
    assert.equal(image.dataset.publicPortrait, undefined);
  }
  assert.equal(f.nodes['#portraitPreviewDark'].dataset.darkMode, 'original');
});
