import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the Barakat Qurtas entity stays consistent across search and AI surfaces', async () => {
  const html = await readFile(new URL('../preview_site/index.html', import.meta.url), 'utf8');
  const llms = await readFile(new URL('../preview_site/llms.txt', import.meta.url), 'utf8');
  const match = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(match, 'the page should publish structured data');

  const graph = JSON.parse(match[1])['@graph'];
  const person = graph.find((node) => node['@id'] === 'https://bqurtas.com/#person');
  const studio = graph.find((node) => node['@id'] === 'https://bqurtas.com/#service');

  assert.equal(person.name, 'Barakat Qurtas');
  assert.ok(person.alternateName.includes('بەرەکات قورتاس'));
  assert.ok(person.jobTitle.includes('Multidisciplinary Designer'));
  assert.ok(person.jobTitle.includes('Creative Technologist'));
  assert.ok(person.knowsAbout.includes('Graphic designer in Erbil'));
  assert.ok(person.knowsAbout.includes('Web design and front-end production'));
  assert.ok(!person.sameAs.includes('https://presidency.gov.krd/en/home'),
    'an employer website must not be declared as the same entity as the person');

  assert.equal(studio.name, 'Barakat Qurtas Studio');
  assert.equal(studio.founder['@id'], person['@id']);
  assert.match(llms, /^# Barakat Qurtas/m);
  assert.match(llms, /creative technologist/i);
  assert.match(llms, /graphic designer in Erbil/i);
});
