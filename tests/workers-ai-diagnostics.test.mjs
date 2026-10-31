import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkersText } from '../functions/api/_workers-ai.js';

function captureWarnings(t) {
  const warnings = [];
  t.mock.method(console, 'warn', (...values) => warnings.push(values));
  return warnings;
}

test('Workers AI diagnostics record only a category and bounded numeric upstream details', async (t) => {
  const warnings = captureWarnings(t);
  const privateText = 'private-prompt-and-secret-token';
  const error = Object.assign(new Error(`Request failed: code: 10000; status: 403; ${privateText}`), {
    cause: { secret: privateText }, response: privateText, input: privateText
  });
  await assert.rejects(runWorkersText({
    WORKERS_AI_MODEL: privateText,
    AI: { run: async () => { throw error; } }
  }, { messages: [{ role: 'user', content: privateText }] }), failure => failure === error);
  assert.deepEqual(warnings, [[{
    event: 'workers-ai-failure', category: 'upstream', code: 10000, status: 403
  }]]);
  assert.ok(!JSON.stringify(warnings).includes(privateText));
});

test('Workers AI diagnostics accept structured status and AiError codes, without serializing errors', async (t) => {
  const warnings = captureWarnings(t);
  const failures = [
    Object.assign(new Error('private upstream message'), { code: '10001', statusCode: 429 }),
    Object.assign(new Error('3006: private inference details'), { name: 'AiError', status: '502' }),
    Object.assign(new Error('private upstream message'), {
      code: { toString() { assert.fail('must not coerce unknown error properties'); } }, status: 900,
      toJSON() { assert.fail('must not serialize an upstream Error'); }
    }),
    new Error('private identifier code: 123456789 and status: 5029'),
    'private thrown string with code: 10000'
  ];
  for (const error of failures) {
    await assert.rejects(runWorkersText({ AI: { run: async () => { throw error; } } }, {}), failure => failure === error);
  }
  assert.deepEqual(warnings.map(([item]) => [item.code, item.status]), [
    [10001, 429], [3006, 502], [null, null], [null, null], [null, null]
  ]);
  assert.ok(warnings.every(([item]) => item.category === 'upstream'));
});

test('Workers AI diagnostics distinguish local failures and never log model output', async (t) => {
  const warnings = captureWarnings(t);
  await assert.rejects(runWorkersText({}, {}), /ai-not-configured/);
  await assert.rejects(runWorkersText({ AI: { run: async () => ({ response: 'PRIVATE-REPLY' }) } }, {}, { maxLength: 2 }), /ai-response-invalid/);
  await assert.rejects(runWorkersText({ AI: { run: () => new Promise(() => {}) } }, {}, { timeoutMs: 5 }), /ai-timeout/);
  assert.deepEqual(warnings.map(([item]) => item.category), ['configuration', 'invalid-response', 'timeout']);
  assert.ok(warnings.every(([item]) => item.code === null && item.status === null));
  assert.ok(!JSON.stringify(warnings).includes('PRIVATE-REPLY'));
});

test('diagnostic logger failures preserve the original AI rejection and successful calls stay quiet', async (t) => {
  const warnings = captureWarnings(t);
  assert.equal(await runWorkersText({ AI: { run: async () => ({ response: ' A useful reply. ' }) } }, {}), 'A useful reply.');
  assert.equal(warnings.length, 0);
  const error = new Error('original upstream failure');
  t.mock.method(console, 'warn', () => { throw new Error('logger unavailable'); });
  await assert.rejects(runWorkersText({ AI: { run: async () => { throw error; } } }, {}), failure => failure === error);
});


test('Workers AI preserves private model defaults while allowing an internal caller override', async () => {
  const calls = [];
  const input = { messages: [{ role: 'user', content: 'Hello' }], max_tokens: 800, model: '@cf/ignored-input-model' };
  const AI = { async run(model, payload) { calls.push({ model, payload }); return { response: 'Hello.' }; } };
  await runWorkersText({ AI }, input);
  await runWorkersText({ AI, WORKERS_AI_MODEL: '@cf/configured-private-model' }, input);
  await runWorkersText({ AI, WORKERS_AI_MODEL: '@cf/configured-private-model' }, input, { model: '@cf/internal-public-model' });
  assert.deepEqual(calls.map(call => call.model), [
    '@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/configured-private-model', '@cf/internal-public-model'
  ]);
  assert.ok(calls.every(call => call.payload === input));
});
