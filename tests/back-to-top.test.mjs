import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { BACK_TO_TOP_HTML, BACK_TO_TOP_JS, BACK_TO_TOP_STYLE } from '../functions/_back-to-top.js';
import { buildMediaArchive } from '../scripts/generate-media-archive.mjs';

function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) || []), callback]); },
    fire(type, event = {}) { for (const callback of listeners.get(type) || []) callback(event); }
  };
}
function fixture({ reduced = false, reader = false, initial = 0 } = {}) {
  const names = new Set(); const queue = new Map(); const scrolls = []; let next = 0;
  const control = { ...events(), attrs:{}, classList:{
    contains:name => names.has(name), add:name => names.add(name),
    toggle(name, enabled) { if (enabled) names.add(name); else names.delete(name); }
  }, setAttribute(name, value) { this.attrs[name] = value; } };
  const scroller = { ...events(), scrollTop:initial, scrollTo(options) { scrolls.push(options); this.scrollTop = options.top; this.fire('scroll'); } };
  const document = { ...events(), hidden:false, querySelector:() => control, scrollingElement:scroller };
  const window = { ...events(), scrollY:initial, matchMedia:() => ({ matches:reduced }),
    scrollTo(options) { scrolls.push(options); this.scrollY = options.top; this.fire('scroll'); }
  };
  return { control, scroller, window, document, scrolls, queue,
    context:{ window, document, rd:{ top:control, scroll:scroller }, requestAnimationFrame:callback => { queue.set(++next, callback); return next; } },
    flush() { const pending = [...queue.values()]; queue.clear(); pending.forEach(callback => callback()); assert.equal(queue.size, 0); },
    scroll(value) { if (reader) { scroller.scrollTop = value; scroller.fire('scroll'); } else { window.scrollY = value; window.fire('scroll'); } this.flush(); },
    click() { let prevented = false; control.fire('click', { button:0, preventDefault() { prevented = true; } }); this.flush(); return prevented; }
  };
}

for (const reduced of [false, true]) test(`standalone back-to-top respects ${reduced ? 'reduced' : 'normal'} motion, restoration and mobile bounce`, () => {
  const page = fixture({ reduced }); vm.runInNewContext(BACK_TO_TOP_JS, page.context);
  assert.equal(page.control.classList.contains('is-shown'), false); assert.equal(page.control.tabIndex, -1);
  page.scroll(220);
  assert.equal(page.control.classList.contains('is-shown'), true); assert.equal(page.control.attrs['aria-hidden'], 'false');
  for (const top of [159, 120, 50, 1200, 1250, 1200]) {
    page.scroll(top); assert.equal(page.control.classList.contains('is-shown'), true);
  }
  assert.equal(page.click(), true);
  assert.equal(page.scrolls[0].top, 0); assert.equal(page.scrolls[0].behavior, reduced ? 'auto' : 'smooth');
  for (const top of [-30, -80, 0]) { page.scroll(top); assert.equal(page.control.classList.contains('is-shown'), false); }
  page.window.scrollY = 700; page.window.fire('pageshow'); page.flush();
  assert.equal(page.control.classList.contains('is-shown'), true);
  page.window.scrollY = 0; page.document.fire('visibilitychange'); page.flush();
  assert.equal(page.control.classList.contains('is-shown'), false);
  assert.equal(page.queue.size, 0, 'no permanent polling loop');
});

test('every standalone archive has a native top anchor and clearance for footer links', async () => {
  const manifest = JSON.parse(await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url), 'utf8'));
  const archive = buildMediaArchive(manifest);
  for (const [path, html] of archive.files) {
    if (!path.endsWith('.html')) continue;
    assert.ok(html.includes(BACK_TO_TOP_HTML), `${path} contains the back-to-top anchor`);
    assert.ok(html.indexOf(BACK_TO_TOP_HTML) > html.indexOf('</footer>'), 'fixed control must be outside the archive footer reveal transform');
    assert.match(html, /<body id="page-top">/);
    assert.ok(html.includes(BACK_TO_TOP_STYLE));
  }
  assert.match(BACK_TO_TOP_STYLE, /padding-bottom:calc\(76px \+ env\(safe-area-inset-bottom/);
});

const enhance = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = enhance.indexOf('(function readerGoUp() {');
const end = enhance.indexOf('\n    })();', start);
assert.ok(start > 0 && end > start);
const readerCode = enhance.slice(start, end + '\n    })();'.length);

for (const reduced of [false, true]) test(`journal reader uses its own scroll container and ${reduced ? 'reduced' : 'normal'} motion`, () => {
  const page = fixture({ reduced, reader:true }); vm.runInNewContext(readerCode, page.context);
  page.window.scrollY = 2000;
  page.scroll(220);
  assert.equal(page.control.classList.contains('is-shown'), true, 'shorter scrollable articles expose the control too');
  for (const top of [159, 80, 50]) { page.scroll(top); assert.equal(page.control.classList.contains('is-shown'), true); }
  page.click();
  assert.equal(page.scroller.scrollTop, 0); assert.equal(page.window.scrollY, 2000, 'the document behind the reader is unchanged');
  assert.equal(page.scrolls[0].behavior, reduced ? 'auto' : 'smooth');
  assert.equal(page.control.classList.contains('is-shown'), false); assert.equal(page.control.tabIndex, -1);
  page.scroller.scrollTop = 350; page.window.fire('pageshow'); page.flush();
  assert.equal(page.control.classList.contains('is-shown'), true);
});

const main = await readFile(new URL('../preview_site/js/main.js', import.meta.url), 'utf8');
const coreStart = main.indexOf('(function globalGoUp() {');
const coreEnd = main.indexOf('\n})();', coreStart);
assert.ok(coreStart > 0 && coreEnd > coreStart);
const coreCode = main.slice(coreStart, coreEnd + '\n})();'.length);

for (const reduced of [false, true]) test(`core go-up survives room/menu restoration with ${reduced ? 'reduced' : 'normal'} motion`, () => {
  const page = fixture({ reduced, initial: 600 });
  const ring = { style: {} };
  Object.assign(page.document, {
    body: { dataset: { room: 'design' } },
    documentElement: { scrollHeight: 6000, clientHeight: 800 },
    getElementById: id => ({ toTop: page.control, toTopProg: ring })[id] || null
  });
  page.window.innerHeight = 800;
  vm.runInNewContext(coreCode, page.context);
  assert.equal(page.control.classList.contains('is-shown'), true);
  for (const top of [170, 150, 80, 41, 1900, 4500, 4490]) {
    page.scroll(top);
    assert.equal(page.control.classList.contains('is-shown'), true, `remains visible at ${top}px`);
  }
  page.window.scrollY = 0;
  page.scroller.scrollTop = 600; // the document offset can lag during Safari restoration
  page.document.fire('bq:route'); page.flush();
  assert.equal(page.control.classList.contains('is-shown'), false);
  assert.equal(page.control.tabIndex, -1);
  page.window.scrollY = 1700;
  page.document.fire('bq:menu-closed'); page.flush();
  assert.equal(page.control.classList.contains('is-shown'), true);
  assert.equal(page.control.attrs['aria-hidden'], 'false');
  page.control.fire('click'); page.flush();
  assert.equal(page.scrolls.at(-1).top, 0);
  assert.equal(page.scrolls.at(-1).behavior, reduced ? 'auto' : 'smooth');
  assert.equal(page.control.classList.contains('is-shown'), false);
  assert.equal(page.queue.size, 0);
});
