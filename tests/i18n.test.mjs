import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('the always-available UI dictionary has complete coverage in every language', async () => {
  const source = await readFile(new URL('../preview_site/js/i18n.js', import.meta.url), 'utf8');
  const start = source.indexOf('window.BQ_UI_I18N =');
  const end = source.indexOf('\n\nwindow.applyLang', start);
  assert.ok(start >= 0 && end > start, 'BQ_UI_I18N should be declared before applyLang');

  const context = { window: {} };
  vm.runInNewContext(source.slice(start, end), context);
  const dictionaries = context.window.BQ_UI_I18N;
  const languages = ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];
  const expectedKeys = Object.keys(dictionaries.en).sort();

  for (const language of languages) {
    assert.deepEqual(Object.keys(dictionaries[language] || {}).sort(), expectedKeys,
      `${language} UI labels should cover the same keys as English`);
    for (const key of expectedKeys) {
      assert.ok(String(dictionaries[language][key]).trim(), `${language}.${key} should not be empty`);
    }
  }
});

test('the authored identity copy is complete in every language', async () => {
  const source = await readFile(new URL('../preview_site/js/i18n.js', import.meta.url), 'utf8');
  const start = source.indexOf('window.BQ_IDENTITY_COPY =');
  const end = source.indexOf('\n(function applyIdentityCopy', start);
  assert.ok(start >= 0 && end > start, 'BQ_IDENTITY_COPY should be declared before it is applied');

  const context = { window: {} };
  vm.runInNewContext(source.slice(start, end), context);
  const dictionaries = context.window.BQ_IDENTITY_COPY;
  const languages = ['en', 'ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];
  const expectedKeys = Object.keys(dictionaries.en).sort();

  for (const language of languages) {
    assert.deepEqual(Object.keys(dictionaries[language] || {}).sort(), expectedKeys,
      `${language} identity copy should cover the same keys as English`);
    for (const key of expectedKeys) {
      assert.ok(String(dictionaries[language][key]).trim(), `${language}.${key} should not be empty`);
    }
  }
});
