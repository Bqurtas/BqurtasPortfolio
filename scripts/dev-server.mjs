import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_ROOT = path.join(projectRoot, 'preview_site');
export const DEFAULT_HOST = '127.0.0.1';

const LANGUAGES = new Set(['ku', 'kmr', 'ar', 'fr', 'tr', 'sv']);
const ROOMS = new Set(['blog', 'bio', 'contact']);
const DESIGN_TABS = new Set([
  'logo', 'official', 'book', 'posters', 'social', 'events',
  'stationery', 'image', 'video', 'other'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.xml': 'application/xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8'
};

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

export function isSpaRoute(pathname) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length && LANGUAGES.has(parts[0])) parts.shift();
  if (parts.length === 0) return true;
  if (parts.length === 1 && (ROOMS.has(parts[0]) || parts[0] === 'design')) return true;
  if (parts.length === 2 && parts[0] === 'design' && DESIGN_TABS.has(parts[1])) return true;
  return parts.length === 2 && parts[0] === 'blog' && /^[1-9]\d{0,17}$/.test(parts[1]);
}

/* Resolve a URL without trusting URL/path normalization. Encoded separators,
   malformed escapes, traversal and symlinks outside preview_site are rejected
   before anything is read. */
export function resolveRequestTarget(rawUrl, root = DEFAULT_ROOT) {
  const rootPath = path.resolve(root);
  let rootReal;
  try { rootReal = fs.realpathSync(rootPath); } catch {
    return { status: 500, reason: 'Site root is unavailable' };
  }

  const rawPath = String(rawUrl || '/').split(/[?#]/, 1)[0] || '/';
  let pathname;
  try { pathname = decodeURIComponent(rawPath); } catch {
    return { status: 400, reason: 'Malformed URL encoding' };
  }
  if (pathname.includes('\0')) return { status: 400, reason: 'Malformed URL path' };

  /* Treat backslashes as separators on every OS so Windows-style traversal is
     not accidentally safe on one development machine and unsafe on another. */
  pathname = pathname.replace(/\\/g, '/');
  const candidate = path.resolve(rootPath, `.${pathname.startsWith('/') ? pathname : `/${pathname}`}`);
  if (!isInside(rootPath, candidate)) return { status: 403, reason: 'Path escapes site root' };

  let target = candidate;
  try {
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      return { status: 403, reason: 'Path is not accessible' };
    }
  }

  if (fs.existsSync(target)) {
    let realTarget;
    try { realTarget = fs.realpathSync(target); } catch {
      return { status: 403, reason: 'Path is not accessible' };
    }
    if (!isInside(rootReal, realTarget)) return { status: 403, reason: 'Symlink escapes site root' };
    if (!fs.statSync(realTarget).isFile()) return { status: 404, reason: 'Not Found' };
    return { status: 200, filePath: realTarget, pathname };
  }

  if (isSpaRoute(pathname)) {
    let indexPath;
    try { indexPath = fs.realpathSync(path.join(rootPath, 'index.html')); } catch {
      return { status: 500, reason: 'Site index is unavailable' };
    }
    if (!isInside(rootReal, indexPath)) return { status: 403, reason: 'Site index escapes root' };
    return { status: 200, filePath: indexPath, pathname, spaFallback: true };
  }

  return { status: 404, reason: 'Not Found' };
}

function sendText(res, status, message) {
  const body = Buffer.from(message);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=UTF-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

export function createRequestHandler(root = DEFAULT_ROOT) {
  return (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      sendText(res, 405, 'Method Not Allowed');
      return;
    }

    const result = resolveRequestTarget(req.url, root);
    if (result.status !== 200) {
      sendText(res, result.status, result.reason);
      return;
    }

    fs.readFile(result.filePath, (error, data) => {
      if (error) {
        sendText(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not Found' : 'Read failed');
        return;
      }
      const ext = path.extname(result.filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': data.length,
        'Cache-Control': 'no-store',
        'Service-Worker-Allowed': '/',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  };
}

function createBuildWatcher(root) {
  let buildTimeout = null;
  let isBuilding = false;
  const watchers = [];

  const trigger = (changedFile) => {
    if (buildTimeout) clearTimeout(buildTimeout);
    buildTimeout = setTimeout(() => {
      if (isBuilding) return;
      isBuilding = true;
      console.log(`[Watch] File changed: ${changedFile}. Compiling bundles...`);
      const child = fork(path.join(projectRoot, 'scripts/build-assets.mjs'), [], { cwd: projectRoot });
      child.on('close', (code) => {
        isBuilding = false;
        if (code === 0) console.log('[Watch] Build succeeded. Assets up to date.');
        else console.error(`[Watch] Build failed with code ${code}`);
      });
    }, 250);
  };

  for (const directory of [path.join(root, 'js'), path.join(root, 'css')]) {
    if (!fs.existsSync(directory)) continue;
    watchers.push(fs.watch(directory, { recursive: true }, (_eventType, filename) => {
      if (!filename || filename.includes('.min.')) return;
      if (filename.endsWith('.js') || filename.endsWith('.css')) trigger(filename);
    }));
  }

  return () => {
    if (buildTimeout) clearTimeout(buildTimeout);
    for (const watcher of watchers) watcher.close();
  };
}

export function startDevServer({
  port = Number.parseInt(process.env.PORT || '8080', 10),
  host = DEFAULT_HOST,
  root = DEFAULT_ROOT,
  watch = true
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`Invalid port: ${port}`);
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error(`Refusing non-loopback dev-server host: ${host}`);
  }

  const stopWatching = watch ? createBuildWatcher(root) : () => {};
  const server = http.createServer(createRequestHandler(root));
  server.on('close', stopWatching);
  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = address && typeof address === 'object' ? address.port : port;
    console.log(`[Dev Server] Running at http://${host}:${actualPort}`);
    if (watch) console.log('[Dev Server] Live watcher active on preview_site/js and preview_site/css');
  });
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) startDevServer();
