import zlib from 'node:zlib';

/* Codepoints a WOFF2 font maps to a real glyph. WOFF2 never transforms cmap,
   so it can be read straight out of the decompressed table stream without a
   font library — enough for build checks that a subset still covers a range. */
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep'];

function base128(bytes, state) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[state.offset++];
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('Invalid WOFF2 UIntBase128');
}

export function woff2Codepoints(bytes) {
  if (bytes.toString('latin1', 0, 4) !== 'wOF2') throw new Error('Not a WOFF2 font');
  const numTables = bytes.readUInt16BE(12);
  const compressedSize = bytes.readUInt32BE(20);
  const state = { offset: 48 };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = bytes[state.offset++];
    let tag = KNOWN_TAGS[flags & 0x3f];
    if ((flags & 0x3f) === 63) {
      tag = bytes.toString('latin1', state.offset, state.offset + 4);
      state.offset += 4;
    }
    const version = flags >> 6;
    let length = base128(bytes, state);
    // glyf/loca use version 0 for "transformed"; every other table uses 0 for "as is".
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    if (transformed) length = base128(bytes, state);
    tables.push({ tag, length });
  }
  const stream = zlib.brotliDecompressSync(bytes.subarray(state.offset, state.offset + compressedSize));
  const cmapIndex = tables.findIndex(({ tag }) => tag === 'cmap');
  if (cmapIndex < 0) throw new Error('WOFF2 font has no cmap');
  const start = tables.slice(0, cmapIndex).reduce((sum, { length }) => sum + length, 0);
  const cmap = stream.subarray(start, start + tables[cmapIndex].length);
  const codepoints = new Set();
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const sub = cmap.subarray(cmap.readUInt32BE(4 + i * 8 + 4));
    const format = sub.readUInt16BE(0);
    if (format === 4) {
      const segs = sub.readUInt16BE(6) / 2;
      const ends = 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = sub.readUInt16BE(ends + s * 2), first = sub.readUInt16BE(starts + s * 2);
        const delta = sub.readInt16BE(deltas + s * 2), range = sub.readUInt16BE(ranges + s * 2);
        for (let code = first; code <= end && code !== 0xffff; code++) {
          const glyph = range === 0 ? (code + delta) & 0xffff
            : sub.readUInt16BE(ranges + s * 2 + range + (code - first) * 2);
          if (glyph) codepoints.add(code);
        }
      }
    } else if (format === 12) {
      for (let g = 0; g < sub.readUInt32BE(12); g++) {
        const first = sub.readUInt32BE(16 + g * 12), end = sub.readUInt32BE(20 + g * 12);
        for (let code = first; code <= end; code++) codepoints.add(code);
      }
    }
  }
  return codepoints;
}
