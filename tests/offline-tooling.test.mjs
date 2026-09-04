import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {
  contentHash,
  fingerprintQuotedAssets,
  fingerprintVersionedLocalAssets,
  serviceWorkerVersion,
  stripStaticBlogPosts
} from '../scripts/build-assets.mjs';
import {
  DEFAULT_HOST,
  isSpaRoute,
  resolveRequestTarget,
  startDevServer
} from '../scripts/dev-server.mjs';
import { validateStructure } from '../scripts/validate-structure.mjs';

const siteRoot = new URL('../preview_site/', import.meta.url);

test('built code references are content-addressed and structural validation passes', async () => {
  assert.deepEqual(await validateStructure(), []);

  const html = await readFile(new URL('index.html', siteRoot), 'utf8');
  const notFound = await readFile(new URL('404.html', siteRoot), 'utf8');
  const sw = await readFile(new URL('sw.js', siteRoot), 'utf8');
  assert.match(html, /css\/modern-framer\.min\.css\?v=[a-f0-9]{12}/);
  assert.match(html, /css\/experience\.min\.css\?v=[a-f0-9]{12}/);
  assert.match(html, /site\.webmanifest\?v=[a-f0-9]{12}/);
  assert.match(html, /assets\/portrait\.webp\?v=[a-f0-9]{12}/);
  assert.match(notFound, /css\/fonts\.css\?v=[a-f0-9]{12}/);
  assert.equal(sw.match(/const SW_VERSION = '([^']+)'/)[1], serviceWorkerVersion(sw, html));
});

test('fingerprinting and static-sitemap cleanup are deterministic', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bq-build-'));
  try {
    await mkdir(path.join(root, 'js'));
    await writeFile(path.join(root, 'js/app.js'), 'console.log("stable");\n');
    const input = '<script src="js/app.js?v=old"></script>';
    const expected = contentHash(Buffer.from('console.log("stable");\n'));
    const onceBuilt = await fingerprintQuotedAssets(input, root);
    const twiceBuilt = await fingerprintQuotedAssets(onceBuilt, root);
    assert.equal(onceBuilt, `<script src="js/app.js?v=${expected}"></script>`);
    assert.equal(twiceBuilt, onceBuilt);

    const versioned = await fingerprintVersionedLocalAssets('<script src="js/app.js?v=1"></script>', root);
    assert.equal(versioned, onceBuilt);

    const sitemap = '<urlset>\n  <url><loc>https://bqurtas.com/blog/8</loc></url>\n  <url><loc>https://bqurtas.com/ku/blog/000</loc></url>\n  <url><loc>https://bqurtas.com/design</loc></url>\n</urlset>\n';
    const stripped = stripStaticBlogPosts(sitemap);
    assert.doesNotMatch(stripped, /\/blog\/8/);
    assert.doesNotMatch(stripped, /\/blog\/000/);
    assert.match(stripped, /\/design/);
    assert.equal(stripStaticBlogPosts(stripped), stripped);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function loadServiceWorker({
  failAsset = '',
  offline = false,
  cachePutFails = false,
  cachedAssetUrl = '',
  basicNetworkResponse = false
} = {}) {
  const handlers = {};
  const added = [];
  const offlinePage = new Response('offline shell');
  let skipped = false;
  let fetchCount = 0;
  let putCount = 0;
  const cache = {
    async add(asset) {
      added.push(asset);
      if (asset === failAsset) throw new Error('simulated missing asset');
    },
    async keys() { return []; },
    async put() {
      putCount += 1;
      if (cachePutFails) throw new Error('simulated cache write failure');
    },
    async delete() { return true; }
  };
  const caches = {
    async open() { return cache; },
    async keys() { return []; },
    async delete() { return true; },
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      if (key === '/index.html') return offlinePage.clone();
      return key === cachedAssetUrl ? new Response('cached asset') : undefined;
    }
  };
  const context = {
    URL,
    Response,
    Promise,
    Error,
    caches,
    console: { warn() {} },
    fetch: async () => {
      fetchCount += 1;
      if (offline) throw new Error('offline');
      const response = new Response('network');
      if (basicNetworkResponse) Object.defineProperty(response, 'type', { value: 'basic' });
      return response;
    },
    self: {
      location: { origin: 'https://bqurtas.com' },
      clients: { async claim() {} },
      addEventListener(type, handler) { handlers[type] = handler; },
      async skipWaiting() { skipped = true; }
    }
  };
  const source = await readFile(new URL('sw.js', siteRoot), 'utf8');
  vm.runInNewContext(source, context);
  return {
    handlers,
    added,
    get skipped() { return skipped; },
    get fetchCount() { return fetchCount; },
    get putCount() { return putCount; }
  };
}

test('service worker installs an offline shell even when a secondary asset fails', async () => {
  const worker = await loadServiceWorker({ failAsset: '/favicon.ico' });
  let install;
  worker.handlers.install({ waitUntil(promise) { install = promise; } });
  await install;
  assert.ok(worker.added.includes('/index.html'));
  assert.equal(worker.skipped, true);
});

test('service worker never intercepts API requests and serves first-install offline navigation', async () => {
  const apiWorker = await loadServiceWorker();
  let intercepted = false;
  apiWorker.handlers.fetch({
    request: { method: 'GET', url: 'https://bqurtas.com/api/stats', headers: new Headers(), mode: 'cors' },
    respondWith() { intercepted = true; },
    waitUntil() {}
  });
  assert.equal(intercepted, false);
  assert.equal(apiWorker.fetchCount, 0);

  const offlineWorker = await loadServiceWorker({ offline: true });
  let responsePromise;
  offlineWorker.handlers.fetch({
    request: { method: 'GET', url: 'https://bqurtas.com/design/logo', headers: new Headers({ Accept: 'text/html' }), mode: 'navigate' },
    respondWith(value) { responsePromise = value; },
    waitUntil() {}
  });
  const response = await responsePromise;
  assert.equal(await response.text(), 'offline shell');
});

test('service worker keeps a successful navigation when Cache Storage writes fail', async () => {
  const worker = await loadServiceWorker({ cachePutFails: true, basicNetworkResponse: true });
  let responsePromise;
  worker.handlers.fetch({
    request: { method: 'GET', url: 'https://bqurtas.com/bio', headers: new Headers({ Accept: 'text/html' }), mode: 'navigate' },
    respondWith(value) { responsePromise = value; },
    waitUntil() {}
  });

  const response = await responsePromise;
  assert.equal(await response.text(), 'network');
  assert.equal(worker.fetchCount, 1);
  assert.equal(worker.putCount, 1);
});

test('service worker does not fetch an immutable fingerprint that is already cached', async () => {
  const assetUrl = 'https://bqurtas.com/js/main.v420.min.js?v=012345abcdef';
  const worker = await loadServiceWorker({ cachedAssetUrl: assetUrl, offline: true });
  let responsePromise;
  worker.handlers.fetch({
    request: { method: 'GET', url: assetUrl, headers: new Headers({ Accept: '*/*' }), mode: 'cors' },
    respondWith(value) { responsePromise = value; },
    waitUntil() { assert.fail('immutable cache hit must not schedule network work'); }
  });

  const response = await responsePromise;
  assert.equal(await response.text(), 'cached asset');
  assert.equal(worker.fetchCount, 0);
});

test('dev-server path resolution rejects traversal, malformed escapes and escaping symlinks', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bq-dev-'));
  const root = path.join(parent, 'site');
  const outside = path.join(parent, 'outside');
  try {
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await mkdir(outside);
    await writeFile(path.join(root, 'index.html'), 'INDEX');
    await writeFile(path.join(root, 'assets/app.js'), 'APP');
    await writeFile(path.join(outside, 'secret.txt'), 'SECRET');
    await symlink(outside, path.join(root, 'escape'));

    assert.equal(resolveRequestTarget('/..%2foutside/secret.txt', root).status, 403);
    assert.equal(resolveRequestTarget('/%E0%A4%A', root).status, 400);
    assert.equal(resolveRequestTarget('/escape/secret.txt', root).status, 403);
    assert.equal(resolveRequestTarget('/missing.js', root).status, 404);
    assert.equal(resolveRequestTarget('/design/logo', root).spaFallback, true);
    assert.equal(resolveRequestTarget('/assets/app.js', root).spaFallback, undefined);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('dev server stays on loopback and only falls back for known application routes', async () => {
  assert.equal(DEFAULT_HOST, '127.0.0.1');
  assert.equal(isSpaRoute('/ku/design/stationery'), true);
  assert.equal(isSpaRoute('/blog/12'), true);
  assert.equal(isSpaRoute('/blog/0'), false);
  assert.equal(isSpaRoute('/missing-file.js'), false);
  assert.throws(() => startDevServer({ host: '0.0.0.0', watch: false }), /non-loopback/);

  const root = await mkdtemp(path.join(os.tmpdir(), 'bq-server-'));
  await writeFile(path.join(root, 'index.html'), 'INDEX');
  const server = startDevServer({ port: 0, root, watch: false });
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.equal(address.address, '127.0.0.1');
    const base = `http://127.0.0.1:${address.port}`;

    const route = await fetch(`${base}/fr/contact`);
    assert.equal(route.status, 200);
    assert.equal(await route.text(), 'INDEX');

    const missingAsset = await fetch(`${base}/missing.js`);
    assert.equal(missingAsset.status, 404);
    assert.equal(await missingAsset.text(), 'Not Found');
  } finally {
    server.close();
    await once(server, 'close');
    await rm(root, { recursive: true, force: true });
  }
});
