/* All Studio model calls stay inside the project's Cloudflare AI binding. */
export function workersAIConfigured(env) {
  return !!env?.AI && typeof env.AI.run === 'function';
}

export async function runWorkersText(env, input, { timeoutMs = 30_000, maxLength = 24_000 } = {}) {
  if (!workersAIConfigured(env)) throw new Error('ai-not-configured');
  let timer;
  try {
    const deadline = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('ai-timeout')), timeoutMs);
    });
    const result = await Promise.race([
      env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', input),
      deadline
    ]);
    const text = result && (result.response || result.result?.response);
    if (typeof text !== 'string' || !text.trim() || text.length > maxLength) throw new Error('ai-response-invalid');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}
