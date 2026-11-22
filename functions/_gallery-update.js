/* Shared by Studio's atomic repository commits and the static build. This
   module is pure so both runtimes allocate the same permanent work URLs. */
export const IMAGE_FILE_PREFIXES = {
  Book: 'BookCover', Businesscard: 'Bcard', Certificate: 'Certificate',
  EventandCon: 'Event', Flex: 'Flex', GeneralDesign: 'GDesign', Invoice: 'Invoice',
  LogoDesign: 'Logo', Official: 'Official', Other: 'Other', Photos: 'Photo',
  Poster: 'Poster', SocialMedia: 'SMedia', TickerLogo: 'TickerLogo',
};

function imageFolder(name) {
  if (typeof name !== 'string' || name.includes('..')) throw new Error('Invalid gallery image path');
  const [folder, file, extra] = name.split('/');
  if (!Object.hasOwn(IMAGE_FILE_PREFIXES, folder) || extra || !/^[^/\\]+\.webp$/i.test(file || '')) {
    throw new Error('Invalid gallery image path');
  }
  return folder;
}

export function withStableImageIndices(manifest) {
  if (!manifest || !Array.isArray(manifest.images) || !Array.isArray(manifest.videos)) throw new Error('Invalid gallery manifest');
  const imageIndexHighWater = {};
  const imageFileHighWater = {};
  for (const folder of Object.keys(IMAGE_FILE_PREFIXES)) {
    const saved = manifest.imageIndexHighWater?.[folder] ?? 0;
    const savedFile = manifest.imageFileHighWater?.[folder] ?? 0;
    if (!Number.isSafeInteger(saved) || saved < 0 || !Number.isSafeInteger(savedFile) || savedFile < 0) {
      throw new Error('Invalid gallery index watermark');
    }
    imageIndexHighWater[folder] = saved;
    imageFileHighWater[folder] = savedFile;
  }
  const positions = {}, used = {}, paths = new Set();
  const images = manifest.images.map(record => {
    const folder = imageFolder(record?.path);
    if (paths.has(record.path)) throw new Error('Invalid or duplicate gallery image');
    paths.add(record.path);
    positions[folder] = (positions[folder] || 0) + 1;
    const index = record.index === undefined ? positions[folder] : record.index;
    if (!Number.isSafeInteger(index) || index < 1 || (used[folder] ||= new Set()).has(index)) {
      throw new Error('Invalid or duplicate gallery image index');
    }
    used[folder].add(index);
    imageIndexHighWater[folder] = Math.max(imageIndexHighWater[folder], index);
    const fileNumber = Number(record.path.match(new RegExp(`^${folder}/${IMAGE_FILE_PREFIXES[folder]}([1-9][0-9]*)\\.webp$`))?.[1] || 0);
    if (!Number.isSafeInteger(fileNumber)) throw new Error('Invalid gallery filename number');
    imageFileHighWater[folder] = Math.max(imageFileHighWater[folder], fileNumber);
    return { ...record, index };
  });
  return { ...manifest, version: Math.max(3, Number(manifest.version) || 0), images, imageIndexHighWater, imageFileHighWater };
}

export function updateGalleryManifest(manifest, change) {
  const next = withStableImageIndices(manifest);
  const folder = imageFolder(change?.path);
  if (change.filenameHighWater !== undefined) {
    if (!Number.isSafeInteger(change.filenameHighWater) || change.filenameHighWater < 0) throw new Error('Invalid gallery filename watermark');
    next.imageFileHighWater[folder] = Math.max(next.imageFileHighWater[folder], change.filenameHighWater);
  }
  if (change.action === 'delete') {
    // Keep the allocation watermark even when the last work is removed.
    next.images = next.images.filter(record => record.path !== change.path);
    return next;
  }
  if (change.action !== 'upload'
      || !new RegExp(`^${folder}/${IMAGE_FILE_PREFIXES[folder]}[1-9][0-9]*\\.webp$`).test(change.path)
      || !Number.isSafeInteger(change.width) || change.width < 1
      || !Number.isSafeInteger(change.height) || change.height < 1
      || typeof change.hash !== 'string' || !/^[a-f0-9]{16}$/.test(change.hash)) {
    throw new Error('Invalid gallery image upload');
  }
  if (next.images.some(record => record.path === change.path)) throw new Error('Gallery image already exists');
  const fileNumber = Number(change.path.match(/([1-9][0-9]*)\.webp$/)[1]);
  if (!Number.isSafeInteger(fileNumber)) throw new Error('Invalid gallery filename number');
  next.imageFileHighWater[folder] = Math.max(next.imageFileHighWater[folder], fileNumber);
  const index = next.imageIndexHighWater[folder] + 1;
  if (!Number.isSafeInteger(index)) throw new Error('Gallery image index exhausted');
  next.imageIndexHighWater[folder] = index;
  const date = typeof change.date === 'string' && Number.isFinite(Date.parse(change.date))
    ? new Date(change.date).toISOString() : '';
  next.images.push({ path: change.path, width: change.width, height: change.height, hash: change.hash, index,
    ...(date ? { date } : {}) });
  return next;
}

/* Films live in the repository's Videos folder as VideosN.mp4, with a poster
   frame at assets/thumbs/Videos/VideosN.jpg. Like images, every record gets an
   explicit index so /design/video/<n> never moves when another film is
   removed, and both watermarks survive deletion. Image records are untouched. */
export const VIDEO_FOLDER = 'Videos';
export const VIDEO_FILE_PREFIX = 'Videos';
export const VIDEO_PATH = /^Videos\/Videos([1-9][0-9]*)\.mp4$/;
export const videoPosterPath = path => `/assets/thumbs/${path.replace(/\.mp4$/i, '.jpg')}`;

export function withStableVideoIndices(manifest) {
  if (!manifest || !Array.isArray(manifest.images) || !Array.isArray(manifest.videos)) throw new Error('Invalid gallery manifest');
  let videoIndexHighWater = manifest.videoIndexHighWater ?? 0;
  let videoFileHighWater = manifest.videoFileHighWater ?? 0;
  if (!Number.isSafeInteger(videoIndexHighWater) || videoIndexHighWater < 0
      || !Number.isSafeInteger(videoFileHighWater) || videoFileHighWater < 0) throw new Error('Invalid gallery video watermark');
  const paths = new Set(), used = new Set();
  const videos = manifest.videos.map((record, position) => {
    // A record the gallery would skip would also shift its positions: fail
    // closed rather than renumber public film URLs.
    if (!record || typeof record.path !== 'string' || record.path.includes('..')
        || !/^Videos\/[^/\\]+\.(mp4|webm|mov)$/i.test(record.path) || paths.has(record.path)
        || !Number.isFinite(record.width) || record.width <= 0 || !Number.isFinite(record.height) || record.height <= 0) {
      throw new Error('Invalid or duplicate gallery video');
    }
    paths.add(record.path);
    // The gallery and the work pages number unindexed films by position.
    const index = record.index === undefined ? position + 1 : record.index;
    if (!Number.isSafeInteger(index) || index < 1 || used.has(index)) throw new Error('Invalid or duplicate gallery video index');
    used.add(index);
    videoIndexHighWater = Math.max(videoIndexHighWater, index);
    const fileNumber = Number(record.path.match(VIDEO_PATH)?.[1] || 0);
    if (!Number.isSafeInteger(fileNumber)) throw new Error('Invalid gallery video filename number');
    videoFileHighWater = Math.max(videoFileHighWater, fileNumber);
    // Same key order the build writes (path, size, index, then date/duration/poster).
    const { date, duration, poster, ...base } = record;
    return { ...base, index, ...(date !== undefined ? { date } : {}),
      ...(duration !== undefined ? { duration } : {}), ...(poster !== undefined ? { poster } : {}) };
  });
  return { ...manifest, videos, videoIndexHighWater, videoFileHighWater };
}

export function updateVideoManifest(manifest, change) {
  const next = withStableVideoIndices(manifest);
  const fileNumber = Number(String(change?.path || '').match(VIDEO_PATH)?.[1] || 0);
  if (change?.filenameHighWater !== undefined) {
    if (!Number.isSafeInteger(change.filenameHighWater) || change.filenameHighWater < 0) throw new Error('Invalid gallery video watermark');
    next.videoFileHighWater = Math.max(next.videoFileHighWater, change.filenameHighWater);
  }
  if (change?.action === 'delete') {
    if (typeof change.path !== 'string' || !/^Videos\/[^/\\]+\.(mp4|webm|mov)$/i.test(change.path) || change.path.includes('..')) {
      throw new Error('Invalid gallery video path');
    }
    next.videos = next.videos.filter(record => record.path !== change.path);
    if (Number.isSafeInteger(fileNumber)) next.videoFileHighWater = Math.max(next.videoFileHighWater, fileNumber);
    return next;
  }
  const dimension = value => Number.isSafeInteger(value) && value >= 16 && value <= 8192;
  if (change?.action !== 'upload' || !fileNumber || !Number.isSafeInteger(fileNumber)
      || !dimension(change.width) || !dimension(change.height)
      || !Number.isFinite(change.duration) || change.duration <= 0 || change.duration > 86_400) {
    throw new Error('Invalid gallery video upload');
  }
  if (next.videos.some(record => record.path === change.path)) throw new Error('Gallery video already exists');
  const index = next.videoIndexHighWater + 1;
  if (!Number.isSafeInteger(index)) throw new Error('Gallery video index exhausted');
  const date = typeof change.date === 'string' && Number.isFinite(Date.parse(change.date))
    ? new Date(change.date).toISOString() : '';
  next.videoIndexHighWater = index;
  next.videoFileHighWater = Math.max(next.videoFileHighWater, fileNumber);
  next.videos.push({ path: change.path, width: change.width, height: change.height, index,
    ...(date ? { date } : {}), duration: Math.round(change.duration * 100) / 100, poster: videoPosterPath(change.path) });
  return next;
}
