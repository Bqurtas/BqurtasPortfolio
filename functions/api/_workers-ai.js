/* All Studio model calls stay inside the project's Cloudflare AI binding. */
export function workersAIConfigured(env) {
  return !!env?.AI && typeof env.AI.run === 'function';
}

// Never serialize an upstream Error: its message/cause may contain private
// prompts, model output or credentials. Only bounded numeric diagnostics leave
// this boundary; public handlers retain their generic failure responses.
function warnWorkersFailure(error) {
  try {
    const message = typeof error?.message === 'string' ? error.message.slice(0, 4096) : '';
    const category = message === 'ai-not-configured' ? 'configuration'
      : message === 'ai-timeout' ? 'timeout'
      : message === 'ai-response-invalid' ? 'invalid-response' : 'upstream';
    const boundedInteger = (value, min, max) => {
      if (typeof value !== 'number' && !(typeof value === 'string' && /^\d{1,6}$/.test(value))) return null;
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
    };
    const codeMatch = message.match(/\bcode\s*[:=]\s*([1-9]\d{2,5})(?![\d.])/i)
      || (error?.name === 'AiError' ? message.match(/^([1-9]\d{2,5}):/) : null);
    const statusMatch = message.match(/\b(?:HTTP(?:\s+status)?|status(?:Code)?)\s*[:=]\s*([45]\d{2})(?![\d.])/i);
    console.warn({
      event: 'workers-ai-failure',
      category,
      code: boundedInteger(error?.code, 1, 999999) ?? boundedInteger(codeMatch?.[1], 1, 999999),
      status: boundedInteger(error?.status, 400, 599)
        ?? boundedInteger(error?.statusCode, 400, 599) ?? boundedInteger(statusMatch?.[1], 400, 599)
    });
  } catch { /* Diagnostics must never replace the original failure. */ }
}

// The model option is server-owned configuration, never a request field.
// Private Studio callers retain their existing WORKERS_AI_MODEL/default.
export async function runWorkersText(env, input, {
  timeoutMs = 30_000,
  maxLength = 24_000,
  model = env?.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8'
} = {}) {
  let timer;
  try {
    if (!workersAIConfigured(env)) throw new Error('ai-not-configured');
    const deadline = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('ai-timeout')), timeoutMs);
    });
    const result = await Promise.race([
      env.AI.run(model, input),
      deadline
    ]);
    const text = result && (result.response || result.result?.response);
    if (typeof text !== 'string' || !text.trim() || text.length > maxLength) throw new Error('ai-response-invalid');
    return text.trim();
  } catch (error) {
    warnWorkersFailure(error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
