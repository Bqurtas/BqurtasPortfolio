/* Cloudflare-owned gallery publishing. Call only after the Studio session,
   editor credential, same-origin and durable rate-limit gates have passed. */
import { json, readRequestBytes } from './_session.js';
import { IMAGE_FILE_PREFIXES, updateGalleryManifest, withStableImageIndices } from '../_gallery-update.js';

const REPOSITORY = 'Bqurtas/BqurtasPortfolio';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPOSITORY}/`;
const PREFIXES = IMAGE_FILE_PREFIXES;
const MANIFEST_PATH = 'preview_site/assets/gallery-manifest.json';
const SHA = /^[a-f0-9]{40}$/i;
const MAX_BASE64 = 7_500_000;
const MAX_RESPONSE = 2 * 1024 * 1024;

export function githubWorksConfigured(env) {
  return typeof env?.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN.trim().length > 0;
}

function knownFolder(folder) {
  return typeof folder === 'string' && Object.hasOwn(PREFIXES, folder);
}

function workPath(path) {
  if (typeof path !== 'string') return null;
  const parts = path.split('/');
  return parts.length === 2 && knownFolder(parts[0])
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,174}\.webp$/.test(parts[1])
    && !parts[1].includes('..') ? { folder:parts[0], file:parts[1] } : null;
}

class GithubWorkError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status; }
}

async function githubApiRequest(env, resource, { method = 'GET', body, signal, maximum = MAX_RESPONSE } = {}) {
  let response;
  try {
    response = await fetch(API + resource, {
      method, redirect:'manual', signal:signal || AbortSignal.timeout(20_000),
      headers:{
        Accept:'application/vnd.github+json', 'Content-Type':'application/json',
        Authorization:`Bearer ${env.GITHUB_TOKEN.trim()}`,
        'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'Bqurtas-Studio'
      },
      ...(body ? { body:JSON.stringify(body) } : {})
    });
    if (response.status >= 300 && response.status < 400) throw new GithubWorkError('studio-github-invalid');
    if (response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
      throw new GithubWorkError('studio-github-rate-limited', 429);
    }
    if (response.status === 401 || response.status === 403) throw new GithubWorkError('studio-github-auth', 502);
    if (response.status === 404) throw new GithubWorkError('studio-github-not-found', 502);
    if (response.status === 409 || response.status === 422) throw new GithubWorkError('studio-github-conflict', 409);
    if (!response.ok) throw new GithubWorkError('studio-github-unavailable');
    const raw = new TextDecoder('utf-8', { fatal:true }).decode(await readRequestBytes(response, maximum));
    try { return JSON.parse(raw); } catch { throw new GithubWorkError('studio-github-invalid'); }
  } catch (error) {
    if (error instanceof GithubWorkError) throw error;
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw new GithubWorkError('studio-github-timeout', 504);
    if (error?.status === 413 || error instanceof SyntaxError) throw new GithubWorkError('studio-github-invalid');
    throw new GithubWorkError('studio-github-unavailable');
  } finally {
    if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {});
  }
}

const githubRequest = (env, path, options = {}) => githubApiRequest(env,
  'contents/' + path.split('/').map(encodeURIComponent).join('/') + (!options.method || options.method === 'GET' ? `?ref=${BRANCH}` : ''), options);

async function listFolder(env, folder) {
  const rows = await githubRequest(env, folder);
  if (!Array.isArray(rows)) throw new GithubWorkError('studio-github-invalid');
  // GitHub Contents silently caps a directory at 1,000 entries. Never allocate
  // a filename or present a complete listing from a potentially truncated set.
  if (rows.length >= 1_000) throw new GithubWorkError('studio-github-folder-limit', 409);
  const files = rows.filter(row => row && row.type === 'file' && !row.target && !row.submodule_git_url
    && typeof row.name === 'string' && row.path === `${folder}/${row.name}` && workPath(row.path)
    && typeof row.sha === 'string' && SHA.test(row.sha))
    .map(row => ({ name:row.name, path:row.path, sha:row.sha.toLowerCase() }));
  return files.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric:true }));
}

function decodeWebp(base64) {
  if (typeof base64 !== 'string' || !base64.length || base64.length > MAX_BASE64
    || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new GithubWorkError('invalid-studio-image', 400);
  }
  let binary;
  try { binary = atob(base64); } catch { throw new GithubWorkError('invalid-studio-image', 400); }
  if (binary.length < 20 || binary.slice(0, 4) !== 'RIFF' || binary.slice(8, 12) !== 'WEBP') {
    throw new GithubWorkError('invalid-studio-image', 400);
  }
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  if (view.getUint32(4, true) + 8 !== bytes.length) throw new GithubWorkError('invalid-studio-image', 400);
  let dimensions;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true), start = offset + 8;
    if (start + size > bytes.length) throw new GithubWorkError('invalid-studio-image', 400);
    const type = binary.slice(offset, offset + 4);
    let width = 0, height = 0;
    if (type === 'VP8X' && size >= 10) {
      width = (bytes[start + 4] | bytes[start + 5] << 8 | bytes[start + 6] << 16) + 1;
      height = (bytes[start + 7] | bytes[start + 8] << 8 | bytes[start + 9] << 16) + 1;
    } else if (type === 'VP8L' && size >= 5 && bytes[start] === 0x2f) {
      const dimensions = view.getUint32(start + 1, true);
      width = (dimensions & 0x3fff) + 1; height = ((dimensions >>> 14) & 0x3fff) + 1;
    } else if (type === 'VP8 ' && size >= 10 && bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) {
      width = view.getUint16(start + 6, true) & 0x3fff; height = view.getUint16(start + 8, true) & 0x3fff;
    }
    if (width && height) {
      if (width > 8192 || height > 8192 || width * height > 16_777_216) throw new GithubWorkError('invalid-studio-image', 400);
      dimensions = { width, height };
    }
    offset = start + size + size % 2;
  }
  if (!dimensions) throw new GithubWorkError('invalid-studio-image', 400);
  return { bytes, ...dimensions };
}

async function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const input = new Uint8Array(header.length + bytes.length);
  input.set(header); input.set(bytes, header.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', input)), value => value.toString(16).padStart(2, '0')).join('');
}

function base64Text(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

async function repositorySnapshot(env, signal) {
  const ref = await githubApiRequest(env, `git/ref/heads/${BRANCH}`, { signal });
  const head = ref?.object?.sha;
  if (!SHA.test(String(head || ''))) throw new GithubWorkError('studio-github-invalid');
  const commit = await githubApiRequest(env, `git/commits/${head}`, { signal });
  const treeSha = commit?.tree?.sha;
  if (!SHA.test(String(treeSha || ''))) throw new GithubWorkError('studio-github-invalid');
  const tree = await githubApiRequest(env, `git/trees/${treeSha}?recursive=1`, { signal, maximum:8 * 1024 * 1024 });
  if (!Array.isArray(tree?.tree) || tree.truncated !== false) throw new GithubWorkError('studio-github-folder-limit', 409);
  const entries = new Map();
  for (const entry of tree.tree) {
    if (entry?.type === 'blob' && entry.mode === '100644' && typeof entry.path === 'string' && SHA.test(String(entry.sha || ''))) entries.set(entry.path, entry.sha.toLowerCase());
  }
  const manifestSha = entries.get(MANIFEST_PATH);
  if (!manifestSha) throw new GithubWorkError('studio-github-invalid');
  const blob = await githubApiRequest(env, `git/blobs/${manifestSha}`, { signal });
  let manifest;
  try {
    if (blob?.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('invalid manifest');
    const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), character => character.charCodeAt(0));
    manifest = withStableImageIndices(JSON.parse(new TextDecoder('utf-8', { fatal:true }).decode(bytes)));
  } catch { throw new GithubWorkError('studio-github-invalid'); }
  return { head, treeSha, entries, manifest };
}

async function createBlob(env, content, signal) {
  const blob = await githubApiRequest(env, 'git/blobs', { method:'POST', body:{ content, encoding:'base64' }, signal });
  if (!SHA.test(String(blob?.sha || ''))) throw new GithubWorkError('studio-github-invalid');
  return blob.sha.toLowerCase();
}

async function mutateGallery(env, body, action) {
  const signal = AbortSignal.timeout(55_000);
  const image = action === 'upload' ? decodeWebp(body.dataB64) : null;
  const blobHash = image && await gitBlobSha(image.bytes);
  const contentHash = image && Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', image.bytes)), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const folder = action === 'upload' ? body.folder : workPath(body.path).folder;
  for (let attempt = 0; attempt < 2; attempt++) {
    const snapshot = await repositorySnapshot(env, signal);
    const files = [...snapshot.entries].filter(([path]) => workPath(path)?.folder === folder);
    const pattern = new RegExp(`^${PREFIXES[folder]}([1-9]\\d*)\\.webp$`);
    const highest = Math.max(snapshot.manifest.imageFileHighWater?.[folder] || 0, ...files.map(([path]) => Number(path.split('/')[1].match(pattern)?.[1] || 0)));
    if (!Number.isSafeInteger(highest) || highest >= 99_999_999) throw new GithubWorkError('studio-github-folder-limit', 409);
    let path = body.path;
    const changes = [];
    if (action === 'upload') {
      const matching = files.find(([, sha]) => sha === blobHash);
      if (matching && snapshot.manifest.images.some(record => record.path === matching[0])) {
        return { ok:true, path:matching[0], sha:blobHash, alreadyExists:true, publication:'queued' };
      }
      // Reuse a matching legacy image absent from the manifest, repairing its
      // publication when its filename already follows the supported scheme.
      const duplicate = matching && pattern.test(matching[0].split('/')[1]) ? matching : null;
      path = duplicate?.[0] || `${folder}/${PREFIXES[folder]}${highest + 1}.webp`;
      const storedSha = duplicate?.[1] || await createBlob(env, body.dataB64, signal);
      if (storedSha !== blobHash) throw new GithubWorkError('studio-github-invalid');
      if (!duplicate) changes.push({ path, mode:'100644', type:'blob', sha:storedSha });
      // The bounded original is also a reliable first-party thumbnail until
      // a smaller rendition is generated; both are published in one commit.
      changes.push({ path:`preview_site/assets/thumbs/${path}`, mode:'100644', type:'blob', sha:storedSha });
    } else {
      const currentSha = snapshot.entries.get(path);
      if (!currentSha) throw new GithubWorkError('studio-github-not-found', 409);
      if (currentSha !== body.sha.toLowerCase()) throw new GithubWorkError('studio-github-conflict', 409);
      changes.push({ path, mode:'100644', type:'blob', sha:null });
      if (snapshot.entries.has(`preview_site/assets/thumbs/${path}`)) changes.push({ path:`preview_site/assets/thumbs/${path}`, mode:'100644', type:'blob', sha:null });
    }
    let manifest;
    try {
      manifest = updateGalleryManifest(snapshot.manifest, {
        action, path, ...(image ? { width:image.width, height:image.height, hash:contentHash } : {}), filenameHighWater:highest
      });
    } catch { throw new GithubWorkError('studio-github-invalid'); }
    const manifestSha = await createBlob(env, base64Text(JSON.stringify(manifest) + '\n'), signal);
    changes.push({ path:MANIFEST_PATH, mode:'100644', type:'blob', sha:manifestSha });
    const tree = await githubApiRequest(env, 'git/trees', { method:'POST', signal, body:{ base_tree:snapshot.treeSha, tree:changes } });
    if (!SHA.test(String(tree?.sha || ''))) throw new GithubWorkError('studio-github-invalid');
    const commit = await githubApiRequest(env, 'git/commits', { method:'POST', signal, body:{
      message:`${action === 'upload' ? 'Publish' : 'Remove'} gallery work ${path}`, tree:tree.sha, parents:[snapshot.head]
    } });
    if (!SHA.test(String(commit?.sha || ''))) throw new GithubWorkError('studio-github-invalid');
    try {
      const updated = await githubApiRequest(env, `git/refs/heads/${BRANCH}`, { method:'PATCH', signal, body:{ sha:commit.sha, force:false } });
      if (updated?.object?.sha !== commit.sha) throw new GithubWorkError('studio-github-invalid');
      return { ok:true, path, ...(blobHash ? { sha:blobHash } : {}), commit:commit.sha, publication:'queued' };
    } catch (error) {
      // Only a definitive non-fast-forward response is retried. A timeout or
      // lost response may already have published and must remain unconfirmed.
      if (error instanceof GithubWorkError && error.code === 'studio-github-conflict' && attempt === 0) continue;
      throw error;
    }
  }
  throw new GithubWorkError('studio-github-conflict', 409);
}

export async function handleGithubWork(body, env) {
  if (!githubWorksConfigured(env)) return json({ ok:false, error:'studio-github-not-configured' }, 503);
  const action = body?.action ?? 'upload';
  if (!['list', 'upload', 'delete'].includes(action)) return json({ ok:false, error:'invalid-studio-request' }, 400);
  if (action !== 'delete' && !knownFolder(body?.folder)) return json({ ok:false, error:'invalid-studio-request' }, 400);
  if (action === 'delete' && (!workPath(body?.path) || typeof body?.sha !== 'string' || !SHA.test(body.sha))) return json({ ok:false, error:'invalid-studio-request' }, 400);
  try {
    if (action === 'list') return json({ ok:true, files:await listFolder(env, body.folder) });
    if (action === 'upload' && body.ext !== 'webp') throw new GithubWorkError('invalid-studio-image', 400);
    return json(await mutateGallery(env, body, action));
  } catch (error) {
    const failure = error instanceof GithubWorkError ? error : new GithubWorkError('studio-github-unavailable');
    return json({ ok:false, error:failure.code, ...(action !== 'list' && failure.status >= 500 ? { publication:'unconfirmed' } : {}) }, failure.status);
  }
}

/* Public CMS media uses a generated path, never the user's filename. The
   original stays in GitHub and Cloudflare Pages serves it after deployment. */
export async function handleGithubMediaUpload(body, env) {
  if (!githubWorksConfigured(env)) return json({ ok:false, error:'studio-github-not-configured' }, 503);
  if (body?.contentType !== 'image/webp' || typeof body?.filename !== 'string'
    || !body.filename.length || body.filename.length > 180 || /[\\/\0]/.test(body.filename)) {
    return json({ ok:false, error:'invalid-studio-image' }, 400);
  }
  try {
    const { bytes } = decodeWebp(body.dataB64), hash = await gitBlobSha(bytes);
    const name = `${crypto.randomUUID()}.webp`, path = `preview_site/uploads/${name}`;
    const result = await githubRequest(env, path, { method:'PUT', body:{
      message:`Publish Studio media ${name}`, branch:BRANCH, content:body.dataB64
    } });
    if (result?.content?.path !== path || result?.content?.sha !== hash || !SHA.test(String(result?.commit?.sha || ''))) {
      throw new GithubWorkError('studio-github-invalid');
    }
    return json({ ok:true, url:`https://bqurtas.com/uploads/${name}`, path, commit:result.commit.sha, publication:'queued' });
  } catch (error) {
    const failure = error instanceof GithubWorkError ? error : new GithubWorkError('studio-github-unavailable');
    return json({ ok:false, error:failure.code, ...(failure.status >= 500 ? { publication:'unconfirmed' } : {}) }, failure.status);
  }
}
