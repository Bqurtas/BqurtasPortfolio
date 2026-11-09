/* =========================================================
   Share covers — the 1200×630 card a link shows when it is
   sent or posted (og:image / twitter:image).

   One cover per language and page, drawn in the site's own
   identity. Home follows the live hero: the current Studio
   portrait, handwritten signature, introductory text and link;
   the other rooms retain their paper-sheet design. Titles and
   descriptions come from the edge function's OG table and the
   interface strings from the generated localized copy, so a
   cover can never disagree with the page it stands for.

   Run by hand when the copy or the identity changes:
     node scripts/generate-share-covers.mjs
     node scripts/generate-share-covers.mjs --lang ku,ar --key home,blog
     node scripts/generate-share-covers.mjs --out /tmp/covers   (preview only)

   It needs Google Chrome on this machine (it renders through
   the DevTools protocol); it is not part of `npm run build`.
   ========================================================= */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALIZED_COPY } from '../functions/_localized-copy.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteRoot = path.join(projectRoot, 'preview_site');
const WIDTH = 1200;
const HEIGHT = 630;
const RTL = new Set(['ku', 'ar']);
const LANGS = ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];
/* The approved Studio portrait visible on bqurtas.com, verified 2026-11-09.
   Its bundled 960px rendition preserves the exact live drawing and alpha. */
const HOME_PORTRAIT = 'assets/portraits/4a2b01f6f4fae90b2becff2f7d45f1ed421c723f042eab0af557cbda8a9ce08d.webp';
/* Every key the edge function can ask for (functions/[[route]].js: home,
   design, the portfolio tabs and the four rooms). */
const KEYS = [
  'home', 'design', 'blog', 'bio', 'contact', 'behance',
  'logo', 'official', 'book', 'posters', 'social', 'events',
  'stationery', 'image', 'video', 'other', 'certificate'
];
const ROUTES = {
  home: '', design: '/design', blog: '/blog', bio: '/bio', contact: '/contact', behance: '/behance',
  logo: '/design/logo', official: '/design/official', book: '/design/book',
  posters: '/design/posters', social: '/design/social', events: '/design/events',
  stationery: '/design/stationery', image: '/design/image', video: '/design/video',
  other: '/design/other', certificate: '/design/certificate'
};

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : null;
};
const only = (name, all) => {
  const value = option(name);
  if (!value) return all;
  const wanted = value.split(',').map((item) => item.trim()).filter(Boolean);
  const unknown = wanted.filter((item) => !all.includes(item));
  if (unknown.length) throw new Error(`Unknown --${name}: ${unknown.join(', ')}`);
  return wanted;
};
const langs = only('lang', LANGS);
const keys = only('key', KEYS);
const outDir = path.resolve(option('out') || path.join(siteRoot, 'assets/covers'));

/* ---------- copy: read from the sources the site itself uses ---------- */
function shareCopy() {
  const source = readFileSync(path.join(projectRoot, 'functions/[[route]].js'), 'utf8');
  const og = source.match(/^const OG = (\{.*\});$/m);
  if (!og) throw new Error('OG table not found in functions/[[route]].js');
  const table = JSON.parse(og[1]);
  const certificates = source.match(/const CERTIFICATE_SEO = (\{[\s\S]*?\n\});/);
  if (!certificates) throw new Error('CERTIFICATE_SEO not found in functions/[[route]].js');
  // A plain object literal of strings, authored in this repository.
  const certificateCopy = new Function(`return ${certificates[1]};`)();
  for (const [lang, meta] of Object.entries(certificateCopy)) {
    if (table[lang]) table[lang].certificate = meta;
  }
  return table;
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const fileUrl = (relative) => pathToFileURL(path.join(siteRoot, relative)).href;

function fontFaces() {
  const face = (family, file, weight, style = 'normal', format = 'woff2') =>
    `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};` +
    `src:url('${fileUrl(`font-assets/${file}`)}') format('${format}');}`;
  return [
    face('Liana', 'dbcbdd89855c0198-Liana.ttf', '400', 'normal', 'truetype'),
    face('Fraunces', '48282a415ec22e31-fraunces-latin.woff2', '300 700'),
    face('Fraunces', 'f120089b9440f3e3-fraunces-latin-ext.woff2', '300 700'),
    face('Fraunces', '4af9c759c8059b53-fraunces-italic-latin.woff2', '400 600', 'italic'),
    face('Fraunces', '1e0d114a72921799-fraunces-italic-latin-ext.woff2', '400 600', 'italic'),
    face('Manrope', '520be37a438fa680-manrope-core.520be37a438f.woff2', '300 700'),
    face('JetBrains Mono', '1e06740a02a443fb-jetbrains-latin.woff2', '300 500'),
    face('JetBrains Mono', '7db7affbce1fdee6-jetbrains-latin-ext.woff2', '300 500'),
    face('Noto Kufi Arabic', '0d62bfd83ff94eb9-noto-kufi-latin.0d62bfd83ff9.woff2', '400 700'),
    face('Noto Kufi Arabic', 'acfdd4a7c20ee98d-noto-kufi-arabic.acfdd4a7c20e.woff2', '400 700'),
    face('Noto Naskh Arabic', '315b3c1151ac6cc2-noto-naskh-RrQKbpV-9Dd1b1OAGA6M9PkyDuVBeO2EF1qELw.woff2', '400 700')
  ].join('\n');
}

/* The page's name is the part of its share title before the dash. Like the
   room heroes ("The <em>Journal</em>"), the last word of a Latin name is set
   in italic; Arabic-script names are not italicised. */
function pageName(title, rtl) {
  const name = String(title || '').split(/\s+[—|]\s+/)[0].trim();
  const words = name.split(/\s+/);
  if (rtl || words.length < 2) return escapeHtml(name);
  const last = words.pop();
  return `${escapeHtml(words.join(' '))} <em>${escapeHtml(last)}</em>`;
}

function coverHtml({ lang, key, meta, copy }) {
  if (key === 'home') return homeCoverHtml({ lang, copy });
  const rtl = RTL.has(lang);
  const name = `${copy['name.first'] || 'Barakat'} ${copy['name.last'] || 'Qurtas'}`;
  const address = `bqurtas.com${lang === 'en' ? '' : `/${lang}`}${ROUTES[key]}`;
  const arrow = rtl
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M17 10H4m5-5-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<style>
${fontFaces()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#0a0a0a}
body{font-family:${rtl ? "'Noto Kufi Arabic'" : "'Manrope','Noto Kufi Arabic'"},sans-serif;color:#0f0f0f;-webkit-font-smoothing:antialiased}
.paper{position:absolute;inset:14px;border-radius:30px;background:#f3f3f3;overflow:hidden;
  display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:38px 62px 40px}
.mono{font-family:'JetBrains Mono','Noto Kufi Arabic',monospace;font-size:14px;line-height:1.5;
  letter-spacing:${rtl ? '0' : '.16em'};text-transform:uppercase;color:rgba(15,15,15,.6)}
.edition{display:flex;align-items:center;justify-content:space-between;gap:24px;
  padding-bottom:20px;border-bottom:1px solid rgba(15,15,15,.12)}
.place{display:inline-flex;align-items:center;gap:12px}
.place i{width:7px;height:7px;border-radius:50%;background:rgba(15,15,15,.62)}
.mark{font-family:'Liana','Fraunces',serif;font-size:34px;line-height:1;letter-spacing:.01em;
  text-transform:none;color:#0f0f0f}
[dir="rtl"] .mark{font-family:'Noto Kufi Arabic',sans-serif;font-size:21px;font-weight:700;letter-spacing:0}
.stage{display:grid;grid-template-columns:minmax(0,1fr) 400px;align-items:center;gap:36px;min-height:0}
.copy{min-width:0}
.name{font-family:'Fraunces',serif;font-size:100px;font-weight:500;line-height:1.04;letter-spacing:-.03em}
.name em{font-style:italic;font-weight:400}
[dir="rtl"] .name{font-family:'Noto Kufi Arabic',sans-serif;font-size:76px;font-weight:700;line-height:1.4;letter-spacing:0}
.lede{margin-top:20px;max-width:600px;font-size:26px;font-weight:500;line-height:1.46;letter-spacing:-.01em;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
[dir="rtl"] .lede{font-size:23px;font-weight:500;line-height:1.85;letter-spacing:0}
.portrait{display:block;width:400px;height:400px;object-fit:contain;justify-self:end;filter:grayscale(1) contrast(1.04)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:24px}
.cta{display:inline-flex;align-items:center;gap:14px;height:52px;padding:0 26px;border-radius:999px;
  background:#101010;color:#f3f3f3;font-size:18px;font-weight:600;letter-spacing:${rtl ? '0' : '-.005em'}}
.cta svg{width:19px;height:19px}
.address{direction:ltr;unicode-bidi:isolate;letter-spacing:.06em;text-transform:none;font-size:16px}
</style>
</head>
<body>
<div class="paper">
  <header class="edition mono">
    <span class="mark">${escapeHtml(name)}</span>
    <span>${escapeHtml(copy['hero.place'] || 'Based in Erbil')}</span>
  </header>
  <main class="stage">
    <div class="copy">
      <div class="name" data-fit>${pageName(meta.t, rtl)}</div>
      <p class="lede">${escapeHtml(meta.d)}</p>
    </div>
    <img class="portrait" src="${fileUrl('assets/hero-sketch.webp')}" alt="">
  </main>
  <footer class="foot">
    <span class="cta">${escapeHtml(copy['hero.cta'] || 'View the work')}${arrow}</span>
    <span class="address mono">${escapeHtml(address)}</span>
  </footer>
</div>
<script>
  /* A long name steps down until it sits on at most two lines in its column. */
  window.__fit = async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    const node = document.querySelector('[data-fit]');
    if (!node) return true;
    const column = node.parentElement.clientWidth;
    let size = parseFloat(getComputedStyle(node).fontSize);
    const lines = () => Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight));
    while (size > 44 && (node.scrollWidth > column + 1 || lines() > 2)) {
      size -= 2;
      node.style.fontSize = size + 'px';
    }
    return true;
  };
</script>
</body>
</html>`;
}

/* Keep the home card faithful to the four visible elements of the live hero.
   Hidden edition labels and the discipline kicker are not cover copy. The signature
   still is frame 151 (fully written) of the hero's animated WebP. Using a
   still keeps screenshots independent of the animation's blank first frame. */
function homeCoverHtml({ lang, copy }) {
  const rtl = RTL.has(lang);
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<style>
${fontFaces()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#0a0a0a}
body{font-family:'Manrope','Noto Naskh Arabic',sans-serif;color:#111;-webkit-font-smoothing:antialiased}
.paper{position:absolute;inset:14px;border-radius:28px;background:#f3f3f3;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 60px;text-align:center}
.portrait{display:block;width:256px;height:256px;object-fit:contain;filter:grayscale(1);flex-shrink:0}
.signature{display:block;width:576px;height:auto;margin-top:3px;direction:ltr;flex-shrink:0}
.lede{max-width:740px;margin-top:10px;font-size:22px;font-weight:400;line-height:1.55;letter-spacing:-.015em}
.cta{display:flex;align-items:center;justify-content:center;gap:18px;min-height:44px;margin-top:16px;
  padding:8px 0;border-bottom:1px solid #888;font-size:18px;font-weight:600;line-height:1.55}
.cta svg{width:18px;height:18px}
[dir="rtl"] .lede{font-family:'Noto Naskh Arabic',sans-serif;font-size:28px;line-height:1.65;letter-spacing:0}
[dir="rtl"] .cta{font-family:'Noto Kufi Arabic',sans-serif;font-size:18px}
</style>
</head>
<body>
<main class="paper">
  <img class="portrait" src="${fileUrl(HOME_PORTRAIT)}" alt="Barakat Qurtas">
  <img class="signature" src="${fileUrl('assets/signature/written-by-hand-still.webp')}" alt="Barakat Qurtas">
  <p class="lede">${escapeHtml(copy['hero.lede'])}</p>
  <span class="cta">${escapeHtml(copy['hero.cta'])}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
</main>
<script>
  window.__fit = async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
    return true;
  };
</script>
</body>
</html>`;
}

/* ---------- Chrome through the DevTools protocol ---------- */
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openBrowser() {
  if (!existsSync(CHROME)) throw new Error(`Google Chrome not found at ${CHROME} (set CHROME_PATH)`);
  const port = 9300 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(path.join(tmpdir(), 'bq-covers-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-extensions',
    // The template and its fonts are local files of this repository.
    '--allow-file-access-from-files', `--window-size=${WIDTH},${HEIGHT}`, 'about:blank'
  ], { stdio: 'ignore' });
  let endpoint = null;
  for (let attempt = 0; attempt < 80 && !endpoint; attempt += 1) {
    try {
      const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      endpoint = info.webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  if (!endpoint) { chrome.kill('SIGKILL'); throw new Error('Chrome did not start'); }
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('DevTools socket failed')), { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject, method } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(`${method}: ${data.error.message}`));
      else resolve(data.result);
    } else listeners.forEach((listener) => listener(data));
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    id += 1;
    pending.set(id, { resolve, reject, method });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  return {
    send,
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    close() { socket.close(); chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); }
  };
}

async function main() {
  const table = shareCopy();
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), 'bq-cover-pages-'));
  const browser = await openBrowser();
  let written = 0;
  try {
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => browser.send(method, params, sessionId);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

    for (const lang of langs) {
      const copy = LOCALIZED_COPY[lang] || LOCALIZED_COPY.en;
      for (const key of keys) {
        const meta = (table[lang] && table[lang][key]) || table.en[key];
        if (!meta) throw new Error(`No share copy for ${lang}/${key}`);
        const page = path.join(work, `${lang}-${key}.html`);
        writeFileSync(page, coverHtml({ lang, key, meta, copy }));
        const loaded = new Promise((resolve) => {
          const off = browser.on((data) => {
            if (data.sessionId === sessionId && data.method === 'Page.loadEventFired') { off(); resolve(); }
          });
          setTimeout(() => { off(); resolve(); }, 15000);
        });
        await send('Page.navigate', { url: pathToFileURL(page).href });
        await loaded;
        await send('Runtime.evaluate', { expression: 'window.__fit()', awaitPromise: true });
        await sleep(60);
        const { data } = await send('Page.captureScreenshot', {
          format: 'jpeg', quality: 88, captureBeyondViewport: false,
          clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 }
        });
        writeFileSync(path.join(outDir, `${lang}-${key}.jpg`), Buffer.from(data, 'base64'));
        written += 1;
      }
      console.log(`${lang}: ${keys.length} cover${keys.length === 1 ? '' : 's'}`);
    }
  } finally {
    browser.close();
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`Wrote ${written} share cover${written === 1 ? '' : 's'} to ${path.relative(projectRoot, outDir) || outDir}`);
}

await main();
