/* Same-origin gateway for privileged Supabase Edge Functions.

   The browser proves two factors to Pages: its signed HttpOnly session and the
   browser-facing EDIT_TOKEN. Pages then substitutes SUPABASE_EDIT_TOKEN, which
   is never exposed to browser code. Direct calls to the Edge Functions cannot
   mutate Studio data without that separate upstream credential. */

import {
  hasEditToken,
  hasSession,
  inputErrorResponse,
  isSameOrigin,
  json,
  noContent,
  rateKey,
  readJson,
  rotateEditToken,
  sessionConfigured,
  takeRateLimit
} from '../_session.js';

const SUPABASE_URL = 'https://dcnkhzrishphpismmxuu.supabase.co';
const PUBLIC_SUPABASE_KEY = 'sb_publishable_FrR6Ur2yy-rOCgKk5D326w_j5rfBgV3';
const IMAGE_LIMIT = 8 * 1024 * 1024;
const LATEST_LINKS = new Set(['', 'logo', 'book', 'image', 'posters', 'social', 'events', 'stationery', 'official', 'video', 'other']);
const FOLDERS = new Set([
  'GeneralDesign', 'Book', 'Official', 'Poster', 'SocialMedia', 'LogoDesign',
  'TickerLogo', 'EventandCon', 'Businesscard', 'Invoice', 'Photos', 'Other',
  'Certificate', 'Flex'
]);
const RULES = Object.freeze({
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

async function authorized(request, env) {
  const [session, token] = await Promise.all([
    hasSession(request, env),
    hasEditToken(request, env)
  ]);
  return session && token;
}

/* The credential Pages presents to the Edge Functions. A separate server-only
   SUPABASE_EDIT_TOKEN is the stronger setup: the browser then never holds a
   secret that can mutate Studio data on its own. Where that is not set we fall
   back to EDIT_TOKEN rather than refuse to run — the Edge Functions already
   accept it, so calling them through here is no weaker than calling them
   directly, and the proxy still adds the signed session and the same-origin
   check on top. Set SUPABASE_EDIT_TOKEN to a different value to close the
   remaining gap. */
function upstreamEditToken(env) {
  return String(env.SUPABASE_EDIT_TOKEN || '') || String(env.EDIT_TOKEN || '');
}

function configured(env) {
  return sessionConfigured(env)
    && !!env.DB
    && String(env.EDIT_TOKEN || '').length > 0
    && upstreamEditToken(env).length > 0;
}

export async function onRequestPost({ request, env, params }) {
  const service = String((params && params.service) || '');
  const rule = RULES[service];
  if (!rule) return json({ ok: false, error: 'unknown-studio-service' }, 404);
  if (!configured(env)) return json({ ok: false, error: 'studio-proxy-not-configured' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

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

  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_KEY);
  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/${service}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'x-edit-token': upstreamEditToken(env)
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });
    if (upstream.status === 204) return noContent();
    if (upstream.status >= 500) return json({ ok: false, error: 'studio-upstream-failed' }, 502);
    const raw = await upstream.text();
    if (raw.length > 5 * 1024 * 1024) return json({ ok: false, error: 'studio-upstream-too-large' }, 502);
    let payload;
    try { payload = JSON.parse(raw); } catch (error) {
      return json({ ok: false, error: 'studio-upstream-invalid' }, 502);
    }
    return json(payload, upstream.status);
  } catch (error) {
    return json({ ok: false, error: 'studio-upstream-unavailable' }, 502);
  }
}
