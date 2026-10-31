/* Same-origin Studio: signed session + independent editor credential, with
   content in Cloudflare D1 and public media in the owner GitHub repository. */

import {
  editorAuthorization,
  hasSession,
  inputErrorResponse,
  isSameOrigin,
  json,
  rateKey,
  readJson,
  rotateEditToken,
  sessionConfigured,
  takeRateLimit
} from '../_session.js';

import { handleCmsAdmin } from '../_cms.js';
import { handlePortraitAdmin } from '../_portrait.js';
import { handleGithubWork, handleGithubMediaUpload } from '../_github-works.js';
const IMAGE_LIMIT = 8 * 1024 * 1024;
const LATEST_LINKS = new Set(['', 'logo', 'book', 'image', 'posters', 'social', 'events', 'stationery', 'official', 'video', 'other']);
const FOLDERS = new Set([
  'GeneralDesign', 'Book', 'Official', 'Poster', 'SocialMedia', 'LogoDesign',
  'TickerLogo', 'EventandCon', 'Businesscard', 'Invoice', 'Photos', 'Other',
  'Certificate', 'Flex'
]);
const RULES = Object.freeze({
  'site-portrait': {
    maximum: 1_400_000,
    actions: new Set(['get', 'publish', 'reset', 'appearance']),
    limit: 20
  },
  'work-upload': {
    maximum: IMAGE_LIMIT,
    actions: new Set(['upload', 'list', 'delete']),
    limit: 40
  },
  'blog-admin': {
    maximum: IMAGE_LIMIT,
    actions: new Set(['list', 'delete', 'reorder', 'upload', 'upsert']),
    limit: 100
  },
  'latest-admin': {
    maximum: 256 * 1024,
    actions: new Set(['list', 'delete', 'reorder', 'add']),
    limit: 100
  },
  'projects-admin': {
    maximum: IMAGE_LIMIT,
    actions: new Set(['list', 'delete', 'upload', 'upsert']),
    limit: 100
  },
  'set-token': {
    maximum: 4 * 1024,
    actions: new Set(['set']),
    limit: 5,
    windowMs: 60 * 60 * 1000
  }
});

function validIdentifier(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0;
  return typeof value === 'string' && /^[1-9]\d{0,17}$/.test(value);
}

function validFilename(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 180
    && !/[\\/\0]/.test(value);
}

function validImage(body) {
  return validFilename(body.filename)
    && body.contentType === 'image/webp'
    && typeof body.dataB64 === 'string'
    && body.dataB64.length > 0
    && body.dataB64.length <= 7_500_000;
}

function validIdList(ids) {
  return Array.isArray(ids) && ids.length <= 1_000 && ids.every(validIdentifier);
}

function actionFor(service, body) {
  if (service === 'set-token') return 'set';
  if (service === 'work-upload' && body.action == null) return 'upload';
  return typeof body.action === 'string' ? body.action : '';
}

function validPayload(service, body) {
  const action = actionFor(service, body);
  const rule = RULES[service];
  if (!rule.actions.has(action)) return false;

  if (service === 'site-portrait') {
    if (action === 'get' || action === 'reset') return true;
    const validMode = body.dark_mode === 'invert' || body.dark_mode === 'original';
    if (action === 'appearance') return validMode;
    return validImage(body) && (body.dark_mode === undefined || validMode);
  }

  if (service === 'set-token') {
    return typeof body.new_token === 'string'
      && body.new_token.trim().length >= 4
      && body.new_token.trim().length <= 256;
  }

  if (action === 'list') {
    return service !== 'work-upload' || FOLDERS.has(body.folder);
  }
  if (action === 'delete') {
    if (service === 'work-upload') {
      return typeof body.path === 'string'
        && body.path.length <= 300
        && !body.path.split('/').includes('..')
        && [...FOLDERS].some((folder) => body.path.startsWith(`${folder}/`))
        && /^[0-9a-f]{40}$/i.test(String(body.sha || ''));
    }
    return validIdentifier(body.id);
  }
  if (action === 'reorder') return validIdList(body.ids);
  if (action === 'upload') {
    if (service === 'work-upload') {
      return FOLDERS.has(body.folder)
        && body.ext === 'webp'
        && typeof body.dataB64 === 'string'
        && body.dataB64.length > 0
        && body.dataB64.length <= 7_500_000;
    }
    return validImage(body);
  }
  if (action === 'upsert' && service === 'blog-admin') {
    return body.post && typeof body.post === 'object'
      && typeof body.post.title === 'string'
      && body.post.title.trim().length > 0
      && body.post.title.length <= 300;
  }
  if (action === 'upsert' && service === 'projects-admin') {
    return body.project && typeof body.project === 'object'
      && typeof body.project.title === 'string'
      && body.project.title.trim().length > 0
      && body.project.title.length <= 300;
  }
  if (action === 'add' && service === 'latest-admin') {
    return body.item && typeof body.item === 'object'
      && typeof body.item.title === 'string'
      && body.item.title.trim().length > 0
      && body.item.title.length <= 300
      && typeof body.item.link === 'string'
      && LATEST_LINKS.has(body.item.link);
  }
  return false;
}

function configured(env) {
  return sessionConfigured(env)
    && !!env.DB
    && String(env.EDIT_TOKEN || '').length > 0;
}

export async function onRequestPost({ request, env, params }) {
  const service = String((params && params.service) || '');
  const rule = Object.hasOwn(RULES, service) ? RULES[service] : null;
  if (!rule) return json({ ok: false, error: 'unknown-studio-service' }, 404);
  if (!configured(env)) return json({ ok: false, error: 'studio-proxy-not-configured' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await hasSession(request, env))) return json({ ok: false, error: 'session-required' }, 401);
  const editorGate = await editorAuthorization(request, env);
  if (editorGate) return editorGate;

  const key = await rateKey(request, env, `studio-${service}`);
  const slot = await takeRateLimit(env, key, {
    limit: rule.limit,
    windowMs: rule.windowMs || 15 * 60 * 1000,
    durable: true
  });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });

  let body;
  try { body = await readJson(request, rule.maximum); } catch (error) { return inputErrorResponse(error); }
  if (!validPayload(service, body)) return json({ ok: false, error: 'invalid-studio-request' }, 400);

  if (service === 'set-token') {
    const changed = await rotateEditToken(env, body.new_token.trim());
    return changed
      ? json({ ok: true })
      : json({ ok: false, error: 'token-update-failed' }, 503);
  }

  try {
    if (service === 'site-portrait') return await handlePortraitAdmin(body, env);
    if (service === 'work-upload') return await handleGithubWork(body, env);
    if (body.action === 'upload') return await handleGithubMediaUpload(body, env);
    return await handleCmsAdmin(service, body, env);
  } catch {
    console.warn({ event: 'studio-content-failure', service });
    return json({ ok: false, error: 'studio-content-unavailable' }, 503);
  }
}
