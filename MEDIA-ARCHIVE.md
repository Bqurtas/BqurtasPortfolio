# Media archive and search discovery

The animated portfolio stays unchanged. `/archive/` provides ordinary, visible
HTML links to paginated collections of every catalogue work. No visitor
interaction or JavaScript is required to discover the catalogue; the gallery
links to it with "Browse the full archive".

Every archive card links to the work's canonical page, `/design/<coll>/<n>`
(served by `functions/_work-page.js`), and shows the same first-party
`/media/` image (or the `/assets/thumbs/` video thumbnail) that page uses. The
archive therefore adds crawl paths to the existing work pages instead of
creating a second URL for each image or video. Indexing, media URLs and
duplicate detection come from `functions/_gallery-catalog.js`, so archive
order matches the work-page numbering.

`npm run build` runs `scripts/generate-media-archive.mjs` after updating the
gallery manifest. Generated HTML is committed with the other build outputs.
The generator is deterministic, writes only changed files, and removes only
its own obsolete HTML pages when a collection shrinks.

As of 24 October 2026, the manifest produces 38 archive pages covering 686 image
records and 30 videos. Of those image records, 633 have their own canonical work
page; 53 byte-identical aliases redirect to their canonical work and are not
submitted as separate works. Counts change when the owner publishes or removes
media. Discovery files:

- `/sitemap-gallery.xml`: the canonical archive URLs (written by the archive
  generator).
- `/sitemap-images.xml`: every canonical work page with its image or video, written by
  `scripts/generate-image-sitemap.mjs`. The archive generator does not touch it.

Studio gallery uploads update the manifest and original/thumbnail files in one
GitHub commit. The Cloudflare Pages production build regenerates the archive and
image sitemap from that manifest. Journal posts are stored in D1 and enter
`/sitemap.xml` at request time when published; no Pages rebuild is required for
text-only Journal changes.

`robots.txt` advertises both alongside the page sitemap. The Cloudflare
function passes only the generated archive routes
(`functions/_media-archive-routes.js`) to static Pages assets; unknown archive
paths are real 404s rather than the SPA shell, and slashless or `index.html`
aliases redirect to the canonical trailing-slash URL. The old
`/sitemap-media.xml` alias still serves the image sitemap.

Archive pages carry a strict CSP (`img-src 'self'`, `script-src 'self'`) from
`_headers`. One local script adds motion, back-to-top behaviour and first-party
analytics. Crawlable links and images remain available without JavaScript.

These files provide discovery paths, not a guarantee of Google indexing. A
successful sitemap submission, a requested crawl and an indexed work are
different states; Search Console must be used to check the latter.

Google documentation informing this implementation:

- [Lazy loading and crawlable pagination](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)
- [Image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
