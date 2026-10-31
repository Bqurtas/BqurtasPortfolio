import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const REPO = 'Bqurtas/BqurtasPortfolio';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;

test('the live gallery uses first-party media with only the canonical GitHub fallback', async () => {
  const gallery = await readFile(new URL('../preview_site/js/gallery.js', import.meta.url), 'utf8');
  assert.match(gallery, /MEDIA_BASE:\s*'\/media'/);
  assert.doesNotMatch(gallery, /jsdelivr|weserv/);
  assert.match(gallery, new RegExp(`RAW_BASE:\\s*'${RAW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(gallery, new RegExp(`REPO:\\s*'${REPO}'`));
  assert.match(gallery, /BRANCH:\s*'main'/);

  const enhance = await readFile(new URL('../preview_site/js/enhance.js', import.meta.url), 'utf8');
  assert.doesNotMatch(enhance, /https:\/\/api\.github\.com/);
  const latest = await readFile(new URL('../preview_site/js/latest-feed.js', import.meta.url), 'utf8');
  assert.match(latest, /fetch\('\/api\/latest\?feed=1'/);
});

test('the media endpoint, sitemap and README keep the same GitHub route', async () => {
  // Search engines get same-origin /media URLs; the repository stays the origin.
  const sitemap = await readFile(new URL('../preview_site/sitemap-images.xml', import.meta.url), 'utf8');
  assert.doesNotMatch(sitemap, /githubusercontent\.com|cdn\.jsdelivr\.net/);
  assert.match(sitemap, /<image:loc>https:\/\/bqurtas\.com\/media\//);
  const media = await readFile(new URL('../functions/media/[[path]].js', import.meta.url), 'utf8');
  assert.doesNotMatch(media, /jsdelivr|weserv/);
  assert.ok(media.includes(`'${RAW}/'`), 'media endpoint must read only from the canonical GitHub route');

  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /github\.com\/Bqurtas\/BqurtasPortfolio/);
  assert.match(readme, /bqurtas\.com/);
  assert.match(readme, /preview_site\//);
});
