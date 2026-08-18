# ڕێبەری ڕێکخستنی کلاودفلێر بۆ پۆرتفۆلیۆی بەرەکات قورتاس (Cloudflare Pages Setup Guide)

ئەم ڕێبەرە ڕوونکردنەوەی تەواو دەدات لەسەر چۆنیەتی چالاککردن و بەستنەوەی سەرجەم تایبەتمەندییە سێرڤەرلێسەکانی (Cloudflare Pages Functions):

---

## ١. گۆڕاوە ژینگەییەکان (Environment Variables & Secrets)

لە داشبۆردی Cloudflare، بچۆ بۆ:
`Workers & Pages` > پڕۆژەی پۆرتفۆلیۆ هەڵبژێرە > `Settings` > `Variables and Secrets` > `Add variable`:

| ناوی گۆڕاو (Variable) | جۆر (Type) | وەسف (Description) | نموونە |
|---|---|---|---|
| `EDIT_TOKEN` | Secret (Encrypted) | تۆکنی پارێزراوی ستۆدیۆ بۆ دەستکاریکردنی ناوەڕۆک و چاتبۆتی ناوخۆ | `your_strong_secret_token` |
| `STATS_TOKEN` | Secret (Encrypted) | تۆکنی تایبەت بۆ خوێندنەوەی ئامارەکانی سەردانیکەران لە داشبۆرد | `your_stats_token` |
| `UMAMI_API_KEY` | Secret (ئارەزوومەندانە) | کلیلی APIی خزمەتگوزاری Umami Cloud بۆ نیشاندانی ڕاستەوخۆی ئامارەکان | `umami_api_...` |
| `UMAMI_WEBSITE_ID` | Plain text | ناسێنەری سایتی Umami (پێشوەختە لە کۆد دانراوە) | `f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa` |
| `ANTHROPIC_API_KEY` | Secret (ئارەزوومەندانە) | کلیلی Claude ئەگەر بتەوێت مۆدێلی پارەدار بەکاربهێنیت | `sk-ant-api03-...` |
| `DASH_PIN` | Secret (Encrypted) | پینی چوونەژوورەوەی ستۆدیۆ داشبۆرد (بۆ 2FA) | `123456` |
| `TOTP_SECRET` | Secret (ئارەزوومەندانە) | کلیلی دوو قۆناغی بۆ ئەپی Google Authenticator | `JBSWY3DPEHPK3PXP` |

---

## ٢. بەستنەوەی بنکەی دراوەی D1 (D1 Database Binding)

ئەگەر دەتەوێت ئاماری لۆکاڵی سەردانیکەران و خشتەی کارەکان لەناو کلاودفلێر پاشەکەوت بکرێن:
1. لە داشبۆردی Cloudflare بچۆ بۆ `Storage & Databases` > `D1 SQL Database` > `Create Database` بە ناوی `bqurtas-db`.
2. لەناو بەشی پڕۆژەکەت لە Pages، بچۆ بۆ `Settings` > `Functions` > `D1 database bindings`.
3. گۆڕاوەکە بە ناوی **`DB`** ببەستەوە بە بنکەی دراوەی دروستکراو.
4. خشتەکان دروست بکە بە جێبەجێکردنی فایلی [analytics-schema.sql](file:///Users/bqurtas/Documents/GitHub/BqurtasPortfolio/analytics-schema.sql) و [content-schema.sql](file:///Users/bqurtas/Documents/GitHub/BqurtasPortfolio/content-schema.sql).

---

## ٣. بەستنەوەی زیرەکی دەستکردی بێبەرامبەر (Cloudflare Workers AI)

1. لە بەشی `Settings` > `Functions` لە پڕۆژەی Pages.
2. لە بەشی `Workers AI bindings`، پەیوەندییەک بە ناوی **`AI`** زیاد بکە.
3. ئەمە ڕێگە بە چاتبۆت و داشبۆردی ستۆدیۆ دەدات مۆدێلی Llama 3.1 8B Instruct بەخۆڕایی و بێ کلیل بەکاربهێنێت!
