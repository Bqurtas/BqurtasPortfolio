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
| CDN ی گەلەری | `https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main` |
| ڕاو فایلی کیتهاب | `https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main` |

گەلەری کارەکان لە فۆڵدەرەکانی ڕەگەوە دەخوێنرێتەوە (Book، Official، Photos، Videos، …) لە ڕێگەی jsDelivr. وێبسایتەکە خۆی لە `preview_site/` دایە و کلاودفلێر پەیجزی لەم ڕێپۆیە بڵاوی دەکاتەوە.

---

# Barakat Qurtas — portfolio

Source of truth for the public site at [bqurtas.com](https://bqurtas.com). Cloudflare Pages deploys from this repository. The same repo is the image/video CDN the gallery uses.

## GitHub path

- Repository: [Bqurtas/BqurtasPortfolio](https://github.com/Bqurtas/BqurtasPortfolio)
- Default branch: `main`
- Gallery CDN: `https://cdn.jsdelivr.net/gh/Bqurtas/BqurtasPortfolio@main/<folder>/<file>`
- Direct files: `https://raw.githubusercontent.com/Bqurtas/BqurtasPortfolio/main/<folder>/<file>`

Those constants also live in `preview_site/js/gallery.js` (`CDN_BASE`, `RAW_BASE`, `REPO`).

## Layout

| Path | What it is |
|---|---|
| `preview_site/` | The website (HTML, CSS, JS, first-party assets) |
| `functions/` | Cloudflare Pages Functions (routes, studio, analytics) |
| `Book/`, `Official/`, `Photos/`, `Videos/`, … | Gallery originals served via jsDelivr |
| `WorkWith/` | Client marks in the bio marquee |
| `scripts/`, `tests/` | Build, validation, and tests |

Do not move or rename gallery folders: the live site and sitemap point at those GitHub paths.

## Local preview

```bash
npm ci
npm test
npm run dev
```

`npm run dev` fingerprints assets and serves `preview_site` locally.

Studio, 2FA, and publishing tokens stay in Cloudflare secrets — see `CLOUDFLARE_SETUP.md`. Never commit them here.
