import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the draft polish overlay is linked last and can be rolled back on its own', async () => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../preview_site/css/polish.css', import.meta.url), 'utf8');

  const experience = html.indexOf('href="css/experience.css?v=27"');
  const polish = html.indexOf('href="css/polish.css?v=1"');

  assert.ok(experience > 0, 'experience.css should still load');
  assert.ok(polish > experience, 'polish.css must load after experience.css');
  assert.match(css, /bq-polish/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /To roll back/);
});
