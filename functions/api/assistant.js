/* Private Studio assistant. A verified 2FA session and x-edit-token are both
   required before any paid or metered model call can be made. */

import {
  hasSession,
  hasEditToken,
  inputErrorResponse,
  isSameOrigin,
  json,
  rateKey,
  readJson,
  sessionConfigured,
  takeRateLimit
} from './_session.js';

const SYSTEM = `You are Barakat Qurtas's private studio assistant inside his portfolio dashboard.
Barakat is a Kurdish graphic, motion, print and advertising designer in Hewlêr (Erbil), Kurdistan; his studio is called Pencemor ("fingerprint").
Help him run the studio: drafting and polishing client replies, writing quotes and project briefs, planning timelines, brainstorming design and campaign ideas, naming, copywriting, captions, and translating between Kurdish (Sorani & Kurmancî), Arabic, English and French.
Always reply in the SAME language the user wrote in. Be concise, warm and practical. When money or scope is involved, give clear options, not vague answers. You are advising the studio owner, not a public visitor.`;

async function authorized(request, env) {
  if (!sessionConfigured(env) || !env.EDIT_TOKEN) return false;
  const [session, token] = await Promise.all([
    hasSession(request, env),
    hasEditToken(request, env)
  ]);
  return session && token;
}

function normalizedMessages(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return null;
  const messages = [];
  let total = 0;
  for (const item of input) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') return null;
    const content = item.content.trim();
    if (!content || content.length > 4_000) return null;
    total += content.length;
    if (total > 20_000) return null;
    messages.push({ role: item.role, content });
  }
  if (messages[messages.length - 1].role !== 'user') return null;
  return messages;
}

async function viaAnthropic(env, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 800,
      system: SYSTEM,
      messages
    }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error('upstream');
  const data = await response.json();
  const text = data && data.content && data.content[0] && data.content[0].text;
  if (typeof text !== 'string') throw new Error('upstream-shape');
  return text.slice(0, 20_000);
}

async function viaWorkersAI(env, messages) {
  const result = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'system', content: SYSTEM }, ...messages],
    max_tokens: 800
  });
  const text = result && (result.response || (result.result && result.result.response));
  if (typeof text !== 'string') throw new Error('upstream-shape');
  return text.slice(0, 20_000);
}

export async function onRequestPost({ request, env }) {
  if (!sessionConfigured(env) || !env.EDIT_TOKEN || !env.DB) return json({ ok: false, error: 'not-configured' }, 503);
  if (!isSameOrigin(request)) return json({ ok: false, error: 'forbidden-origin' }, 403);
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);

  const key = await rateKey(request, env, 'assistant-use');
  const slot = await takeRateLimit(env, key, { limit: 20, windowMs: 15 * 60 * 1000, durable: true });
  if (slot.unavailable) return json({ ok: false, error: 'rate-limit-unavailable' }, 503);
  if (!slot.ok) return json({ ok: false, error: 'rate-limited', retryAfter: slot.retryAfter }, 429, { 'Retry-After': String(slot.retryAfter) });

  let body;
  try { body = await readJson(request, 24 * 1024); } catch (error) { return inputErrorResponse(error); }
  const messages = normalizedMessages(body.messages);
  if (!messages) return json({ ok: false, error: 'invalid-messages' }, 400);

  try {
    if (env.ANTHROPIC_API_KEY) return json({ ok: true, text: await viaAnthropic(env, messages) });
    if (env.AI) return json({ ok: true, text: await viaWorkersAI(env, messages) });
    return json({
      ok: true,
      text: 'سڵاو! من یاریدەدەری ستۆدیۆی بەرەکاتم. بۆ چالاککردنی تەواوی ژیری دەستکرد لە سێرڤەر، تکایە Workers AI یان ANTHROPIC_API_KEY لە پڕۆژەی Cloudflare زیاد بکە.'
    });
  } catch (error) {
    return json({ ok: false, error: 'ai-upstream-failed' }, 502);
  }
}
