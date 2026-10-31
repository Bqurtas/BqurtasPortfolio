import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syntax } from 'csso';
import { FA_DIR, usedIconCodepoints } from './subset-icon-fonts.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vendorDirectory = FA_DIR.replace(/^preview_site\//, '');
export const ICON_SOURCE = `${vendorDirectory}/css/all.min.css`;
export const ICON_OUTPUT = `${vendorDirectory}/css/icons.min.css`;

/* The fonts already contain only used glyphs. Keep their original class rules,
   aliases, utilities, animation keyframes and font declarations; omit only a
   pure glyph rule when none of its names occurs anywhere in the site's source.
   The unmodified vendor sheet remains the source for future added icons. */
export function subsetIconStyles(source, classes) {
  const used = new Set(classes);
  const ast = syntax.parse(source);
  syntax.walk(ast, {
    visit: 'Rule',
    enter(rule, item, list) {
      if (rule.prelude.type !== 'SelectorList') return;
      const declarations = rule.block.children.toArray();
      if (declarations.length !== 1 || declarations[0].type !== 'Declaration' || declarations[0].property !== 'content') return;
      const names = rule.prelude.children.toArray().map(selector => syntax.generate(selector).match(/^\.(fa-[a-z0-9-]+):{1,2}before$/)?.[1]);
      if (names.every(Boolean) && !names.some(name => used.has(name))) list.remove(item);
    }
  });
  const licenses = source.match(/\/\*![\s\S]*?\*\//g) || [];
  return `${licenses.length ? `${licenses.join('\n')}\n` : ''}${syntax.generate(ast)}\n`;
}

export function useSubsetIconStyles(source) {
  return source.replace(
    /(["'])(\/?vendor\/fontawesome-v309\/css\/)(?:all|icons)\.min\.css((?:\?v=[A-Za-z0-9._-]+)?)\1/g,
    (_whole, quote, directory, version) => `${quote}${directory}icons.min.css${version}${quote}`
  );
}

export async function generateIconStyles(root = projectRoot) {
  const source = await readFile(path.join(root, 'preview_site', ICON_SOURCE), 'utf8');
  const { classes } = await usedIconCodepoints(root);
  if (!classes.length) throw new Error('Icon source scan unexpectedly found no named icons');
  const output = subsetIconStyles(source, classes);
  const destination = path.join(root, 'preview_site', ICON_OUTPUT);
  let previous = null;
  try { previous = await readFile(destination, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const changed = previous !== output;
  if (changed) await writeFile(destination, output);
  return { changed, classes: classes.length, bytes: Buffer.byteLength(output) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateIconStyles();
