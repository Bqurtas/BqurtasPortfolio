import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';
import { minify as minifyCss } from 'csso';

const jsBundles = [
  ['preview_site/js/main.js', 'preview_site/js/main.v420.min.js'],
  ['preview_site/js/gallery.js', 'preview_site/js/gallery.v420.min.js'],
  ['preview_site/js/i18n.js', 'preview_site/js/i18n.v420.min.js'],
  ['preview_site/js/i18n-more.js', 'preview_site/js/i18n-more.min.js'],
  ['preview_site/js/enhance.js', 'preview_site/js/enhance.v420.min.js'],
  ['preview_site/js/motion.js', 'preview_site/js/motion.min.js'],
  ['preview_site/js/chat-kb.js', 'preview_site/js/chat-kb.min.js'],
  ['preview_site/js/lux.js', 'preview_site/js/lux.min.js']
];

const cssBundles = [
  ['preview_site/css/style.css', 'preview_site/css/style.v417.min.css']
];

for (const [input, output] of jsBundles) {
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

for (const [input, output] of cssBundles) {
  const source = await readFile(input, 'utf8');
  const result = minifyCss(source, { restructure: false });
  if (!result.css) throw new Error(`csso produced no output for ${input}`);
  await writeFile(output, `${result.css}\n`);
  console.log(`${input} -> ${output}`);
}
