/* Private studio AI assistant. Uses Cloudflare Workers AI (FREE — just bind
   "AI" to the Pages project, no account or key) by default; if you later set
   ANTHROPIC_API_KEY it upgrades to Claude automatically. Either way the model
   runs server-side and is guarded by EDIT_TOKEN so only you can use it.

   Cloudflare setup (free path):
     Bindings → add "Workers AI", variable name AI
     Variables → EDIT_TOKEN = your secret (same one the CMS uses)
   Optional upgrade: Variables → ANTHROPIC_API_KEY (paid Claude).
   Optional: WORKERS_AI_MODEL (default @cf/meta/llama-3.1-8b-instruct),
             ANTHROPIC_MODEL (default claude-3-5-haiku-latest).               */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

const SYSTEM = `You are Barakat Qurtas's private studio assistant inside his portfolio dashboard.
Barakat is a Kurdish graphic, motion, print and advertising designer in Hewlêr (Erbil), Kurdistan; his studio is called Pencemor ("fingerprint").
Help him run the studio: drafting and polishing client replies, writing quotes and project briefs, planning timelines, brainstorming design and campaign ideas, naming, copywriting, captions, and translating between Kurdish (Sorani & Kurmancî), Arabic, English and French.
Always reply in the SAME language the user wrote in. Be concise, warm and practical. When money or scope is involved, give clear options, not vague answers. You are advising the studio owner, not a public visitor.`;

async function viaAnthropic(env, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest', max_tokens: 1024, system: SYSTEM, messages })
  });
  const d = await r.json();
  if (!r.ok) return { ok: false, error: (d && d.error && d.error.message) || 'api-error' };
  return { ok: true, text: (d.content && d.content[0] && d.content[0].text) || '' };
}

async function viaWorkersAI(env, messages) {
  const r = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'system', content: SYSTEM }, ...messages],
    max_tokens: 1024
  });
  const text = (r && (r.response || (r.result && r.result.response))) || '';
  return { ok: true, text };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const tok = request.headers.get('x-edit-token') || '';
  if (!env.EDIT_TOKEN || tok !== env.EDIT_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length) return json({ ok: false, error: 'no-messages' }, 400);

  try {
    if (env.ANTHROPIC_API_KEY) return json(await viaAnthropic(env, messages));   // paid upgrade if configured
    if (env.AI) return json(await viaWorkersAI(env, messages));                  // free default
    return json({ ok: false, error: 'no-ai' });
  } catch (e) {
    return json({ ok: false, error: 'ai-failed' });
  }
}
