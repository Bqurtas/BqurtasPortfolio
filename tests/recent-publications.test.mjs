import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRecentPublications, selectRecentPublications } from '../preview_site/js/recent-publications.js';
import { catalogFromManifest } from '../functions/_gallery-catalog.js';

const now = Date.parse('2026-11-16T12:00:00Z');
const manifest = (images = [], videos = []) => ({ images, videos });
const image = (path, index, date = '2026-11-15T10:00:00Z', extra = {}) => ({
  path, index, date, width: 800, height: 1200, ...extra,
});
const film = (index, date = '2026-11-14T09:00:00Z') => image(`Videos/Film${index}.mp4`, index, date, {
  width: 1920, height: 1080, duration: 35, poster: `/assets/thumbs/Videos/Film${index}.jpg`,
});
const project = (id = '258173015', date = '2026-11-13', extra = {}) => ({
  id, slug: 'complete-identity', title: 'Complete identity', date,
  url: `https://www.behance.net/gallery/${id}/Complete-Identity`,
  cover: { src: `/assets/behance/${id}/cover.webp?v=abc012345678`, w: 808, h: 632 },
  images: [
    { src: `/assets/behance/${id}/01.webp?v=abc012345678`, w: 1400, h: 600 },
    { src: `/assets/behance/${id}/02.webp?v=def012345678`, w: 1400, h: 2000 },
  ],
  ...extra,
});

test('bulk releases become complete series, while every medium keeps its own edition', () => {
  const posters = Array.from({ length: 24 }, (_, i) => image(`Poster/Poster${i + 1}.webp`, i + 1));
  const editions = buildRecentPublications(manifest([
    ...posters, image('Book/BookCover1.webp', 1), image('Official/Official1.webp', 1),
  ], [film(1)]), { projects: [project()] }, { now });
  assert.equal(editions.length, 5);
  const series = editions.find(edition => edition.coll === 'posters');
  assert.equal(series.count, 24);
  assert.equal(series.members.length, 24, 'a batch never silently drops work beyond a thumbnail limit');
  assert.equal(new Set(series.members.map(member => member.href)).size, 24);
  assert.ok(series.members.every(member => member.href.startsWith('/design/posters/')));
  assert.deepEqual(new Set(editions.map(edition => edition.kind)), new Set(['image', 'video', 'case-study']));
  assert.equal(editions.find(edition => edition.kind === 'video').members[0].url, '/media/Videos/Film1.mp4');
});

test('local publication day groups across UTC midnight without collapsing different days', () => {
  const editions = buildRecentPublications(manifest([
    image('Poster/Poster1.webp', 1, '2026-11-14T21:30:00Z'), // 00:30 in Erbil
    image('Poster/Poster2.webp', 2, '2026-11-15T10:30:00Z'),
    image('Poster/Poster3.webp', 3, '2026-11-15T21:30:00Z'), // the next local day
  ]), {}, { now });
  assert.deepEqual(editions.map(edition => [edition.day, edition.count]), [['2026-11-16', 1], ['2026-11-15', 2]]);
  assert.equal(editions[1].members[0].index, 2, 'the newest member leads its series');
});

test('equal-time series members keep numeric catalogue order rather than lexicographic ids', () => {
  const editions = buildRecentPublications(manifest([
    image('Poster/Poster1.webp', 1, '2026-11-15T10:00:00Z'),
  ], [film(10), film(2), film(1)]), {}, { now });
  assert.deepEqual(editions.map(edition => edition.kind), ['image', 'video'], 'edition chronology is unchanged');
  const series = editions.find(edition => edition.kind === 'video');
  assert.deepEqual(series.members.map(member => member.index), [1, 2, 10]);
  assert.equal(series.preview.href, '/design/video/1');
});

test('specific canonical ownership wins even if its general duplicate has a newer date', () => {
  const hash = '0123456789abcdef';
  const editions = buildRecentPublications(manifest([
    image('GeneralDesign/GDesign1.webp', 1, '2026-11-16T09:00:00Z', { hash }),
    image('Poster/Poster1.webp', 9, '2026-11-14T10:00:00Z', { hash }),
    image('Poster/Poster2.webp', 10, '2026-11-15T10:00:00Z', { hash }),
  ]), {}, { now });
  assert.equal(editions.length, 1);
  assert.equal(editions[0].preview.href, '/design/posters/9', 'use the portfolio owner, never an alias URL');
  assert.equal(editions[0].day, '2026-11-14', 'an alias does not republish the original');
  assert.equal(editions[0].count, 1);
});

test('invalid, absent and future publication dates cannot become recent work', () => {
  const editions = buildRecentPublications(manifest([
    image('Poster/Poster1.webp', 1, ''),
    image('Poster/Poster2.webp', 2, '2026-02-30T10:00:00Z'),
    image('Poster/Poster3.webp', 3, '2026-12-01T10:00:00Z'),
    image('Poster/Poster4.webp', 4, '2026-11-16T10:00:00Z'),
    image('Poster/Poster5.webp', 5, 'Nov 15 2026'),
    image('Poster/Poster6.webp', 6, '2026-11-15T10:00:00'),
  ]), { synced: '2026-11-16', projects: [project('258173015', ''), project('258173016', '2026-12-01')] }, { now });
  assert.equal(editions.length, 1);
  assert.equal(editions[0].preview.index, 4);
  assert.equal(buildRecentPublications({}, {}, { now }).length, 0);
});

test('case studies retain their complete page order and genuine project date through re-syncs', () => {
  const raw = project();
  const [edition] = buildRecentPublications(manifest(), { synced: '2026-11-16', projects: [raw] }, { now });
  assert.equal(edition.day, '2026-11-13');
  assert.equal(edition.href, '/behance/258173015-complete-identity');
  assert.equal(edition.external, false);
  assert.equal(edition.pageCount, 2);
  assert.equal(edition.count, 2);
  assert.deepEqual(edition.members.map(member => [member.index, member.width, member.height]), [[1, 1400, 600], [2, 1400, 2000]]);
  assert.equal(edition.cover, raw.cover.src);
  assert.equal(edition.members[1].src, raw.images[1].src);
  assert.equal(edition.members[1].href, edition.href);
});

test('fresh feed-only projects use the existing same-origin cover and safe Behance link', () => {
  const id = '258173015';
  const cover = `/api/behance-cover?id=${id}&f=abc258173015.Y3JvcA.png&s=808`;
  const fresh = project(id, '2026-11-16', { live: true, images: [], cover: { src: cover, w: 808, h: 632 } });
  const [edition] = buildRecentPublications(manifest(), { projects: [fresh] }, { now });
  assert.equal(edition.external, true);
  assert.equal(edition.href, fresh.url);
  assert.equal(edition.cover, cover);
  assert.equal(edition.pageCount, 0);
  assert.equal(edition.count, 1, 'a cover-only project still has one displayable frame');
  const unsafe = project('258173016', '2026-11-16', { images: [], url: 'javascript:alert(1)' });
  assert.equal(buildRecentPublications(manifest(), { projects: [unsafe] }, { now }).length, 0);
});

test('local pages win over duplicate feed entries and unrelated media paths are excluded', () => {
  const local = project();
  const feed = { ...local, live: true, images: [] };
  const malicious = project('258173016', '2026-11-15', {
    cover: { src: 'https://unrelated.example/photo.jpg', w: 800, h: 600 },
    images: [{ src: '/assets/behance/258173015/01.webp', w: 800, h: 600 }],
  });
  const editions = buildRecentPublications(manifest(), { projects: [local, feed, malicious] }, { now });
  assert.equal(editions.length, 1);
  assert.equal(editions[0].external, false);
  assert.equal(editions[0].pageCount, 2);
});

test('bounded balanced views preserve each format and remain in real chronological order', () => {
  const editions = buildRecentPublications(manifest([
    image('Poster/Poster1.webp', 1, '2026-11-16T10:00:00Z'),
    image('Book/BookCover1.webp', 1, '2026-11-15T10:00:00Z'),
    image('LogoDesign/Logo1.webp', 1, '2026-11-14T10:00:00Z'),
    image('Official/Official1.webp', 1, '2026-11-13T10:00:00Z'),
  ], [film(1, '2026-11-01T10:00:00Z')]), { projects: [project('258173015', '2026-11-02')] }, { now });
  const selected = selectRecentPublications(editions, { limit: 3 });
  assert.deepEqual(selected.map(edition => edition.kind), ['image', 'case-study', 'video']);
  assert.ok(selected.every((edition, i) => !i || selected[i - 1].timestamp >= edition.timestamp));
  assert.equal(selectRecentPublications(editions).length, editions.length, 'the complete index remains accessible by default');
  assert.deepEqual(selectRecentPublications(editions, { limit: 3, balanced: false }).map(edition => edition.kind), ['image', 'image', 'image']);
  assert.equal(selectRecentPublications(editions, { limit: 0 }).length, 0);
  assert.equal(selectRecentPublications(editions, { filter: 'book' })[0].coll, 'book');
  assert.equal(selectRecentPublications(editions, { filter: 'case-study' }).length, 1);
  assert.equal(selectRecentPublications(editions, { filter: 'video' }).length, 1);
  assert.equal(selectRecentPublications(editions, { filter: 'image' }).length, 4);
});

test('real published catalogue members match edge canonical URLs and keep every eligible work', async () => {
  const data = JSON.parse(await readFile(new URL('../preview_site/assets/gallery-manifest.json', import.meta.url), 'utf8'));
  const behance = JSON.parse(await readFile(new URL('../preview_site/assets/behance/projects.json', import.meta.url), 'utf8'));
  const publications = buildRecentPublications(data, behance, { now });
  const actual = publications.filter(edition => edition.source === 'gallery').flatMap(edition => edition.members.map(member => member.href));
  const catalogue = catalogFromManifest(data);
  const expected = [...catalogue.byPath.values()].filter(work => !work.canonical
    && Number.isFinite(Date.parse(work.date)) && Date.parse(work.date) <= now)
    .map(work => `/design/${work.coll}/${work.index}`);
  assert.deepEqual(actual.slice().sort(), expected.sort());
  assert.equal(new Set(actual).size, actual.length);
  assert.equal(publications.filter(edition => edition.kind === 'case-study').length, behance.projects.length);
});
