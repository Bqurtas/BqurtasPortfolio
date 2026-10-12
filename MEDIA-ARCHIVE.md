# Media archive and search discovery

The animated portfolio stays unchanged. `/archive/` provides ordinary, visible
HTML links to paginated collections of the same media. Every catalogue image
has an `<img src>` containing its original URL, a real link to the original,
and one archive landing page in `sitemap-images.xml`. No visitor interaction
or JavaScript is required to discover the catalogue.

`npm run build` runs `scripts/generate-media-archive.mjs` after updating the
gallery manifest. Generated HTML is committed with the other build outputs.
The generator is deterministic, writes only changed files, and removes only
its own obsolete HTML pages when a collection shrinks. The original media stay
at the same public GitHub URLs already used by the portfolio; the archive does
not copy roughly 49 MB of images or 227 MB of videos into the Pages deployment.

The current manifest produces 38 archive pages covering 685 images and 30
videos, plus 30 dedicated watch pages. Each watch page prominently embeds one
complete video, has native controls and a real frame from that specific video
as its poster. Thirty committed JPEG posters add approximately 2.6 MB.

The build validates JPEG dimensions before including a watch page in
`sitemap-videos.xml`. If a new video has no valid poster, its original remains
linked from the archive, but no watch page or video sitemap entry is invented.
On macOS, regenerate posters from the repository root with:

```sh
swift -module-cache-path /tmp/bq-swift-cache scripts/generate-video-posters.swift
npm run build
```

The poster command uses AVFoundation; it is a maintenance step, not a Node/CI
build dependency. Inspect the resulting frames after replacing media. Original
file paths, dimensions and existing collection labels come from the catalogue.
The manifest does not provide publication dates or descriptive project titles.
There are no invented dates, durations, client names or VideoObject upload dates.
More descriptive authored titles and captions would improve the archive further.

The three generated discovery files are:

- `/sitemap-gallery.xml`: the 68 canonical HTML archive/watch URLs.
- `/sitemap-images.xml`: all 685 original catalogue images on their actual
  archive pages, plus the two portrait/avatar images on the homepage.
- `/sitemap-videos.xml`: 30 watch URLs with their matching original video,
  thumbnail, title and visible description.

`robots.txt` advertises all three alongside the existing page sitemap. The
Cloudflare function passes only the generated archive/watch routes to static
Pages assets and serves each sitemap's own XML. A generated edge route list
rejects unknown pages before static fallback; slashless and `index.html`
aliases redirect to the canonical trailing-slash URL. The old
`/sitemap-media.xml` alias still serves
the image sitemap. Unknown archive files remain real 404s rather than the SPA
shell. The service worker leaves these standalone documents to the network.

After deployment, submit the sitemap URLs in Search Console and inspect a
category page, a later pagination page and a watch page. Check the image/video
indexing reports after Google recrawls. This removes discovery obstacles; it
does not guarantee indexing, eligibility or ranking. Media are hosted on the
existing GitHub raw domain, which remains an external availability dependency.

Google documentation informing this implementation:

- [Lazy loading and crawlable pagination](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)
- [Image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
- [Video SEO and watch pages](https://developers.google.com/search/docs/appearance/video)
- [Video sitemap required and optional metadata](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)
