import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function generateSiteSchema(root = projectRoot) {
  const html = await readFile(path.join(root, 'preview_site/index.html'), 'utf8');
  const match = html.match(/<script id="site-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing site identity graph');
  const graph = JSON.parse(match[1]);
  if (!Array.isArray(graph['@graph'])) throw new Error('Invalid site identity graph');
  const source = '// Generated from preview_site/index.html by scripts/generate-site-schema.mjs.\n'
    + 'export const SITE_SCHEMA = ' + JSON.stringify(graph, null, 2) + ';\n';
  const output = path.join(root, 'functions/_site-schema-data.js');
  let previous;
  try { previous = await readFile(output, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (source === previous) return false;
  await writeFile(output, source);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateSiteSchema();
