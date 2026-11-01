import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { syntax } from 'csso';

const css = await readFile(new URL('../preview_site/css/polish.css', import.meta.url), 'utf8');
const ast = syntax.parse(css);
const rules = [];
function collect(children, media = '') {
  children.forEach(node => {
    if (node.type === 'Atrule' && node.block) {
      collect(node.block.children, node.name === 'media' ? syntax.generate(node.prelude) : media);
    } else if (node.type === 'Rule') {
      const declarations = new Map();
      node.block.children.forEach(declaration => {
        if (declaration.type === 'Declaration') declarations.set(declaration.property, {
          value: syntax.generate(declaration.value), important: declaration.important,
        });
      });
      node.prelude.children.forEach(selector => rules.push({ selector: syntax.generate(selector), media, declarations }));
    }
  });
}
collect(ast.children);
const note = 'html body #design#design#design.paper-stack>.section.practice-note';
function required(rule, property, value) {
  assert.ok(rule, 'the scoped paint rule must exist');
  assert.deepEqual(rule.declarations.get(property), { value, important: true }, property);
}

test('the sticky note and nested teaser never return to intrinsic lazy placeholders after measurement', () => {
  for (const selector of [note, `${note} .bio-teaser`]) {
    const rule = rules.find(rule => rule.selector === selector && !rule.media);
    required(rule, 'content-visibility', 'visible');
    required(rule, 'contain-intrinsic-size', 'none');
  }
});

test('compact and coarse note content stays visible without waiting for legacy reveal observers', () => {
  for (const selector of [
    `${note} .bio-teaser-grid.lux-reveal`,
    `${note} :is(.bq-rise,.motion-reveal):not(.bq-chapter-title)`,
  ]) {
    const rule = rules.find(rule => rule.selector === selector);
    assert.equal(rule?.media, '(max-width:820px),(hover:none),(pointer:coarse)');
    for (const [property, value] of [['opacity', '1'], ['clip-path', 'none'], ['transform', 'none'], ['transition', 'none'], ['will-change', 'auto']]) {
      required(rule, property, value);
    }
  }
});

test('full-motion chapter titles retain their own effect while reduced mode remains readable', () => {
  const full = rules.find(rule => rule.selector.startsWith('html.bq-reactive-motion') && rule.selector.endsWith('.bq-chapter-title'));
  assert.match(full?.declarations.get('opacity')?.value || '', /^var\(--chapter-opacity,\s*1\)$/);
  assert.match(full?.declarations.get('transform')?.value || '', /var\(--chapter-y,\s*0px\)/);
  const reduced = rules.find(rule => rule.selector.startsWith('html:not(.bq-reactive-motion)') && rule.selector.includes('.section.practice-note') && rule.selector.endsWith('.bq-chapter-title'));
  required(reduced, 'opacity', '1');
  required(reduced, 'clip-path', 'none');
});
