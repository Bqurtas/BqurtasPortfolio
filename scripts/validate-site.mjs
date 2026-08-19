import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('preview_site');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const failures = [];

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) failures.push(`duplicate IDs: ${duplicateIds.join(', ')}`);

const localRefs = new Set();
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  let ref = match[1];
  if (!ref || /^(?:https?:|mailto:|tel:|#|data:|blob:)/i.test(ref)) continue;
  ref = ref.split(/[?#]/, 1)[0];
  if (!ref || ref === '/' || ref.startsWith('/design') || ref.startsWith('/blog') || ref.startsWith('/bio') || ref.startsWith('/contact')) continue;
  localRefs.add(ref.replace(/^\//, ''));
}
for (const ref of localRefs) {
  if (!existsSync(resolve(root, ref))) failures.push(`missing local asset: ${ref}`);
}

for (const file of ['site.webmanifest']) {
  try { JSON.parse(readFileSync(resolve(root, file), 'utf8')); }
  catch (error) { failures.push(`${file} is not valid JSON: ${error.message}`); }
}

for (const file of ['sitemap.xml', 'sitemap-images.xml']) {
  const xml = readFileSync(resolve(root, file), 'utf8');
  if (!/^<\?xml[\s\S]*<urlset\b[\s\S]*<\/urlset>\s*$/i.test(xml)) failures.push(`${file} is not a complete urlset`);
}

for (const forbidden of [
  '107502',
  'bq_dash_pin',
  'i18n-more.min.js?v=1',
  'i18n-more.min.js?v=5',
  'i18n-more.min.js?v=418',
  'js/menu-stage.js',
  'js/hero-pin.js'
]) {
  if (html.includes(forbidden)) failures.push(`index.html contains retired token: ${forbidden}`);
}

if (!html.includes('aria-hidden="true">02</span>') || !html.includes('aria-hidden="true">03</span>') || !html.includes('aria-hidden="true">04</span>')) {
  failures.push('room heroes are not numbered 02–04 to match the four-room menu');
}
if (html.includes('aria-hidden="true">05</span>') || html.includes('aria-hidden="true">06</span>')) {
  failures.push('retired room numbers 05/06 still present');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${ids.length} unique IDs and ${localRefs.size} local references.`);
