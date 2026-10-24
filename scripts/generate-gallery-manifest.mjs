import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_FILE_PREFIXES, withStableImageIndices } from '../functions/_gallery-update.js';
export { IMAGE_FILE_PREFIXES } from '../functions/_gallery-update.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defaultManifest = path.join(projectRoot, 'preview_site/assets/gallery-manifest.json');

/* Only Studio's gallery destinations are discoverable. Keep the authored
   order of existing works: the number in a filename is not its public URL
   (TickerLogo2.webp, for example, has always been /design/tickerlogo/1). */
export async function discoverGalleryImages(manifest, root = projectRoot) {
  const stable = withStableImageIndices(manifest);
  const available = new Set();
  const discovered = [];
  const imageIndexHighWater = { ...stable.imageIndexHighWater };
  const imageFileHighWater = { ...stable.imageFileHighWater };
  for (const [folder, prefix] of Object.entries(IMAGE_FILE_PREFIXES)) {
    // A missing collection directory is a broken checkout, not permission to
    // silently remove that entire collection from a production deployment.
    const entries = await readdir(path.join(root, folder), { withFileTypes: true });
    entries.filter(entry => entry.isFile() && /^[^/\\]+\.webp$/i.test(entry.name))
      .forEach(entry => available.add(`${folder}/${entry.name}`));
    const pattern = new RegExp(`^${prefix}[1-9][0-9]*\\.webp$`);
    const files = entries.filter(entry => entry.isFile() && pattern.test(entry.name))
      .map(entry => entry.name).sort((a, b) => Number(a.slice(prefix.length, -5)) - Number(b.slice(prefix.length, -5)));
    files.forEach(file => discovered.push(`${folder}/${file}`));
  }
  const known = new Set(stable.images.map(record => record.path));
  const images = stable.images.filter(record => available.has(record.path));
  for (const name of discovered) {
    if (known.has(name)) continue;
    const folder = name.split('/')[0];
    const fileNumber = Number(name.match(/([1-9][0-9]*)\.webp$/)[1]);
    if (!Number.isSafeInteger(fileNumber)) throw new Error('Invalid gallery filename number');
    const index = imageIndexHighWater[folder] + 1;
    if (!Number.isSafeInteger(index)) throw new Error('Gallery image index exhausted');
    imageIndexHighWater[folder] = index;
    imageFileHighWater[folder] = Math.max(imageFileHighWater[folder], fileNumber);
    images.push({ path: name, index });
  }
  return { ...stable, images, imageIndexHighWater, imageFileHighWater };
}

/* Read the encoded canvas dimensions without decoding or modifying the image.
   WebP stores them in VP8X, VP8L, or the VP8 keyframe header. */
export function webpDimensions(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF'
      || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Not a WebP image');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error('Truncated WebP chunk');
    let width, height;
    if (type === 'VP8X' && size >= 10) {
      width = bytes.readUIntLE(start + 4, 3) + 1;
      height = bytes.readUIntLE(start + 7, 3) + 1;
    } else if (type === 'VP8L' && size >= 5 && bytes[start] === 0x2f) {
      const dimensions = bytes.readUInt32LE(start + 1);
      width = (dimensions & 0x3fff) + 1;
      height = ((dimensions >>> 14) & 0x3fff) + 1;
    } else if (type === 'VP8 ' && size >= 10
        && bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) {
      width = bytes.readUInt16LE(start + 6) & 0x3fff;
      height = bytes.readUInt16LE(start + 8) & 0x3fff;
    }
    if (width > 0 && height > 0) return { width, height };
    offset = start + size + (size % 2);
  }
  throw new Error('WebP image has no valid canvas dimensions');
}

export async function withOriginalImageDimensions(manifest, root = projectRoot) {
  if (!Array.isArray(manifest.images) || !Array.isArray(manifest.videos)) throw new Error('Invalid gallery manifest');
  const images = [];
  for (const record of manifest.images) {
    if (!record || typeof record.path !== 'string' || !/^[^/\\]+\/[^/\\]+\.webp$/i.test(record.path)
        || record.path.includes('..')) throw new Error('Invalid gallery image path');
    const bytes = await readFile(path.join(root, record.path));
    const dimensions = webpDimensions(bytes);
    /* The same artwork is filed in two folders more than fifty times. A short
       content hash lets the work pages and the sitemap give each image one
       canonical page instead of two competing duplicates. */
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    images.push({ ...record, ...dimensions, hash });
  }
  // Keep catalogue order and video metadata exactly as authored. Thumbnails
  // keep their existing bytes; only reserved frame geometry uses the original.
  return { ...manifest, version: Math.max(2, Number(manifest.version) || 0), images };
}

/* Movie length from the MP4 'moov/mvhd' header (timescale + duration), read
   straight from the container: no ffprobe, and the same answer every build. */
export function mp4Duration(bytes) {
  const box = (start, end, wanted) => {
    for (let offset = start; offset + 8 <= end;) {
      let size = bytes.readUInt32BE(offset);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        size = Number(bytes.readBigUInt64BE(offset + 8));
        header = 16;
      } else if (size === 0) size = end - offset;
      if (size < header || offset + size > end) return null;
      if (type === wanted) return { start: offset + header, end: offset + size };
      offset += size;
    }
    return null;
  };
  const moov = box(0, bytes.length, 'moov');
  const mvhd = moov && box(moov.start, moov.end, 'mvhd');
  if (!mvhd || mvhd.end - mvhd.start < 32) return 0;
  const v1 = bytes[mvhd.start] === 1;
  const timescale = bytes.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
  const units = v1 ? Number(bytes.readBigUInt64BE(mvhd.start + 24)) : bytes.readUInt32BE(mvhd.start + 16);
  if (!timescale || !units || units === 0xffffffff) return 0;
  return Math.round(units / timescale * 100) / 100;
}

/* When a film first entered the repository: its VideoObject uploadDate and
   video-sitemap publication_date. Once recorded it is never recomputed, so a
   shallow CI checkout (where every file looks added by the one commit it
   has) cannot rewrite history; a file git does not know yet stays undated. */
function gitAddedDate(file, root) {
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() !== 'false') return '';
    const dates = execFileSync('git', ['log', '--diff-filter=A', '--format=%aI', '--', file], { cwd: root, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    return dates.length ? dates[dates.length - 1] : '';
  } catch (error) {
    return '';
  }
}

/* Video records carry what the work pages and the video sitemap need:
   date (first commit), duration (seconds) and the poster frame stored at
   assets/thumbs/Videos/<name>.jpg. Gallery cards ignore these fields. */
export async function withVideoMetadata(manifest, root = projectRoot) {
  const videos = [];
  for (const record of manifest.videos) {
    if (!record || typeof record.path !== 'string' || !/^[^/\\]+\/[^/\\]+\.mp4$/i.test(record.path)
        || record.path.includes('..')) { videos.push(record); continue; }
    const { date: knownDate, duration: knownDuration, poster: _poster, ...base } = record;
    const date = typeof knownDate === 'string' && knownDate ? knownDate : gitAddedDate(record.path, root);
    // An unreadable file keeps its recorded length rather than losing it.
    let duration = Number.isFinite(knownDuration) && knownDuration > 0 ? knownDuration : 0;
    try { duration = mp4Duration(await readFile(path.join(root, record.path))) || duration; } catch (error) {}
    const posterPath = `assets/thumbs/${record.path.replace(/\.mp4$/i, '.jpg')}`;
    const poster = existsSync(path.join(root, 'preview_site', posterPath)) ? `/${posterPath}` : '';
    videos.push({ ...base, ...(date ? { date } : {}), ...(duration ? { duration } : {}), ...(poster ? { poster } : {}) });
  }
  return { ...manifest, videos };
}

export async function generateGalleryManifest({ manifestFile = defaultManifest, root = projectRoot } = {}) {
  const before = await readFile(manifestFile, 'utf8');
  const discovered = await discoverGalleryImages(JSON.parse(before), root);
  const manifest = await withVideoMetadata(await withOriginalImageDimensions(discovered, root), root);
  const after = JSON.stringify(manifest) + '\n';
  if (after !== before) await writeFile(manifestFile, after);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await generateGalleryManifest();
  console.log(`Gallery manifest: ${manifest.images.length} original image dimensions; ${manifest.videos.length} video records preserved.`);
}
