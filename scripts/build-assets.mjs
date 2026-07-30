import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

const bundles = [
  ['preview_site/js/main.js', 'preview_site/js/main.v420.min.js'],
  ['preview_site/js/gallery.js', 'preview_site/js/gallery.v420.min.js'],
  ['preview_site/js/i18n.js', 'preview_site/js/i18n.v420.min.js'],
  ['preview_site/js/enhance.js', 'preview_site/js/enhance.v420.min.js'],
  ['preview_site/js/motion.js', 'preview_site/js/motion.min.js']
];

for (const [input, output] of bundles) {
  const source = await readFile(input, 'utf8');
  const result = await minify(source, {
    ecma: 2020,
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error(`Terser produced no output for ${input}`);
  await writeFile(output, `${result.code}\n`);
  console.log(`${input} -> ${output}`);
}
