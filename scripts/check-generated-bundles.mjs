import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const galleryBundle = 'preview_site/js/gallery.v420.min.js';
const manifestReference = /(["'])assets\/gallery-manifest\.json\?v=[a-f0-9]{12}\1/g;

export function equivalentGeneratedBundle(file, committed, built) {
  if (committed === built) return true;
  if (file !== galleryBundle) return false;
  // A Studio content commit updates the manifest atomically with its images.
  // CI and Pages then build its new cache key. Only that one literal may
  // differ; every byte of generated code and every other bundle must match.
  const normalize = source => {
    if ([...source.matchAll(manifestReference)].length !== 1) return null;
    return source.replace(manifestReference, '$1assets/gallery-manifest.json?v=__CONTENT__$1');
  };
  const before = normalize(committed), after = normalize(built);
  return before !== null && after !== null && before === after;
}

export async function changedGeneratedBundles({ root = projectRoot } = {}) {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'preview_site/js/*.min.js', 'preview_site/css/*.min.css'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const changed = [];
  for (const file of files) {
    const committed = execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' });
    let built;
    try { built = await readFile(path.join(root, file), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (built === undefined || !equivalentGeneratedBundle(file, committed, built)) changed.push(file);
  }
  return changed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = await changedGeneratedBundles();
  if (changed.length) {
    console.error(`Generated bundles need to be rebuilt and committed:\n${changed.join('\n')}`);
    process.exitCode = 1;
  } else console.log('Generated bundles match their sources (gallery content cache key may advance).');
}
