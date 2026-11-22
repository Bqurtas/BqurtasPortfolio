/* Studio films: any video the browser can play is published within the
   25 MB limit. A film that already fits is sent unchanged, a QuickTime file
   that fits is rewrapped as MP4, and anything larger is re-encoded here with
   WebCodecs (H.264 + AAC) at the largest frame its bitrate keeps sharp.
   Mediabunny (MPL-2.0, vendored) loads only when a film has to change. */
(function studioVideo() {
  'use strict';
  const LIMIT = 25_000_000;          // the server's limit, in decimal bytes
  const TARGET = 23_500_000;         // an encode aims lower: rate control and the MP4 index need room
  const MAX_LONG = 1920, MAX_SHORT = 1080;
  const LADDER = [1080, 720, 540, 480, 360];
  const MIN_BITS_PER_PIXEL = 0.05;   // thinner than this, a smaller frame looks better
  const HIGH_BITS_PER_PIXEL = 0.15;  // more than this only adds bytes, not quality
  const MIN_VIDEO_BITRATE = 200_000;
  const MAX_FRAME_RATE = 30;
  const RATE_SAFETY = 0.92;          // encoders overshoot their target a little
  const LIBRARY = '/vendor/mediabunny-1.65.2/mediabunny.min.js';

  const even = value => Math.max(2, 2 * Math.round(value / 2));
  const fits = (width, height) => Math.max(width, height) <= MAX_LONG && Math.min(width, height) <= MAX_SHORT;
  // The largest frame no bigger than the source within one step of the ladder.
  const frame = (width, height, shortEdge) => {
    const scale = Math.min(1, shortEdge / Math.min(width, height), Math.round(shortEdge * 16 / 9) / Math.max(width, height));
    return { width: even(width * scale), height: even(height * scale) };
  };
  // The MP4 index grows with every video frame and audio packet.
  const overhead = (duration, frameRate) => 64_000 + Math.ceil(duration * (frameRate * 10 + 300));
  const audioRate = duration => duration > 600 ? 64_000 : duration > 240 ? 96_000 : 128_000;
  const failure = (code, extra = {}) => Object.assign(new Error(code), { code }, extra);

  // An ISO media file opens with 'ftyp'; QuickTime movies name the brand 'qt  '.
  function isMp4Header(bytes) {
    if (!bytes || bytes.length < 12) return false;
    const text = String.fromCharCode(...Array.from(bytes.slice(4, 12)));
    return text.slice(0, 4) === 'ftyp' && text.slice(4) !== 'qt  ';
  }

  function plan({ size, width, height, duration, frameRate, mp4 }) {
    if (!(size > 0 && width > 0 && height > 0 && duration > 0 && Number.isFinite(duration))) return { action: 'reject' };
    if (size <= LIMIT && fits(width, height)) return { action: mp4 ? 'keep' : 'rewrap' };
    const fps = Math.min(MAX_FRAME_RATE, frameRate > 0 && Number.isFinite(frameRate) ? frameRate : 30);
    const audioBitrate = audioRate(duration);
    const available = Math.floor(((TARGET - overhead(duration, fps)) * 8 / duration - audioBitrate) * RATE_SAFETY);
    if (!(available >= MIN_VIDEO_BITRATE)) {
      const perSecond = MIN_VIDEO_BITRATE / RATE_SAFETY + 64_000 + 8 * (fps * 10 + 300);
      return { action: 'too-long', maxSeconds: Math.floor((TARGET - 64_000) * 8 / perSecond) };
    }
    const steps = LADDER.map(edge => frame(width, height, edge));
    const chosen = steps.find(step => available / (step.width * step.height * fps) >= MIN_BITS_PER_PIXEL) || steps[steps.length - 1];
    const videoBitrate = Math.min(available, Math.max(800_000, Math.round(chosen.width * chosen.height * fps * HIGH_BITS_PER_PIXEL)));
    return {
      action: 'encode', width: chosen.width, height: chosen.height,
      ...(frameRate > MAX_FRAME_RATE ? { frameRate: MAX_FRAME_RATE } : {}),
      videoBitrate, audioBitrate,
      expectedBytes: Math.ceil((videoBitrate + audioBitrate) * duration / 8) + overhead(duration, fps)
    };
  }

  async function convert(library, file, target, { onProgress, signal }) {
    const input = new library.Input({ source: new library.BlobSource(file), formats: library.ALL_FORMATS });
    try {
      const output = new library.Output({ format: new library.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new library.BufferTarget() });
      const encode = target.action === 'encode';
      const conversion = await library.Conversion.init({
        input, output, tracks: 'primary',
        video: encode ? {
          width: target.width, height: target.height, fit: 'fill', codec: 'avc', forceTranscode: true,
          // An explicit bitrate: a bare number would be read as a quality factor, not bits per second.
          quality: new library.Quality({ bitrate: target.videoBitrate }), allowTransformationMetadata: false,
          ...(target.frameRate ? { frameRate: target.frameRate } : {})
        } : {},
        // Sound is kept whenever this browser can read it; otherwise the film has none.
        audio: !encode ? {} : target.audioCodec ? track => ({
          codec: target.audioCodec, forceTranscode: true, quality: new library.Quality({ bitrate: target.audioBitrate }),
          numberOfChannels: Math.min(2, track.numberOfChannels || 2),
          ...([44_100, 48_000].includes(track.sampleRate) ? {} : { sampleRate: 48_000 })
        }) : { discard: true }
      });
      if (!conversion.isValid) throw failure('unsupported');
      const cancel = () => { conversion.cancel().catch(() => {}); };
      if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
      conversion.onProgress = progress => onProgress?.(Math.max(0, Math.min(1, progress)));
      try { await conversion.execute(); }
      finally { signal?.removeEventListener('abort', cancel); }
      if (signal?.aborted) throw failure('canceled');
      return new Blob([output.target.buffer], { type: 'video/mp4' });
    } catch (error) {
      if (signal?.aborted) throw failure('canceled');
      throw error?.code ? error : failure('failed');
    } finally {
      input.dispose();
    }
  }

  /* Returns the film to publish. `meta` is what the preview read from the file:
     size, display width/height, duration and whether the container is MP4. */
  async function prepare(file, meta, { onProgress, signal, library: load = () => import(LIBRARY) } = {}) {
    let target = plan(meta);
    if (target.action === 'keep') return { blob: file, target };
    if (target.action === 'reject') throw failure('failed');
    if (target.action === 'too-long') throw failure('too-long', { maxSeconds: target.maxSeconds });
    if (typeof VideoEncoder !== 'function' || typeof VideoDecoder !== 'function') throw failure('unsupported');
    let library;
    try { library = await load(); } catch { throw failure('unsupported'); }
    if (target.action === 'rewrap') {
      const blob = await convert(library, file, target, { onProgress, signal });
      if (blob.size <= LIMIT) return { blob, target };
      target = plan({ ...meta, size: Infinity });
    }
    // The exact frame rate and length come from the file itself.
    const input = new library.Input({ source: new library.BlobSource(file), formats: library.ALL_FORMATS });
    let hasAudio = false;
    try {
      const video = await input.getPrimaryVideoTrack();
      if (!video || !(await video.canDecode())) throw failure('unsupported');
      const audio = await input.getPrimaryAudioTrack();
      hasAudio = !!audio && await audio.canDecode();
      const [stats, duration] = await Promise.all([video.computePacketStats(240).catch(() => null), input.computeDuration().catch(() => 0)]);
      target = plan({ ...meta, size: Infinity, frameRate: stats?.averagePacketRate || meta.frameRate, duration: duration > 0 ? duration : meta.duration });
    } catch (error) {
      throw error?.code ? error : failure('unsupported');
    } finally {
      input.dispose();
    }
    if (target.action === 'too-long') throw failure('too-long', { maxSeconds: target.maxSeconds });
    if (!(await library.canEncodeVideo('avc', { width: target.width, height: target.height, bitrate: target.videoBitrate }))) throw failure('unsupported');
    if (hasAudio) {
      target.audioCodec = await library.getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: 2, sampleRate: 48_000, bitrate: target.audioBitrate });
      if (!target.audioCodec) throw failure('unsupported');
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const blob = await convert(library, file, target, { onProgress, signal });
      if (blob.size <= LIMIT) return { blob, target };
      // Rate control overshot: one more pass, scaled down to land well inside.
      target = { ...target, videoBitrate: Math.floor(target.videoBitrate * (LIMIT * 0.9 / blob.size)) };
    }
    throw failure('too-large');
  }

  window.BQStudioVideo = Object.freeze({ LIMIT, plan, prepare, isMp4Header });
})();
