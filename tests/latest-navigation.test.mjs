import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const latest = source.slice(source.indexOf('(function latest()'));
function section(from, to) {
  const start = latest.indexOf(from), end = latest.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Latest source section exists: ${from}`);
  return latest.slice(start, end);
}

function makeWork(coll, index, options = {}) {
  const folders = { logo: 'LogoDesign', official: 'Official', business: 'Businesscard', invoices: 'Invoice', video: 'Videos' };
  const folder = folders[coll] || coll;
  const file = `${coll}${index}.${coll === 'video' ? 'mp4' : 'webp'}`;
  return {
    coll, index, cat: coll, type: coll === 'video' ? 'video' : 'image',
    url: `/media/${folder}/${file}`,
    rawUrl: `https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/${folder}/${file}`,
    width: 800, height: 800, titlePrefix: coll, tag: coll, poster: '', ...options,
  };
}
function fixture(works = []) {
  const events = new Map(), frames = new Map(), timers = new Map();
  let id = 0;
  const navigations = [], opened = [], assigned = [], selectedTabs = [], scrolled = [];
  const tabs = ['all', ...new Set(works.map(work => work.cat))].map(filter => ({
    dataset: { filter }, click() { selectedTabs.push(filter); },
  }));
  const document = {
    body: { dataset: { room: 'bio' } },
    addEventListener(type, fn) {
      const callbacks = events.get(type) || new Set(); callbacks.add(fn); events.set(type, callbacks);
    },
    removeEventListener(type, fn) { events.get(type)?.delete(fn); },
    querySelectorAll(selector) {
      assert.equal(selector, '.tab[data-filter]', 'navigation must not depend on shuffled or paginated work cards');
      return tabs;
    },
    querySelector: selector => ({ selector }),
  };
  const gallery = {
    COLLECTIONS: Object.fromEntries([...new Set(works.map(work => work.coll))].map(coll => [coll, {}])),
    items: coll => works.filter(work => work.coll === coll),
    thumb: url => url.replace('/media/', '/assets/thumbs/'),
  };
  const window = {
    BQ_GALLERY: gallery,
    __bqGoRoom: (route, push) => navigations.push({ route, push }),
    __bqOpenLightboxPool: (pool, index) => opened.push({ pool, index }),
    __bqScrollPaperTarget: (target, options) => scrolled.push({ target, options }),
  };
  const context = {
    window, document, URL,
    location: { origin: 'https://bqurtas.com', assign: url => assigned.push(url) },
    lang: () => 'en', dict: () => ({}),
    esc: value => String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character])),
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: frame => frames.delete(frame),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: timer => timers.delete(timer),
    WEEK: 604800000, pinItems: [], workItems: [], items: [],
    list: { innerHTML: '', querySelectorAll: () => [] }, close() {},
  };
  vm.runInNewContext(
    section('  const galleryWorks = ', '  /* a quiet minute')
      + section('  const goRoom = ', '  const load = ')
      + '\nthis.api = { galleryWorks, findImageWork, normalizeWorkItems, previewImage, goTab, goWork, afterRoom, render };',
    context,
  );
  return {
    context, window, document, api: context.api, navigations, opened, assigned, selectedTabs, scrolled,
    arrive(room) {
      document.body.dataset.room = room;
      for (const fn of [...(events.get('bq:route') || [])]) fn({ detail: { room } });
    },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    expire() { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.fn()); },
    get pendingListeners() { return events.get('bq:route')?.size || 0; },
    get pendingFrames() { return frames.size; },
    get pendingTimers() { return timers.size; },
  };
}

const identities = works => Array.from(works, work => `${work.coll}/${work.index}`);

test('Latest keeps each new canonical work and ignores duplicate paths, aliases and unrelated files', () => {
  const first = makeWork('logo', 29), second = makeWork('logo', 30);
  const film = makeWork('video', 31, { width: 1920, height: 1080, poster: '/assets/thumbs/Videos/video31.jpg' });
  const page = fixture([first, second, film]);
  const result = page.api.normalizeWorkItems([
    'LogoDesign/logo29.webp', 'LogoDesign/logo30.webp', 'LogoDesign/logo29.webp',
    'LogoDesign/duplicate-logo29.webp', 'Videos/video31.mp4', 'preview_site/index.html', null,
  ]);
  assert.deepEqual(identities(result), ['logo/29', 'logo/30', 'video/31']);
  assert.equal(result[2].poster, film.poster);
  assert.equal(result[2].width / result[2].height, 16 / 9);
  assert.equal(page.api.normalizeWorkItems(null).length, 0);
});

test('Latest resolves media, GitHub originals and thumbnails to the same canonical work', () => {
  const item = makeWork('official', 75, { url: '/media/Official/Office%20Poster.webp' });
  const page = fixture([item]);
  for (const source of [item.url, 'https://bqurtas.com' + item.url, item.rawUrl, page.window.BQ_GALLERY.thumb(item.url)]) {
    assert.equal(page.api.findImageWork(source, 'official'), item);
  }
  assert.equal(page.api.findImageWork(item.url, 'logo'), undefined, 'a pin from another category cannot open the wrong work');
  assert.equal(page.api.findImageWork('/media/Official/removed.webp', 'official'), undefined);
  assert.deepEqual(identities(page.api.normalizeWorkItems(['Official/Office Poster.webp'])), ['official/75']);
});

test('Latest renders separate square and portrait works with their original dimensions, and video posters without loading video', () => {
  const square = makeWork('logo', 29);
  const portrait = makeWork('logo', 30, { width: 210, height: 297 });
  const film = makeWork('video', 31, { width: 1920, height: 1080, poster: '/assets/thumbs/Videos/video31.jpg' });
  const page = fixture([square, portrait, film]);
  page.context.workItems = [square, portrait, film];
  page.api.render();
  const html = page.context.list.innerHTML;
  assert.equal((html.match(/data-kind="work"/g) || []).length, 3);
  assert.match(html, /data-coll="logo" data-index="29"/);
  assert.match(html, /data-coll="logo" data-index="30"/);
  assert.match(html, /width="800" height="800"/);
  assert.match(html, /width="210" height="297"/);
  assert.match(html, /src="\/assets\/thumbs\/Videos\/video31\.jpg"/);
  assert.doesNotMatch(html, /src="[^"]+\.mp4"|<video/);
  assert.doesNotMatch(html, /\d+ new/);
});

test('an image preview without catalogue dimensions retains natural sizing and escapes its source', () => {
  const page = fixture();
  assert.equal(page.api.previewImage(''), '');
  const html = page.api.previewImage('/cover.webp?title="special"&next=1');
  assert.match(html, /src="\/cover.webp\?title=&quot;special&quot;&amp;next=1"/);
  assert.doesNotMatch(html, /\s(?:width|height)=/);
});

test('Latest waits for the actual route, selects its tab and opens an exact work beyond the first 40 cards', () => {
  const works = Array.from({ length: 65 }, (_, index) => makeWork('official', index + 1));
  const page = fixture(works);
  page.api.goWork(works[60]);
  assert.deepEqual(page.navigations, [{ route: 'design', push: true }]);
  page.frame();
  assert.equal(page.opened.length, 0, 'an animation frame before arrival is insufficient');
  page.arrive('design');
  assert.equal(page.opened.length, 0, 'wait until route focus and modal cleanup have completed');
  page.frame();
  assert.deepEqual(page.selectedTabs, ['official']);
  assert.equal(page.opened[0].pool.length, 65, 'the whole category is available to lightbox navigation');
  assert.equal(page.opened[0].index, 60);
  assert.equal(page.opened[0].pool[60].full, works[60].url);
  assert.equal(page.opened[0].pool[60].raw, works[60].rawUrl);
  assert.equal(page.scrolled[0].options.behavior, 'auto');
  assert.equal(page.pendingListeners, 0);
  assert.equal(page.pendingTimers, 0);
});

test('merged category destinations use collection plus index and keep the correct media type', () => {
  const business = makeWork('business', 1, { cat: 'stationery' });
  const invoice = makeWork('invoices', 1, { cat: 'stationery' });
  const video = makeWork('video', 3);
  const page = fixture([business, invoice, video]);
  page.api.goWork(invoice); page.arrive('design'); page.frame();
  assert.deepEqual(page.selectedTabs, ['stationery']);
  assert.equal(page.opened[0].index, 1);
  assert.equal(page.opened[0].pool[1].full, invoice.url);
  page.api.goWork(video); page.arrive('design'); page.frame();
  assert.equal(page.opened[1].pool[0].type, 'video');
  assert.equal(page.opened[1].pool[0].full, video.url);
});

test('a newer Latest destination cancels the old route callback and scheduled opening', () => {
  const first = makeWork('logo', 29), second = makeWork('official', 75);
  const page = fixture([first, second]);
  page.api.goWork(first);
  page.arrive('design');
  assert.equal(page.pendingFrames, 1);
  page.api.goWork(second);
  assert.equal(page.pendingFrames, 0, 'the previous modal cannot reopen on the next frame');
  page.arrive('design'); page.frame();
  assert.equal(page.opened.length, 1);
  assert.equal(page.opened[0].pool[page.opened[0].index].full, second.url);
});

test('leaving for another room cancels Latest without later reopening a hidden work', () => {
  const item = makeWork('logo', 29), page = fixture([item]);
  page.api.goWork(item);
  page.arrive('contact'); page.frame();
  page.arrive('design'); page.frame();
  assert.equal(page.opened.length, 0);
  assert.equal(page.pendingListeners, 0);
  page.api.goWork(item); page.arrive('design');
  page.document.body.dataset.room = 'bio'; page.frame();
  assert.equal(page.opened.length, 0, 'also cancel if the destination changes before its animation frame');
});

test('an uncompleted route expires without guessing a timer-based opening', () => {
  const item = makeWork('logo', 29), page = fixture([item]);
  page.api.goWork(item); page.expire(); page.frame();
  assert.equal(page.opened.length, 0);
  assert.equal(page.pendingListeners, 0);
  page.arrive('design'); page.frame();
  assert.equal(page.opened.length, 0);
});

test('a Journal notification opens its selected post after the blog route is ready', () => {
  const page = fixture();
  const posts = [];
  let click;
  page.context.items = [{ id: 27, title: 'A new note', created_at: new Date().toISOString() }];
  page.window.__bqOpenPostSlug = id => posts.push(id);
  page.context.list.querySelectorAll = () => [{
    getAttribute: name => ({ 'data-kind': 'post', 'data-id': '27' }[name] || null),
    addEventListener: (_, callback) => { click = callback; },
  }];
  page.api.render(); click();
  assert.deepEqual(page.navigations, [{ route: 'blog', push: true }]);
  assert.equal(posts.length, 0);
  page.arrive('blog'); page.frame();
  assert.deepEqual(posts, ['27']);
});

test('a pinned preview of an existing work opens that work instead of only its category', () => {
  const item = makeWork('logo', 29), page = fixture([item]);
  let click;
  const preview = page.window.BQ_GALLERY.thumb(item.url);
  page.context.pinItems = [{ image: preview, link: 'logo', title: 'New identity' }];
  page.context.list.querySelectorAll = () => [{
    getAttribute: name => ({ 'data-kind': 'pin', 'data-link': 'logo' }[name] || null),
    querySelector: () => ({ getAttribute: () => preview }),
    addEventListener: (_, callback) => { click = callback; },
  }];
  page.api.render(); click(); page.arrive('design'); page.frame();
  assert.deepEqual(page.selectedTabs, ['logo']);
  assert.equal(page.opened[0].pool[page.opened[0].index].full, item.url);
});

test('missing lightbox support falls back to the exact work URL', () => {
  const item = makeWork('logo', 29), page = fixture([item]);
  delete page.window.__bqOpenLightboxPool;
  page.api.goWork(item); page.arrive('design'); page.frame();
  assert.deepEqual(page.assigned, ['/design/logo/29']);
});
