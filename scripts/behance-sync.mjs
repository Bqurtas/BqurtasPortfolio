#!/usr/bin/env node
/* =========================================================
   Refresh the Behance room's copy (preview_site/assets/behance/).

     node scripts/behance-sync.mjs                    list, titles, dates, covers
     node scripts/behance-sync.mjs --pages export.json  also the pages of projects
     node scripts/behance-sync.mjs --snippet          print the browser snippet
     add --prune to drop projects that left the feed

   Without options it uses only what Behance publishes for machines: the
   profile's RSS feed and oEmbed, plus images from Behance's image host. That
   keeps the list, titles and dates current, adds new projects with their
   cover, and downloads a cover again when Behance's cover file changed.
   (Between runs the edge, functions/api/behance-feed.js, already shows new
   projects with their cover.) Covers are always saved as cover.webp and
   cover-404.webp: index.html names some of them.

   Nothing is changed until every download has arrived: files are gathered
   in <id>.incoming folders first, and a failed run removes them and leaves
   the copy as it was. When Behance has nothing new, no file is written at
   all, so a scheduled run (.github/workflows/behance-sync.yml) only commits
   real changes. If Behance cannot be reached the script exits with code 75
   (try again later) and the copy stays as it was.

   Behance does not open project pages to automated readers, and this script
   does not try to. To copy a project's pages, open the project (and the
   profile, for the cover image and figures) in an ordinary browser, run the
   snippet from --snippet in its console, collect the printed objects into one
   JSON file { "owner": {...}, "projects": [{...}] } and pass it with --pages.
   Then run `npm run build`.
   ========================================================= */
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readBehanceFeed, oembedTitle, BEHANCE_OEMBED } from '../functions/api/_behance-feed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'preview_site', 'assets', 'behance');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : ''; };
const AGENT = 'bqurtas.com (+https://bqurtas.com)';
const IMAGE_HOSTS = ['https://mir-s3-cdn-cf.behance.net/', 'https://pps.services.adobe.com/'];
const UNREACHABLE = 75; // EX_TEMPFAIL: Behance did not answer; the next run tries again
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* The feed writes each character outside Latin-1 as one "?". A saved title
   still matches its feed form unless the project was renamed on Behance. */
const feedForm = (title) => [...String(title || '')].map((c) => (c.codePointAt(0) > 0xff ? '?' : c)).join('');

/* Runs in an ordinary browser on a Behance project page or on the profile. */
const SNIPPET = String.raw`(() => {
  const st = JSON.parse(document.getElementById('beconfig-store_state').textContent);
  const best = (sizes, res) => { const all = (sizes && sizes.allAvailable) || []; for (const re of res) { const hit = all.find((s) => re.test(s.url)); if (hit) return hit.url; } return all[0] && all[0].url; };
  const text = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.innerText.trim(); };
  const p = st.project && st.project.project;
  if (p) {
    const images = [];
    for (const m of p.modules || []) {
      const add = (x) => images.push({ src: best(x.imageSizes, [/\/1400_webp\//, /\/max_1200_webp\//, /\/fs_webp\//, /_webp\//]), caption: text(x.caption) });
      if (m.__typename === 'ImageModule') add(m);
      if (m.__typename === 'MediaCollectionModule') (m.components || []).forEach(add);
    }
    return JSON.stringify({ id: String(p.id), about: p.description || '', tools: (p.tools || []).map((t) => t.title), tags: (p.tags || []).map((t) => t.title), images });
  }
  const u = st.profile && (st.profile.user || st.profile.owner);
  const a = u.availabilityInfo || {};
  return JSON.stringify({ owner: { name: u.displayName, occupation: u.occupation, location: u.location, website: u.website,
    since: new Date(u.createdOn * 1000).toISOString().slice(0, 10), available: { freelance: !!a.isAvailableFreelance, fullTime: !!a.isAvailableFullTime },
    stats: u.stats, banner: u.bannerImageUrl, avatar: best(u.images, [/\/276$/, /\/230$/]) } });
})()`;
if (flag('snippet')) {
  console.log(SNIPPET);
  process.exit(0);
}

/* ---------- images ---------- */
const imageInfo = (bytes) => {
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { ext: 'webp', w: 1 + bytes.readUIntLE(24, 3), h: 1 + bytes.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { ext: 'webp', w: bytes.readUInt16LE(26) & 0x3fff, h: bytes.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const b = bytes.readUInt32LE(21);
      return { ext: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  if (bytes.toString('ascii', 0, 4) === 'GIF8') return { ext: 'gif', w: bytes.readUInt16LE(6), h: bytes.readUInt16LE(8) };
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) return { ext: 'png', w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = 2; i + 9 < bytes.length;) {
      if (bytes[i] !== 0xff) { i += 1; continue; }
      const marker = bytes[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { ext: 'jpg', w: bytes.readUInt16BE(i + 7), h: bytes.readUInt16BE(i + 5) };
      }
      i += 2 + bytes.readUInt16BE(i + 2);
    }
  }
  throw new Error('not a WebP, GIF, PNG or JPEG image');
};
/* Saves under `stem` + the real extension; returns the name and size. */
async function download(url, folder, stem) {
  if (!url || !IMAGE_HOSTS.some((host) => url.startsWith(host))) throw new Error(`refusing an image outside Behance: ${url}`);
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const info = imageInfo(bytes);
      const name = `${stem}.${info.ext}`;
      await writeFile(path.join(folder, name), bytes);
      return { name, w: info.w, h: info.h };
    } catch (error) {
      if (attempt >= 3) throw new Error(`${url}: ${error.message}`);
      await sleep(1500 * attempt);
    }
  }
}
/* Behance's image host answers the first request for a WebP size with the
   original file (JPEG or PNG) while it converts, then with the WebP: ask
   again. Covers must arrive as WebP (index.html names cover.webp); a page
   keeps its original file if the WebP never comes. A moving GIF stays a GIF
   on Behance's WebP sizes, which keeps it moving, so it is taken as it comes. */
async function downloadWebp(url, folder, stem, { required = false } = {}) {
  if (!required && /\.gif$/i.test(new URL(url).pathname)) return download(url, folder, stem);
  for (let attempt = 1; ; attempt += 1) {
    const saved = await download(url, folder, stem);
    if (saved.name === `${stem}.webp`) return saved;
    if (attempt >= 4 && !required) return saved;
    await rm(path.join(folder, saved.name), { force: true });
    if (attempt >= 4) throw new Error(`Behance did not send a WebP for ${url}`);
    await sleep(2000 * attempt);
  }
}
const cleanAbout = (description) => String(description || '').replace(/\r/g, '').split('\n')
  .filter((line) => !/^for more inf/i.test(line.trim()) && !/^https?:\/\/(www\.)?bqurtas\.com\/#/.test(line.trim()))
  .join('\n').trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/* ---------- run ---------- */
const jsonPath = path.join(outDir, 'projects.json');
const copy = existsSync(jsonPath) ? JSON.parse(await readFile(jsonPath, 'utf8')) : { projects: [] };
const before = new Map((copy.projects || []).map((p) => [p.id, p]));
const exported = option('pages') ? JSON.parse(await readFile(option('pages'), 'utf8')) : { projects: [] };
const pages = new Map((exported.projects || []).map((p) => [String(p.id), p]));
const incoming = (name) => path.join(outDir, `${name}.incoming`);

// Leftovers of an interrupted run never mix with this one.
await mkdir(outDir, { recursive: true });
for (const entry of await readdir(outDir, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.endsWith('.incoming')) await rm(path.join(outDir, entry.name), { recursive: true, force: true });
}

let feed = [];
try {
  feed = await readBehanceFeed();
} catch (error) {
  console.error(`Behance did not answer: ${error.message}. The copy stays as it was.`);
  process.exit(UNREACHABLE);
}
if (!feed.length) {
  console.error('Behance did not answer: the feed listed no projects. The copy stays as it was.');
  process.exit(UNREACHABLE);
}
console.log(`${feed.length} projects in the Behance feed`);

/* Phase 1: gather every new file beside the copy. */
const staged = new Map();
let profileFiles = null;
try {
  for (const item of feed) {
    const old = before.get(item.id);
    const page = pages.get(item.id);
    const folder = path.join(outDir, item.id);
    const coverChanged = !old || old.coverFile !== item.cover || !existsSync(path.join(folder, 'cover.webp'));
    if (!page && !coverChanged) continue;
    const fresh = incoming(item.id);
    await mkdir(fresh, { recursive: true });
    const base = `/assets/behance/${item.id}/`;
    const entry = { full: Boolean(page) };
    if (coverChanged || page) {
      const cover = (size, stem) => downloadWebp(`https://mir-s3-cdn-cf.behance.net/projects/${size}/${item.cover}`, fresh, stem, { required: true });
      const big = await cover('808_webp', 'cover');
      const small = await cover('404_webp', 'cover-404');
      entry.cover = {
        src: base + big.name, small: base + small.name, w: big.w, h: big.h,
        ...(old?.cover?.tone && old.coverFile === item.cover ? { tone: old.cover.tone } : {}),
      };
    }
    if (page) {
      entry.images = [];
      for (const [i, image] of (page.images || []).entries()) {
        const saved = await downloadWebp(typeof image === 'string' ? image : image.src, fresh, String(i + 1).padStart(2, '0'));
        entry.images.push({ src: base + saved.name, w: saved.w, h: saved.h, ...(image.caption ? { caption: image.caption } : {}) });
        await sleep(120);
      }
    }
    staged.set(item.id, entry);
  }
  if (exported.owner) {
    const o = exported.owner;
    const fresh = incoming('profile');
    await mkdir(fresh, { recursive: true });
    profileFiles = {
      banner: o.banner ? await download(o.banner, fresh, 'banner') : null,
      avatar: o.avatar ? await download(o.avatar, fresh, 'avatar') : null,
    };
  }
} catch (error) {
  for (const id of [...staged.keys(), 'profile']) await rm(incoming(id), { recursive: true, force: true });
  for (const item of feed) await rm(incoming(item.id), { recursive: true, force: true });
  console.error(`A download from Behance failed: ${error.message}. The copy stays as it was.`);
  process.exit(UNREACHABLE);
}

/* Phase 2: everything arrived; swap it in and write the list once. */
const projects = [];
for (const item of feed) {
  const old = before.get(item.id);
  const page = pages.get(item.id);
  const entry = staged.get(item.id);
  const folder = path.join(outDir, item.id);
  if (entry) {
    if (entry.full || !existsSync(folder)) {
      await rm(folder, { recursive: true, force: true });
      await rename(incoming(item.id), folder);
    } else {
      // Only the covers changed: put them in place and keep the copied pages.
      for (const name of ['cover.webp', 'cover-404.webp']) await copyFile(path.join(incoming(item.id), name), path.join(folder, name));
      await rm(incoming(item.id), { recursive: true, force: true });
    }
  }
  let title = old?.title || item.title;
  // oEmbed only for a new or renamed project, or a title still in feed form.
  if (!old?.title || feedForm(old.title) !== item.title || old.title.includes('?')) {
    try {
      const response = await fetch(BEHANCE_OEMBED + encodeURIComponent(item.url), { headers: { 'User-Agent': AGENT } });
      if (response.ok) title = oembedTitle(await response.json()) || title;
    } catch (e) {}
  }
  const images = entry?.images || old?.images || [];
  // "checked": the cover was fetched again but Behance did not change it.
  const what = !old ? 'added  ' : page || (old.coverFile && old.coverFile !== item.cover) ? 'updated' : 'checked';
  if (entry) console.log(`  ${what}  ${item.id} ${title}${page ? ` (${images.length} pages)` : images.length ? ' (cover)' : ' (cover only)'}`);
  projects.push({
    id: item.id, slug: item.slug, title, url: item.url, date: item.date || old?.date || '',
    about: page ? cleanAbout(page.about) : (old?.about || []),
    tools: page ? (page.tools || []).map((t) => String(t).trim()) : (old?.tools || []),
    tags: page ? (page.tags || []).map((t) => String(t).trim()) : (old?.tags || []),
    coverFile: item.cover, cover: entry?.cover || old?.cover, images,
  });
}
/* The feed may list only recent projects: keep older copies unless asked. */
for (const old of copy.projects || []) {
  if (projects.some((p) => p.id === old.id)) continue;
  if (flag('prune')) {
    await rm(path.join(outDir, old.id), { recursive: true, force: true });
    console.log(`  removed  ${old.id} ${old.title}`);
  } else projects.push(old);
}

let owner = copy.owner || null;
if (exported.owner) {
  const o = exported.owner;
  // New files sit beside the old ones; index.html names the first copy's.
  const profileDir = path.join(outDir, 'profile');
  await mkdir(profileDir, { recursive: true });
  for (const saved of Object.values(profileFiles).filter(Boolean)) {
    await copyFile(path.join(incoming('profile'), saved.name), path.join(profileDir, saved.name));
  }
  await rm(incoming('profile'), { recursive: true, force: true });
  owner = {
    name: o.name, occupation: o.occupation, location: o.location, url: 'https://www.behance.net/bqurtas', website: o.website,
    since: o.since, available: o.available, stats: o.stats, statsAsOf: new Date().toISOString().slice(0, 10),
    banner: profileFiles.banner ? { src: `/assets/behance/profile/${profileFiles.banner.name}`, w: profileFiles.banner.w, h: profileFiles.banner.h } : owner?.banner,
    avatar: profileFiles.avatar ? { src: `/assets/behance/profile/${profileFiles.avatar.name}`, w: profileFiles.avatar.w, h: profileFiles.avatar.h } : owner?.avatar,
  };
  console.log('  updated the profile');
}
projects.sort((a, b) => String(b.date).localeCompare(String(a.date)));
/* Every cover and page address carries a stamp of its file's content
   (?v=<12 hex>). A page Behance changed keeps its file name, so without the
   stamp the edge cache, browsers and the service worker would go on showing
   the old one; an unchanged file keeps its address. New objects, so `copy`
   stays as it was read for the comparison below. */
const stamp = (src) => {
  if (typeof src !== 'string' || !src.startsWith('/assets/behance/')) return src;
  const clean = src.split('?')[0];
  const file = path.join(root, 'preview_site', clean);
  return existsSync(file) ? `${clean}?v=${createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12)}` : clean;
};
const stamped = projects.map((p) => ({
  ...p,
  ...(p.cover ? { cover: { ...p.cover, src: stamp(p.cover.src), ...(p.cover.small ? { small: stamp(p.cover.small) } : {}) } } : {}),
  images: (p.images || []).map((image) => ({ ...image, src: stamp(image.src) })),
}));
const out = { profile: 'https://www.behance.net/bqurtas', synced: new Date().toISOString().slice(0, 10), ...(owner ? { owner } : {}), projects: stamped };
const withoutDate = ({ synced, ...rest }) => rest;
if (isDeepStrictEqual(withoutDate(out), withoutDate(copy))) {
  console.log('Nothing new on Behance; the copy is unchanged.');
} else {
  await writeFile(jsonPath, JSON.stringify(out));
  console.log(`saved ${projects.length} projects. Next: npm run build`);
}
