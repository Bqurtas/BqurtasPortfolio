import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defaultManifest = path.join(projectRoot, 'preview_site/assets/gallery-manifest.json');

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
    const dimensions = webpDimensions(await readFile(path.join(root, record.path)));
    images.push({ ...record, ...dimensions });
  }
  // Keep catalogue order and video metadata exactly as authored. Thumbnails
  // keep their existing bytes; only reserved frame geometry uses the original.
  return { ...manifest, version: Math.max(2, Number(manifest.version) || 0), images };
}

export async function generateGalleryManifest({ manifestFile = defaultManifest, root = projectRoot } = {}) {
  const before = await readFile(manifestFile, 'utf8');
  const manifest = await withOriginalImageDimensions(JSON.parse(before), root);
  const after = JSON.stringify(manifest) + '\n';
  if (after !== before) await writeFile(manifestFile, after);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await generateGalleryManifest();
  console.log(`Gallery manifest: ${manifest.images.length} original image dimensions; ${manifest.videos.length} video records preserved.`);
}
