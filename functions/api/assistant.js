/* Private studio AI assistant — proxies to the Anthropic Messages API so the
   API key never reaches the browser. Protected by EDIT_TOKEN (same token the
   dashboard already uses) so no one but you can spend your credits.

   Cloudflare env vars to set:
     ANTHROPIC_API_KEY  (required)  — your key from console.anthropic.com
     EDIT_TOKEN         (required)  — any long secret; also used by the CMS
     ANTHROPIC_MODEL    (optional)  — defaults to claude-3-5-haiku-latest      */

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

const SYSTEM = `You are Barakat Qurtas's private studio assistant inside his portfolio dashboard.
Barakat is a Kurdish graphic, motion, print and advertising designer in Hewlêr (Erbil), Kurdistan; his studio is called Pencemor ("fingerprint").
Help him run the studio: drafting and polishing client replies, writing quotes and project briefs, planning timelines, brainstorming design and campaign ideas, naming, copywriting, captions, and translating between Kurdish (Sorani & Kurmancî), Arabic, English and French.
Always reply in the SAME language the user wrote in. Be concise, warm, and practical. When money or scope is involved, give clear options, not vague answers. You are advising the studio owner, not a public visitor.`;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'no-key' });

  const tok = request.headers.get('x-edit-token') || '';
  if (!env.EDIT_TOKEN || tok !== env.EDIT_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad-json' }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length) return json({ ok: false, error: 'no-messages' }, 400);

  let r, d;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 1024,
        system: SYSTEM,
        messages
      })
    });
    d = await r.json();
  } catch (e) {
    return json({ ok: false, error: 'network' });
  }

  if (!r.ok) return json({ ok: false, error: (d && d.error && d.error.message) || 'api-error' });
  const text = (d.content && d.content[0] && d.content[0].text) || '';
  return json({ ok: true, text });
}
