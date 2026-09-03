import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { minify } from 'terser';
import { minify as minifyCss } from 'csso';

const jsBundles = [
  ['preview_site/js/main.js', 'preview_site/js/main.v420.min.js'],
  ['preview_site/js/gallery.js', 'preview_site/js/gallery.v420.min.js'],
  ['preview_site/js/i18n.js', 'preview_site/js/i18n.v420.min.js'],
  ['preview_site/js/i18n-more.js', 'preview_site/js/i18n-more.min.js'],
  ['preview_site/js/enhance.js', 'preview_site/js/enhance.v420.min.js'],
  ['preview_site/js/motion.js', 'preview_site/js/motion.min.js'],
  ['preview_site/js/chat-kb.js', 'preview_site/js/chat-kb.min.js'],
  ['preview_site/js/lux.js', 'preview_site/js/lux.min.js']
];

const cssBundles = [
  ['preview_site/css/style.css', 'preview_site/css/style.v417.min.css']
];

for (const [input, output] of jsBundles) {
  const source = await readFile(input, 'utf8');
  const result = await minify(source, {
    ecma: 2020,
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error(`Terser produced no output for ${input}`);
  await writeFile(output, `${result.code}\n`);
  console.log(`${input} -> ${output}`);
}

/* Keep the worker's precache list in step with the page.
   Both name the same fingerprinted files, and they were kept in step by hand —
   so a deploy that bumped index.html and forgot sw.js left the worker fetching
   URLs the page no longer asks for. The page is the single source of truth;
   the worker follows it. */
{
  const htmlPath = 'preview_site/index.html';
  const swPath = 'preview_site/sw.js';
  const html = await readFile(htmlPath, 'utf8');
  let sw = await readFile(swPath, 'utf8');
  const before = sw;
  sw = sw.replace(/'(\/(?:js|css)\/[^'?]+)\?v=\d+'/g, (whole, path) => {
    const live = html.match(new RegExp(path.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=(\\d+)'));
    return live ? `'${path}?v=${live[1]}'` : whole;
  });
  if (sw !== before) {
    await writeFile(swPath, sw);
    console.log(`${swPath} -> precache versions synced from index.html`);
  }
}

for (const [input, output] of cssBundles) {
  const source = await readFile(input, 'utf8');
  const result = minifyCss(source, { restructure: false });
  if (!result.css) throw new Error(`csso produced no output for ${input}`);
  await writeFile(output, `${result.css}\n`);
  console.log(`${input} -> ${output}`);
}

/* The service worker's cache name is derived from what it precaches, so a
   release can never ship a worker that still believes it holds the last one.
   SW_VERSION used to be a hand-typed 'v4' and was forgotten more than once —
   the live worker was pinning main?v=531 while the HTML asked for v=532. */
{
  const swPath = 'preview_site/sw.js';
  const sw = await readFile(swPath, 'utf8');
  const precache = (sw.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/) || [, ''])[1];
  const stamp = createHash('sha1').update(precache).digest('hex').slice(0, 10);
  const nextSw = sw.replace(/const SW_VERSION = '[^']*';/, `const SW_VERSION = '${stamp}';`);
  if (nextSw !== sw) {
    await writeFile(swPath, nextSw);
    console.log(`sw.js -> SW_VERSION ${stamp}`);
  }
  const htmlPath = 'preview_site/index.html';
  const html = await readFile(htmlPath, 'utf8');
  const nextHtml = html.replace(/\/sw\.js\?v=[A-Za-z0-9]+/, `/sw.js?v=${stamp}`);
  if (nextHtml !== html) {
    await writeFile(htmlPath, nextHtml);
    console.log(`index.html -> sw.js?v=${stamp}`);
  }
}
