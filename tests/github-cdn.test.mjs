import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const REPO = 'Bqurtas/BqurtasPortfolio';
const CDN = `https://cdn.jsdelivr.net/gh/${REPO}@main`;
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const API = `https://api.github.com/repos/${REPO}`;

test('the live gallery keeps the canonical GitHub path', async () => {
  const gallery = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');
  assert.match(gallery, new RegExp(`CDN_BASE:\\s*'${CDN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(gallery, new RegExp(`RAW_BASE:\\s*'${RAW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(gallery, new RegExp(`REPO:\\s*'${REPO}'`));
  assert.match(gallery, /BRANCH:\s*'main'/);

  const enhance = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
  assert.match(enhance, new RegExp(API.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('the sitemap and README keep the same GitHub route', async () => {
  const sitemap = await readFile(new URL('../preview_site/sitemap-images.xml', import.meta.url), 'utf8');
  assert.match(sitemap, new RegExp(RAW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(sitemap, /githubusercontent\.com\/(?!Bqurtas\/BqurtasPortfolio)/);

  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /github\.com\/Bqurtas\/BqurtasPortfolio/);
  assert.match(readme, /bqurtas\.com/);
  assert.match(readme, /preview_site\//);
});
