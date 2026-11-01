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
