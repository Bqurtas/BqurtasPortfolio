import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { equivalentGeneratedBundle, changedGeneratedBundles } from '../scripts/check-generated-bundles.mjs';

const gallery = 'preview_site/js/gallery.v420.min.js';
const oldBundle = 'fetch("assets/gallery-manifest.json?v=012345abcdef");\n';
const newBundle = 'fetch("assets/gallery-manifest.json?v=abcdef012345");\n';

test('the bundle gate permits exactly one gallery content fingerprint change', () => {
  assert.equal(equivalentGeneratedBundle(gallery, oldBundle, newBundle), true);
  assert.equal(equivalentGeneratedBundle(gallery, oldBundle, newBundle.replace('fetch', 'other')), false);
  assert.equal(equivalentGeneratedBundle(gallery, oldBundle, newBundle.replace('assets/', '/assets/')), false);
  assert.equal(equivalentGeneratedBundle(gallery, oldBundle, newBundle.replace('abcdef012345', 'bad-cache-key')), false);
  assert.equal(equivalentGeneratedBundle(gallery, oldBundle + oldBundle, newBundle + newBundle), false);
  assert.equal(equivalentGeneratedBundle('preview_site/js/main.v420.min.js', oldBundle, newBundle), false);
});

test('the repository bundle check still rejects code drift and missing generated files', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'bq-bundle-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  await mkdir(path.join(root, 'preview_site/js'), { recursive: true });
  await mkdir(path.join(root, 'preview_site/css'), { recursive: true });
  await writeFile(path.join(root, gallery), oldBundle);
  const style = 'preview_site/css/style.min.css';
  await writeFile(path.join(root, style), 'body{color:black}\n');
  git(['init']); git(['add', '.']);
  git(['-c', 'user.name=Bundle test', '-c', 'user.email=bundle-test@example.invalid', 'commit', '-m', 'Fixture']);
  await writeFile(path.join(root, gallery), newBundle);
  assert.deepEqual(await changedGeneratedBundles({ root }), []);
  await writeFile(path.join(root, gallery), newBundle.replace('fetch', 'other'));
  assert.deepEqual(await changedGeneratedBundles({ root }), [gallery]);
  await rm(path.join(root, style));
  assert.deepEqual(await changedGeneratedBundles({ root }), [style, gallery]);
});
