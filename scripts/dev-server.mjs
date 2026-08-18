import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';

const PORT = parseInt(process.env.PORT || '8080', 10);
const ROOT = path.resolve('preview_site');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
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
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json'
};

// Auto-build watcher with debounce
let buildTimeout = null;
let isBuilding = false;

function triggerAutoBuild(changedFile) {
  if (buildTimeout) clearTimeout(buildTimeout);
  buildTimeout = setTimeout(() => {
    if (isBuilding) return;
    isBuilding = true;
    console.log(`[Watch] File changed: ${changedFile}. Compiling bundles...`);
    const child = fork(path.resolve('scripts/build-assets.mjs'));
    child.on('close', (code) => {
      isBuilding = false;
      if (code === 0) {
        console.log('[Watch] Build succeeded. Assets up to date.');
      } else {
        console.error(`[Watch] Build failed with code ${code}`);
      }
    });
  }, 250);
}

// Watch JS and CSS directories
const watchDirs = [path.join(ROOT, 'js'), path.join(ROOT, 'css')];
watchDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      // Skip minified files to prevent recursive build loop
      if (filename.includes('.min.') || filename.endsWith('.min.js') || filename.endsWith('.min.css')) return;
      if (filename.endsWith('.js') || filename.endsWith('.css')) {
        triggerAutoBuild(filename);
      }
    });
  }
});

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, decodeURIComponent(urlPath));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Service-Worker-Allowed': '/'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dev Server] Running at http://localhost:${PORT}`);
  console.log('[Dev Server] Live watcher active on preview_site/js and preview_site/css');
});
