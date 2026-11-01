# بەرەکات قورتاس — پۆرتفۆلیۆ

وێبسایتی فەرمی [bqurtas.com](https://bqurtas.com) لێرە هەڵگیراوە و لە کیتهاب دەپارێزرێت.

![Barakat Qurtas](preview_site/assets/cover.webp)

**بارەکات قورتاس** دیزاینەرێکی گرافیک و تەکنەلۆژیستێکی داهێنەرانەی کوردە لە هەولێر. ئەم ڕێپۆیە سەرچاوەی وێبسایتەکەیە، گەلەری کارەکان، و CDNـی وێنەکان.

## ڕێڕەوی کیتهاب

| | |
|---|---|
| ڕێپۆ | [github.com/Bqurtas/BqurtasPortfolio](https://github.com/Bqurtas/BqurtasPortfolio) |
| لق | `main` |
| وێبسایتی زیندوو | [bqurtas.com](https://bqurtas.com) |
| میدیای گەلەری | `https://bqurtas.com/media/<folder>/<file>` |
| ڕاو فایلی کیتهاب | `https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main` |

فایلە ڕەسەنەکانی گەلەری لە فۆڵدەرەکانی ڕەگی ڕیپۆکە پاشەکەوت دەکرێن (Book، Official، Photos، Videos، …). کلاودفلێر تەنها فایلە ڕێگەپێدراوەکان لە کیتهاب دەخوێنێتەوە و بە ڕێڕەوی `/media/` لە هەمان دۆمەینی وێبسایت پێشکەشیان دەکات. وێبسایتەکە لە `preview_site/` دایە؛ کلاودفلێر پەیجز بڵاوی دەکاتەوە و ناوەڕۆکی داشبۆرد لە Cloudflare D1 هەڵدەگیرێت.

---

# Barakat Qurtas — portfolio

Source of truth for the public site at [bqurtas.com](https://bqurtas.com). Cloudflare Pages deploys from this repository. GitHub stores public media; Cloudflare serves it and runs the site's APIs. Studio content, enquiries and analytics live in Cloudflare D1, and the optional assistant uses Cloudflare Workers AI.

## GitHub path

- Repository: [Bqurtas/BqurtasPortfolio](https://github.com/Bqurtas/BqurtasPortfolio)
- Default branch: `main`
- Public gallery media: `https://bqurtas.com/media/<folder>/<file>`
- Direct files: `https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/<folder>/<file>`

The gallery uses `MEDIA_BASE`, `RAW_BASE` and `REPO` in `preview_site/js/gallery.js`. Its cards load first-party thumbnails; originals and films use the allowlisted `/media/` route. Direct GitHub URLs are a bounded gallery fallback, not an additional storage service.

## Layout

| Path | What it is |
|---|---|
| `preview_site/` | The website (HTML, CSS, JS, first-party assets) |
| `functions/` | Cloudflare Pages Functions (routes, studio, analytics) |
| `Book/`, `Official/`, `Photos/`, `Videos/`, … | Gallery originals stored in GitHub and served through Cloudflare `/media/` |
| `WorkWith/` | Client marks in the bio marquee |
| `preview_site/uploads/` | Studio-uploaded article and project images |
| `scripts/`, `tests/` | Build, validation, and tests |

Do not move or rename gallery folders: the media allowlist, live site and sitemap depend on those paths. Gallery publishing updates originals, thumbnails and the manifest in one GitHub commit; the Pages build refreshes archive pages and media sitemaps. Published Journal posts enter the page sitemap directly from D1.

## Local preview

```bash
npm ci
npm test
npm run dev
```

`npm run dev` fingerprints assets and serves `preview_site` locally. To exercise Pages Functions and local bindings, use `npx --yes wrangler pages dev preview_site --port 8788 --ip 127.0.0.1`; a static preview alone cannot authenticate or publish to the live Studio.

Studio, 2FA, and publishing tokens stay in Cloudflare secrets — see `CLOUDFLARE_SETUP.md`. Never commit them here.
