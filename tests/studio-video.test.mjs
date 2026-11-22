import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, stat } from 'node:fs/promises';

const source = await readFile(new URL('../preview_site/js/studio-video.js', import.meta.url), 'utf8');

function load(extra = {}) {
  const window = {};
  vm.runInNewContext(source, { window, Blob, Math, Number, String, Array, Object, Promise, Error, ...extra });
  return window.BQStudioVideo;
}
const video = load();
const MB = 1_000_000;
const plain = value => JSON.parse(JSON.stringify(value));

test('the vendored converter is the pinned, licensed Mediabunny build the planner loads', async () => {
  const base = new URL('../preview_site/vendor/mediabunny-1.65.2/', import.meta.url);
  const bundle = await readFile(new URL('mediabunny.min.js', base), 'utf8');
  assert.match(bundle.slice(0, 400), /Mozilla Public\s+\* License, v\. 2\.0/);
  assert.match(bundle, /export\{[^}]*\bConversion\b/);
  assert.ok((await stat(new URL('LICENSE', base))).size > 10_000);
  assert.match(await readFile(new URL('NOTICE.txt', base), 'utf8'), /mediabunny@1\.65\.2/);
  assert.match(source, /'\/vendor\/mediabunny-1\.65\.2\/mediabunny\.min\.js'/);
});

test('only an ISO MP4 header counts as MP4; QuickTime and other files do not', () => {
  const header = (type, brand) => Uint8Array.from(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from(type), Buffer.from(brand)]));
  assert.equal(video.isMp4Header(header('ftyp', 'isom')), true);
  assert.equal(video.isMp4Header(header('ftyp', 'mp42')), true);
  assert.equal(video.isMp4Header(header('ftyp', 'qt  ')), false);
  assert.equal(video.isMp4Header(header('moov', 'isom')), false);
  assert.equal(video.isMp4Header(new Uint8Array(8)), false);
});

test('a film that already fits is sent unchanged; a QuickTime film that fits is only rewrapped', () => {
  assert.deepEqual(plain(video.plan({ size:24 * MB, width:1080, height:1920, duration:40, mp4:true })), { action:'keep' });
  assert.deepEqual(plain(video.plan({ size:25 * MB, width:1920, height:1080, duration:40, mp4:true })), { action:'keep' });
  assert.deepEqual(plain(video.plan({ size:12 * MB, width:1080, height:1920, duration:40, mp4:false })), { action:'rewrap' });
  assert.equal(video.plan({ size:0, width:1080, height:1920, duration:40, mp4:true }).action, 'reject');
  assert.equal(video.plan({ size:MB, width:1080, height:1920, duration:Infinity, mp4:true }).action, 'reject');
});

test('a large reel keeps 1080p while its bitrate stays sharp and steps down only when it would be thin', () => {
  const short = video.plan({ size:180 * MB, width:1080, height:1920, duration:30, mp4:true });
  assert.deepEqual([short.action, short.width, short.height], ['encode', 1080, 1920]);
  assert.equal(short.audioBitrate, 128_000);
  assert.ok(short.expectedBytes <= 23.5 * MB, `${short.expectedBytes}`);
  const minute = video.plan({ size:400 * MB, width:1080, height:1920, duration:60, mp4:true });
  assert.deepEqual([minute.width, minute.height], [720, 1280], 'a minute at ~2.8 Mbps is cleaner at 720p');
  const long = video.plan({ size:900 * MB, width:1920, height:1080, duration:300, mp4:true });
  assert.deepEqual([long.width, long.height, long.audioBitrate], [640, 360, 96_000]);
  // A 4K file under 25 MB is still resized: the gallery has no use for 4K frames.
  const uhd = video.plan({ size:20 * MB, width:3840, height:2160, duration:8, mp4:true });
  assert.deepEqual([uhd.action, uhd.width, uhd.height], ['encode', 1920, 1080]);
  assert.ok(uhd.videoBitrate <= 1920 * 1080 * 30 * 0.15 + 1, 'a short film is not padded beyond what its frame needs');
  const sixty = video.plan({ size:90 * MB, width:1080, height:1920, duration:20, frameRate:59.94, mp4:true });
  assert.equal(sixty.frameRate, 30);
  assert.equal(video.plan({ size:90 * MB, width:1080, height:1920, duration:20, frameRate:25, mp4:true }).frameRate, undefined);
});

test('a film too long for 25 MB is refused with the longest length that would fit', () => {
  const result = video.plan({ size:2_000 * MB, width:1920, height:1080, duration:20 * 60, mp4:true });
  assert.equal(result.action, 'too-long');
  assert.ok(result.maxSeconds > 9 * 60 && result.maxSeconds < 12 * 60, `${result.maxSeconds}`);
  const atLimit = video.plan({ size:2_000 * MB, width:1920, height:1080, duration:result.maxSeconds, mp4:true });
  assert.equal(atLimit.action, 'encode');
});

test('every planned encode fits the limit, keeps its shape and never enlarges the frame', () => {
  const sources = [[1080, 1920], [1920, 1080], [3840, 2160], [2160, 3840], [720, 1280], [406, 720], [3396, 600], [1080, 1080], [4096, 2160]];
  for (const [width, height] of sources) for (const frameRate of [24, 30, 60]) {
    for (let duration = 3; duration <= 660; duration = Math.ceil(duration * 1.37)) {
      const result = video.plan({ size:Infinity, width, height, duration, frameRate, mp4:true });
      if (result.action === 'too-long') { assert.ok(duration > 540, `${width}x${height}@${frameRate} ${duration}s`); continue; }
      const label = `${width}x${height}@${frameRate} ${duration}s -> ${result.width}x${result.height}`;
      assert.equal(result.action, 'encode', label);
      assert.ok(result.expectedBytes <= 23.5 * MB, label);
      assert.ok((result.videoBitrate + result.audioBitrate) * duration / 8 < 25 * MB, label);
      assert.equal(result.width % 2 + result.height % 2, 0, label);
      assert.ok(result.width <= width + 1 && result.height <= height + 1, label);
      assert.ok(Math.max(result.width, result.height) <= 1920 && Math.min(result.width, result.height) <= 1080, label);
      assert.ok(Math.abs(result.width / result.height - width / height) / (width / height) < 0.02, label);
      assert.ok(result.videoBitrate >= 200_000, label);
    }
  }
});

/* A stand-in for Mediabunny: records the conversion it was asked for and
   writes an output of a chosen size. */
function library({ sizes = [10 * MB], canDecode = true, canEncode = true, audioCodec = 'aac', audio = true, fps = 29.97, duration = 0 } = {}) {
  const calls = { conversions:[], loaded:0, disposed:0, canceled:0 };
  class Quality { constructor(value) { this.value = value; } }
  const track = { canDecode:async () => canDecode, computePacketStats:async () => ({ averagePacketRate:fps }) };
  const audioTrack = { canDecode:async () => true, numberOfChannels:6, sampleRate:96_000 };
  const fake = {
    ALL_FORMATS:['all'], Quality,
    BlobSource:class { constructor(file) { this.file = file; } },
    BufferTarget:class { constructor() { this.buffer = null; } },
    Mp4OutputFormat:class { constructor(options) { this.options = options; } },
    Output:class { constructor(options) { Object.assign(this, options); } },
    Input:class {
      constructor(options) { this.options = options; }
      async getPrimaryVideoTrack() { return track; }
      async getPrimaryAudioTrack() { return audio ? audioTrack : null; }
      async computeDuration() { return duration; }
      dispose() { calls.disposed++; }
    },
    canEncodeVideo:async () => canEncode,
    getFirstEncodableAudioCodec:async () => audioCodec,
    Conversion:{ init:async options => {
      const record = { options, audio:typeof options.audio === 'function' ? options.audio(audioTrack) : options.audio };
      calls.conversions.push(record);
      const conversion = {
        isValid:true,
        async execute() {
          this.onProgress?.(0.5);
          if (record.canceled) throw new Error('canceled');
          options.output.target.buffer = new ArrayBuffer(sizes[Math.min(calls.conversions.length, sizes.length) - 1]);
        },
        async cancel() { record.canceled = true; calls.canceled++; }
      };
      return conversion;
    } }
  };
  return { calls, load:async () => { calls.loaded++; return fake; } };
}
const encoders = { VideoEncoder:function VideoEncoder() {}, VideoDecoder:function VideoDecoder() {} };
const film = { name:'reel.mov', size:180 * MB };
const meta = { size:180 * MB, width:2160, height:3840, duration:42, mp4:true };

test('a large film is re-encoded once as H.264 + AAC at the planned frame and bitrate', async () => {
  const tools = load(encoders), fake = library({ duration:42.04 });
  const progress = [];
  const result = await tools.prepare(film, meta, { library:fake.load, onProgress:value => progress.push(value) });
  assert.equal(result.blob.type, 'video/mp4');
  assert.equal(result.blob.size, 10 * MB);
  assert.equal(fake.calls.conversions.length, 1);
  const { options, audio } = fake.calls.conversions[0];
  assert.equal(options.tracks, 'primary');
  assert.equal(options.output.format.options.fastStart, 'in-memory', 'the index comes first, so playback starts at once');
  // Mediabunny reads a bare number as a quality factor; the target must be an explicit bitrate.
  assert.deepEqual(plain({ ...options.video, quality:options.video.quality.value }), {
    width:1080, height:1920, fit:'fill', codec:'avc', forceTranscode:true, quality:{ bitrate:result.target.videoBitrate }, allowTransformationMetadata:false
  });
  assert.deepEqual(plain({ ...audio, quality:audio.quality.value }), { codec:'aac', forceTranscode:true, quality:{ bitrate:128_000 }, numberOfChannels:2, sampleRate:48_000 });
  assert.deepEqual(progress, [0.5]);
  assert.ok(fake.calls.disposed >= 2, 'every opened input is released');
});

test('a film that already fits never loads the converter', async () => {
  const tools = load(encoders), fake = library();
  const fits = { name:'reel.mp4', size:12 * MB };
  const result = await tools.prepare(fits, { size:12 * MB, width:1080, height:1920, duration:30, mp4:true }, { library:fake.load });
  assert.equal(result.blob, fits);
  assert.equal(fake.calls.loaded, 0);
});

test('a QuickTime film is rewrapped without re-encoding, and re-encoded only if the result is too big', async () => {
  const tools = load(encoders);
  const small = library({ sizes:[11 * MB] });
  const rewrapped = await tools.prepare(film, { ...meta, size:11 * MB, width:1080, height:1920, mp4:false }, { library:small.load });
  assert.equal(rewrapped.target.action, 'rewrap');
  assert.equal(small.calls.conversions.length, 1);
  assert.deepEqual(plain(small.calls.conversions[0].options.video), {});
  const large = library({ sizes:[26 * MB, 9 * MB] });
  const encoded = await tools.prepare(film, { ...meta, size:24 * MB, width:1080, height:1920, mp4:false }, { library:large.load });
  assert.equal(encoded.target.action, 'encode');
  assert.equal(large.calls.conversions.length, 2);
  assert.equal(large.calls.conversions[1].options.video.codec, 'avc');
});

test('an overshooting encode gets one smaller pass, then a clear failure', async () => {
  const tools = load(encoders);
  const once = library({ sizes:[26 * MB, 22 * MB] });
  const result = await tools.prepare(film, meta, { library:once.load });
  assert.equal(result.blob.size, 22 * MB);
  const [first, second] = once.calls.conversions.map(call => call.options.video.quality.value.bitrate);
  assert.ok(second < first * 0.9, `${first} -> ${second}`);
  const never = library({ sizes:[26 * MB, 26 * MB] });
  await assert.rejects(tools.prepare(film, meta, { library:never.load }), { code:'too-large' });
});

test('a browser that cannot decode or encode says so instead of failing silently', async () => {
  await assert.rejects(load({}).prepare(film, meta, { library:library().load }), { code:'unsupported' });
  const tools = load(encoders);
  await assert.rejects(tools.prepare(film, meta, { library:library({ canDecode:false }).load }), { code:'unsupported' });
  await assert.rejects(tools.prepare(film, meta, { library:library({ canEncode:false }).load }), { code:'unsupported' });
  await assert.rejects(tools.prepare(film, meta, { library:library({ audioCodec:null }).load }), { code:'unsupported' });
  await assert.rejects(tools.prepare(film, meta, { library:async () => { throw new Error('blocked'); } }), { code:'unsupported' });
  const silent = library({ audio:false });
  await tools.prepare(film, meta, { library:silent.load });
  assert.deepEqual(plain(silent.calls.conversions[0].audio), { discard:true });
});

test('the measured length and frame rate decide the plan, and cancelling stops the encode', async () => {
  const tools = load(encoders);
  const longer = library({ duration:20 * 60 });
  await assert.rejects(tools.prepare(film, meta, { library:longer.load }), { code:'too-long' });
  const controller = new AbortController();
  const fake = library();
  const pending = tools.prepare(film, meta, { library:fake.load, signal:controller.signal, onProgress:() => controller.abort() });
  await assert.rejects(pending, { code:'canceled' });
  assert.equal(fake.calls.canceled, 1);
});
