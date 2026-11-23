/* The opening's second writer: assets/film/logo-draw.bin, made once from the
   brand's official write-on clip (assets/film/logo-write.mp4, white on Ink,
   900 x 200, 60 fps, writing 0.1-3.0 s). Same layout as portrait-draw.bin:
   R = the name's keyed alpha in the finished frame, G/B = the 10-bit moment
   (0-3.0 s) each pixel is first half lit. js/film.js replays it when the clip
   itself cannot play (autoplay refused, as in iOS Low Power Mode), so the
   name is always written, never popped in.
   Run: node scripts/generate-logo-draw.mjs   (needs ffmpeg on PATH; a PNG file) */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLIP = path.join(root, 'preview_site/assets/film/logo-write.mp4');
const OUT = path.join(root, 'preview_site/assets/film/logo-draw.bin');
const W = 900, H = 200, FPS = 60, END = 3.0, N = W * H;

export function buildDrawMap(frames, count) {
  const last = Math.min(count - 1, Math.round(END * FPS));
  const rgb = Buffer.alloc(N * 3);
  let ink = 0;
  for (let i = 0; i < N; i++) {
    const final = frames[last * N + i];
    const alpha = Math.max(0, Math.min(255, Math.round((final - 20) * 1.085)));
    if (!alpha) continue;
    const half = 20 + (final - 20) / 2;
    let first = last;
    for (let f = 0; f <= last; f++) if (frames[f * N + i] >= half) { first = f; break; }
    const q = Math.round(Math.min(first / FPS, END) / END * 1023);
    rgb[i * 3] = alpha;
    rgb[i * 3 + 1] = q >> 2;
    rgb[i * 3 + 2] = (q & 3) * 85;
    ink++;
  }
  return { rgb, ink };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frames = execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', '-i', CLIP,
    '-t', String(END + 0.1), '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 256 * 1024 * 1024 });
  const count = Math.floor(frames.length / N);
  const { rgb, ink } = buildDrawMap(frames, count);
  execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-s', `${W}x${H}`, '-i', '-', '-frames:v', '1', '-f', 'image2', '-c:v', 'png', OUT], { input: rgb });
  console.log(`logo-draw.bin: ${ink} ink pixels from ${count} frames`);
}
