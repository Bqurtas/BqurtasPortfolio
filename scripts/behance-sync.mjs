#!/usr/bin/env node
/* =========================================================
   Refresh the Behance room's copy (preview_site/assets/behance/).

     node scripts/behance-sync.mjs                    list, titles, dates, covers
     node scripts/behance-sync.mjs --pages export.json  also the pages of projects
     node scripts/behance-sync.mjs --snippet          print the browser snippet
     add --prune to drop projects that left the feed

   Without options it uses only what Behance publishes for machines: the
   profile's RSS feed and oEmbed, plus images from Behance's image host. That
   keeps the list, titles, dates and covers current; new projects arrive with
   their cover. (Between runs the edge, functions/api/behance-feed.js, already
   shows new projects with their cover.)

   Behance does not open project pages to automated readers, and this script
   does not try to. To copy a project's pages, open the project (and the
   profile, for the cover image and figures) in an ordinary browser, run the
   snippet from --snippet in its console, collect the printed objects into one
   JSON file { "owner": {...}, "projects": [{...}] } and pass it with --pages.
   Then run `npm run build`.
   ========================================================= */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBehanceFeed, oembedTitle, BEHANCE_OEMBED } from '../functions/api/_behance-feed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'preview_site', 'assets', 'behance');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : ''; };
const AGENT = 'bqurtas.com (+https://bqurtas.com)';
const IMAGE_HOSTS = ['https://mir-s3-cdn-cf.behance.net/', 'https://pps.services.adobe.com/'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
/* Write a folder beside the current one and swap only when it is complete. */
async function replaceFolder(folder, fill) {
  const fresh = `${folder}.incoming`;
  await rm(fresh, { recursive: true, force: true });
  await mkdir(fresh, { recursive: true });
  try {
    const result = await fill(fresh);
    await rm(folder, { recursive: true, force: true });
    await rename(fresh, folder);
    return result;
  } catch (error) {
    await rm(fresh, { recursive: true, force: true });
    throw error;
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

const feed = await readBehanceFeed();
if (!feed.length) throw new Error('the Behance feed listed no projects');
console.log(`${feed.length} projects in the Behance feed`);
const projects = [];
for (const item of feed) {
  const old = before.get(item.id);
  let title = old?.title || item.title;
  try {
    const response = await fetch(BEHANCE_OEMBED + encodeURIComponent(item.url), { headers: { 'User-Agent': AGENT } });
    if (response.ok) title = oembedTitle(await response.json()) || title;
  } catch (e) {}
  const base = `/assets/behance/${item.id}/`;
  const folder = path.join(outDir, item.id);
  const page = pages.get(item.id);
  let cover = old?.cover;
  let images = old?.images || [];
  if (page || !old || !existsSync(folder)) {
    ({ cover, images } = await replaceFolder(folder, async (fresh) => {
      const big = await download(`https://mir-s3-cdn-cf.behance.net/projects/808/${item.cover}`, fresh, 'cover');
      const small = await download(`https://mir-s3-cdn-cf.behance.net/projects/404/${item.cover}`, fresh, 'cover-404');
      const list = [];
      if (page) {
        for (const [i, image] of (page.images || []).entries()) {
          const saved = await download(typeof image === 'string' ? image : image.src, fresh, String(i + 1).padStart(2, '0'));
          list.push({ src: base + saved.name, w: saved.w, h: saved.h, ...(image.caption ? { caption: image.caption } : {}) });
          await sleep(120);
        }
      } else if (old && existsSync(folder)) {
        // Keep the pages already copied.
        for (const file of await readdir(folder)) if (!file.startsWith('cover')) await rename(path.join(folder, file), path.join(fresh, file));
        list.push(...(old.images || []));
      }
      return { cover: { src: base + big.name, small: base + small.name, w: big.w, h: big.h }, images: list };
    }));
    console.log(`  ${old ? 'updated' : 'added  '}  ${item.id} ${title}${page ? ` (${images.length} pages)` : images.length ? '' : ' (cover only)'}`);
  }
  projects.push({
    id: item.id, slug: item.slug, title, url: item.url, date: item.date || old?.date || '',
    about: page ? cleanAbout(page.about) : (old?.about || []),
    tools: page ? (page.tools || []).map((t) => String(t).trim()) : (old?.tools || []),
    tags: page ? (page.tags || []).map((t) => String(t).trim()) : (old?.tags || []),
    cover, images,
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
  const profileDir = path.join(outDir, 'profile');
  const saved = await replaceFolder(profileDir, async (fresh) => ({
    banner: o.banner ? await download(o.banner, fresh, 'banner') : null,
    avatar: o.avatar ? await download(o.avatar, fresh, 'avatar') : null,
  }));
  owner = {
    name: o.name, occupation: o.occupation, location: o.location, url: 'https://www.behance.net/bqurtas', website: o.website,
    since: o.since, available: o.available, stats: o.stats, statsAsOf: new Date().toISOString().slice(0, 10),
    banner: saved.banner ? { src: `/assets/behance/profile/${saved.banner.name}`, large: `/assets/behance/profile/${saved.banner.name}`, w: saved.banner.w, h: saved.banner.h } : owner?.banner,
    avatar: saved.avatar ? { src: `/assets/behance/profile/${saved.avatar.name}`, w: saved.avatar.w, h: saved.avatar.h } : owner?.avatar,
  };
  console.log('  updated the profile');
}
projects.sort((a, b) => String(b.date).localeCompare(String(a.date)));
const out = { profile: 'https://www.behance.net/bqurtas', synced: new Date().toISOString().slice(0, 10), ...(owner ? { owner } : {}), projects };
await writeFile(jsonPath, JSON.stringify(out));
console.log(`saved ${projects.length} projects. Next: npm run build`);
