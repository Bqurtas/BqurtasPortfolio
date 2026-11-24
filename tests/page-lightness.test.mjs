import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* The page was made lighter without changing anything that shows (owner, 2026-11-24:
   "light and smooth, without changing the design, the technique or any detail").
   Each check below guards one measured cost from coming back. */
const read = path => readFile(new URL(`../preview_site/${path}`, import.meta.url), 'utf8');
const [trail, film, main, style, framer, experience, polish] = await Promise.all([
  read('js/hero-work-trail.js'), read('js/film.js'), read('js/main.js'),
  read('css/style.css'), read('css/modern-framer.css'), read('css/experience.css'), read('css/polish.css'),
]);
const css = [style, framer, experience, polish].join('\n');

test('the hero trail checks its three overlays by id, not by searching the whole page each frame', () => {
  assert.doesNotMatch(trail, /querySelector\('#dash\.is-open, #chat\.is-open, #latestPanel\.is-open'\)/);
  assert.match(trail, /overlayOpen\('dash'\) && !overlayOpen\('chat'\) && !overlayOpen\('latestPanel'\)/);
});

test(':has() tests anchored on <html> or <body> look only at body’s own children', async () => {
  /* Each such rule made every DOM change re-search the page (an inserted node cost
     about 2.1 ms, a text change 0.6 ms); the drawn cursor paid 0.3 ms every frame. */
  for (const rule of [
    'html:has(> * > #dash.is-open) :is(.cursor-dot, .cursor-ring)',
    'html:has(> * > #reader.is-open) :is(.cursor-dot, .cursor-ring)',
    'body:has(> #mobileMenu.is-open) .to-top',
    'html:has(> * > .dash.is-open)',
    'html:has(> body.menu-open)',
    'body:has(> #cookieCard.is-shown) #design > .hero .hero-corner--bl',
    'html:has(> body:is(.menu-open, .menu-revealed, .menu-closing))',
    'html body:has(> #reader.is-open) #toTop',
    'html body:has(> #cookieCard.is-shown):not(.menu-open):not(.menu-closing) #toTop.is-shown',
  ]) assert.ok(css.includes(rule), rule);
  assert.doesNotMatch(css, /(?:^|[\s,])(?:html|body)(?:\[[^\]]*\]|\.[\w-]+)*:has\((?!>)/m,
    'a page-wide :has() on html or body would make every DOM change search the whole page again');
  // the elements those tests look for are direct children of <body> in the page
  const html = await read('index.html');
  for (const id of ['mobileMenu', 'dash', 'reader']) assert.match(html, new RegExp(`\\n  <(div|section) [^>]*id="${id}"`), id);
  assert.match(await read('js/analytics.js'), /document\.body\.appendChild\(card\)/, 'the cookie card is appended to body');
});

test('scroll and idle work that never shows is not done', () => {
  assert.doesNotMatch(main, /root\.style\.setProperty\('--bq-footer-(?:progress|mix)'/,
    'the footer colour variables restyled every element on each scroll frame and are overridden to transparent');
  assert.match(polish, /html:root\[data-theme\] body #bqPageStage#bqPageStage#bqPageStage#bqPageStage,\nhtml:root\[data-theme\] body #bqPageStage#bqPageStage#bqPageStage#bqPageStage \.footer\.footer-v249 \{\n  background: transparent !important;/,
    'the readers of those variables stay overridden, which is what makes them invisible');
  assert.match(main, /control\.style\.setProperty\('--bq-cookie-height'/, 'the cookie height is set on #toTop, its only reader');
  assert.match(style, /\.grain \{\n  display: none;/);
  assert.match(style, /--grain-opacity: 0;[\s\S]*--grain-opacity: 0;/);
  assert.doesNotMatch(css, /--grain-opacity:(?!\s*0;)/, 'the grain is only safe to skip while it is invisible');
});

test('timed redraws skip a sheet the next paper has covered', () => {
  assert.match(film, /const sheetCovered = \(el\) => \{/);
  assert.match(film, /still\(\) \|\| sheetCovered\(hero\)\) return;/, 'the 30-second hero redraw');
  assert.match(film, /if \(inView && !hovered && !doc\.hidden && !sheetCovered\(stage\)\) step\(1\);/, 'the 2.6-second folio step');
});
