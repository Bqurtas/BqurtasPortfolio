import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequest } from '../functions/[[route]].js';
import { onRequestPost as onTwoFactorPost } from '../functions/api/2fa.js';

const runRoute = (path, accept = 'text/html') => onRequest({
  request: new Request(`https://bqurtas.com${path}`, { headers: { Accept: accept } }),
  env: {},
  next: () => new Response(null, { status: 204 })
});

test('retired routes redirect to canonical destinations and preserve locale/query', async () => {
  const work = await runRoute('/ku/work/identity?ref=old');
  assert.equal(work.status, 301);
  assert.equal(work.headers.get('location'), 'https://bqurtas.com/ku/design?ref=old');

  const stationery = await runRoute('/design/business');
  assert.equal(stationery.status, 301);
  assert.equal(stationery.headers.get('location'), 'https://bqurtas.com/design/stationery');

  const studio = await runRoute('/ar/panjamor');
  assert.equal(studio.status, 301);
  assert.equal(studio.headers.get('location'), 'https://bqurtas.com/ar/contact');
});

test('unknown document routes are real noindex 404 responses', async () => {
  const response = await runRoute('/this-page-does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('known app routes and static files continue to Pages', async () => {
  assert.equal((await runRoute('/blog/12')).status, 204);
  assert.equal((await runRoute('/assets/avatar.webp', 'image/avif,image/webp,*/*')).status, 204);
  assert.equal((await runRoute('/sitemap-images.xml', 'application/xml')).status, 204);
});

test('every canonical sitemap page is handled by the application router', async () => {
  const xml = await readFile(new URL('../preview_site/sitemap.xml', import.meta.url), 'utf8');
  const urls = [...xml.matchAll(/<loc>(https:\/\/bqurtas\.com[^<]*)<\/loc>/g)]
    .map((match) => new URL(match[1]));
  assert.ok(urls.length > 0, 'sitemap.xml should contain canonical page URLs');

  for (const url of urls) {
    const response = await runRoute(url.pathname);
    assert.notEqual(response.status, 404, `${url.pathname} is listed in the sitemap but the router returns 404`);
  }
});

test('mail autoconfig and autodiscover publish SpaceMail IMAP/SMTP hosts', async () => {
  const auto = await runRoute('/.well-known/autoconfig/mail/config-v1.1.xml', 'application/xml');
  assert.equal(auto.status, 200);
  const autoXml = await auto.text();
  assert.match(autoXml, /mail\.spacemail\.com/);
  assert.match(autoXml, /<port>993<\/port>/);
  assert.match(autoXml, /<port>465<\/port>/);

  const discover = await onRequest({
    request: new Request('https://bqurtas.com/autodiscover/autodiscover.xml', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: '<Autodiscover><Request><EMailAddress>hello@bqurtas.com</EMailAddress></Request></Autodiscover>'
    }),
    env: {},
    next: () => new Response(null, { status: 204 })
  });
  assert.equal(discover.status, 200);
  const discoverXml = await discover.text();
  assert.match(discoverXml, /<Server>mail\.spacemail\.com<\/Server>/);
  assert.match(discoverXml, /<LoginName>hello@bqurtas.com<\/LoginName>/);
});

test('two-factor authentication fails closed without server secrets', async () => {
  const response = await onTwoFactorPost({
    request: new Request('https://bqurtas.com/api/2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', pin: 'anything' })
    }),
    env: {}
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: 'not-configured' });
});
