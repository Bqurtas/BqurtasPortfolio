import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
const start = source.indexOf('    const TR_LANGS =');
const end = source.indexOf('    let CMS_POSTS =', start);
assert.ok(start > 0 && end > start);
function fixture(fetcher) {
  const calls = [];
  const context = { AbortSignal, editToken: () => 'test-editor', fetch: async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, body, options });
    return fetcher(body);
  } };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.translate = { buildI18n, trText, unavailable: () => translationUnavailable };', context);
  return { ...context.translate, calls };
}
const languages = ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];

test('cover-only edits preserve existing translations without calling a model', async () => {
  const previous = { title: 'Title', subtitle: 'Subtitle', body: 'Original body', cover: '/old.webp', i18n: {} };
  for (const lang of languages) previous.i18n[lang] = { title: `${lang} title`, subtitle: `${lang} subtitle`, body: `${lang} body` };
  const f = fixture(() => { throw new Error('must not request translation'); });
  const result = await f.buildI18n({ ...previous, cover: '/new.webp' }, undefined, previous);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), previous.i18n);
  assert.equal(f.calls.length, 0);
  assert.equal(f.unavailable(), false);
});

test('unavailable translation keeps changed source text and preserves unchanged translated fields', async () => {
  const previous = { title: 'Title', body: 'Old body', i18n: {} };
  for (const lang of languages) previous.i18n[lang] = { title: `${lang} title`, body: `${lang} old body` };
  const f = fixture(() => ({ ok: false }));
  const result = await f.buildI18n({ title: 'Title', body: 'New body' }, undefined, previous);
  for (const lang of languages) {
    assert.equal(result[lang].title, `${lang} title`);
    assert.equal(result[lang].body, 'New body');
  }
  assert.equal(f.unavailable(), true);
  assert.equal(f.calls.length, 1, 'stop further model calls after an unavailable response');
});

test('a mid-field model failure preserves the whole source instead of publishing mixed languages', async () => {
  let requests = 0;
  const f = fixture(() => ++requests === 1
    ? { ok: true, json: async () => ({ ok: true, text: 'Translated first chunk.' }) }
    : { ok: false });
  const original = 'A'.repeat(3000);
  assert.equal(await f.trText(original, 'fr'), original);
  assert.equal(f.calls.length, 2);
  assert.equal(f.unavailable(), true);
  assert.ok(f.calls.every(call => call.url === '/api/translate' && call.options.credentials === 'same-origin'));
});
