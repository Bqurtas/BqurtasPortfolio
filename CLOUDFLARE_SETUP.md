# ڕێبەری ڕێکخستنی کلاودفلێر بۆ پۆرتفۆلیۆی بەرەکات قورتاس (Cloudflare Pages Setup Guide)

ئەم ڕێبەرە ڕوونکردنەوەی تەواو دەدات لەسەر چۆنیەتی چالاککردن و بەستنەوەی سەرجەم تایبەتمەندییە سێرڤەرلێسەکانی (Cloudflare Pages Functions):

---

## ١. گۆڕاوە ژینگەییەکان (Environment Variables & Secrets)

لە داشبۆردی Cloudflare، بچۆ بۆ:
`Workers & Pages` > پڕۆژەی پۆرتفۆلیۆ هەڵبژێرە > `Settings` > `Variables and Secrets` > `Add variable`:

| ناوی گۆڕاو (Variable) | جۆر (Type) | وەسف (Description) | نموونە |
|---|---|---|---|
| `EDIT_TOKEN` | Secret (Encrypted) | تۆکنی پارێزراوی ستۆدیۆ بۆ دەستکاریکردنی ناوەڕۆک و چاتبۆتی ناوخۆ | `your_strong_secret_token` |
| `SUPABASE_EDIT_TOKEN` | Secret (Encrypted) | تۆکنی جیاواز و تەنها-سێرڤەر کە Supabase Edge Function ـەکان دەیانپشکنن؛ نابێت یەکسان بێت بە `EDIT_TOKEN` | `a_different_upstream_only_secret` |
| `SUPABASE_PUBLISHABLE_KEY` | Secret (ئارەزوومەندانە) | publishable key ـی Supabase بۆ proxy؛ ئەگەر دانەنرێت کلیلی گشتیی پڕۆژە بەکاردێت | `sb_publishable_...` |
| `STATS_TOKEN` | Secret (Encrypted) | تۆکنی تایبەت بۆ خوێندنەوەی ئامارەکانی سەردانیکەران لە داشبۆرد | `your_stats_token` |
| `SESSION_SECRET` | Secret (Encrypted) | کلیلی سەربەخۆ بۆ واژۆکردنی سێشنی 2FA؛ دەبێت جیاواز بێت لە PIN و هەموو تۆکنەکان و لانیکەم 32 بایت هەڕەمەکی بێت | `generate_a_new_random_32_byte_secret` |
| `ANALYTICS_SALT` | Secret (Encrypted) | کلیلی HMAC بۆ دروستکردنی ناسێنەری نهێنی سەردانیکەر؛ هەرگیز `SALT` یان نرخێکی گشتی بەکارمەهێنە | `generate_another_random_secret` |
| `UMAMI_API_KEY` | Secret (ئارەزوومەندانە) | کلیلی APIی خزمەتگوزاری Umami Cloud بۆ نیشاندانی ڕاستەوخۆی ئامارەکان | `umami_api_...` |
| `UMAMI_WEBSITE_ID` | Plain text | ناسێنەری سایتی Umami (پێشوەختە لە کۆد دانراوە) | `f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa` |
| `ANTHROPIC_API_KEY` | Secret (ئارەزوومەندانە) | کلیلی Claude ئەگەر بتەوێت مۆدێلی پارەدار بەکاربهێنیت | `sk-ant-api03-...` |
| `DASH_PIN` | Secret (Encrypted) | پینی چوونەژوورەوەی ستۆدیۆ داشبۆرد (بۆ 2FA)؛ ئەگەر پێشتر لە Git بووە دەبێت بگۆڕدرێت | `use_a_new_random_pin` |
| `TOTP_SECRET` | Secret (ئارەزوومەندانە) | کلیلی دوو قۆناغی بۆ ئەپی Google Authenticator | `JBSWY3DPEHPK3PXP` |
| `WEB3FORMS_KEY` | Secret (ئارەزوومەندانە) | access key ـی Web3Forms؛ خۆی دیاری دەکات کۆدەکە بۆ کام inbox بڕوات | `your_primary_form_key` |
| `WEB3FORMS_BACKUP_KEY` | Secret (ئارەزوومەندانە) | access key ـێکی جیاواز بۆ inbox ـی backup | `your_backup_form_key` |
| `TWOFA_SENDER_EMAIL` | Secret (ئارەزوومەندانە) | ناونیشانی نێرەر بۆ داواکاری Web3Forms؛ لە source code ـدا ناونیشانی تایبەت دانەنراوە | `security@your-domain.example` |
| `OWNER_PHONE` | Secret (ئارەزوومەندانە) | ژمارەی وەرگری SMS بە شێوەی E.164؛ هیچ ژمارەی پێشوەختەیەک لە کۆددا نییە | `+<country-code><number>` |

---

## ٢. بەستنەوەی بنکەی دراوەی D1 (D1 Database Binding)

ئەگەر دەتەوێت ئاماری لۆکاڵی سەردانیکەران و خشتەی کارەکان لەناو کلاودفلێر پاشەکەوت بکرێن:
1. لە داشبۆردی Cloudflare بچۆ بۆ `Storage & Databases` > `D1 SQL Database` > `Create Database` بە ناوی `bqurtas-db`.
2. لەناو بەشی پڕۆژەکەت لە Pages، بچۆ بۆ `Settings` > `Functions` > `D1 database bindings`.
3. گۆڕاوەکە بە ناوی **`DB`** ببەستەوە بە بنکەی دراوەی دروستکراو.
4. خشتەکان دروست بکە بە جێبەجێکردنی فایلی [analytics-schema.sql](./analytics-schema.sql) و [content-schema.sql](./content-schema.sql).

`DB` بۆ rate limiting ـی سێشن، دەستکاریی ناوەڕۆک، ئامار و AI پێویستە. ئەگەر Cloudflare Rate Limiting binding بە ناوی `RATE_LIMITER` دابنێیت، API ـەکان ئەوی بە پێشەوە بەکاردەهێنن؛ بەڵام D1 هێشتا بۆ 2FA challenge و ناوەڕۆک پێویستە.

> گرنگ: دوای دانانی secret ـە نوێکان، هەر `DASH_PIN`، `EDIT_TOKEN` یان `STATS_TOKEN` ـێک کە پێشتر لە Git history یان log ـدا دەرکەوتووە بگۆڕە. تەنها سڕینەوەی لە فایلی ئێستا secret ـی کۆن بێ‌کار ناکات.

### جیاکردنەوەی تۆکنی داشبۆرد لە Supabase

هەموو کارەکانی `work-upload`، `blog-admin`، `latest-admin` و `projects-admin` لە ڕێگەی `/api/studio/*` دەڕۆن. بۆ ئەوەی بانگکردنی ڕاستەوخۆی Supabase نتوانێت 2FA تێپەڕێنێت:

1. جارێک تۆکنی ناوخۆی Edge Function ـەکانی Supabase بگۆڕە بۆ نرخێکی نوێ و هەڕەمەکی.
2. هەمان نرخ لە Cloudflare بە ناوی `SUPABASE_EDIT_TOKEN` دابنێ؛ ئەم نرخە هەرگیز بۆ براوزەر نانێردرێت.
3. `EDIT_TOKEN` ـێکی جیاواز بۆ چوونەژوورەوەی ئەدیتەر دابنێ. Proxy داواکارییەک تەنها کاتێک دەنێرێت کە سێشنی 2FA و ئەم تۆکنە هەردووکیان دروست بن.

دوگمەی «گۆڕینی پاسۆردی ئەدیتەر» لە ئێستاوە تەنها تۆکنی براوزەر دەگۆڕێت و digest ـێکی HMAC لە خشتەی `studio_auth` ـی D1 هەڵدەگرێت؛ تۆکنی ناوخۆی Supabase ناگۆڕێت. ئەگەر `SESSION_SECRET` بگۆڕیت، جارێک `DELETE FROM studio_auth WHERE k='edit-token';` لە D1 جێبەجێ بکە تا `EDIT_TOKEN` ـی Cloudflare دووبارە ببێتە bootstrap.

---

## ٣. بەستنەوەی زیرەکی دەستکردی بێبەرامبەر (Cloudflare Workers AI)

1. لە بەشی `Settings` > `Functions` لە پڕۆژەی Pages.
2. لە بەشی `Workers AI bindings`، پەیوەندییەک بە ناوی **`AI`** زیاد بکە.
3. ئەمە ڕێگە بە چاتبۆت و داشبۆردی ستۆدیۆ دەدات مۆدێلی Llama 3.1 8B Instruct بەخۆڕایی و بێ کلیل بەکاربهێنێت!

---

## ٤. ڕێکخستنی Cache ـی Cloudflare

HTML، `sw.js`، sitemap و API نابێت بە یاسای **Cache Everything** یان بە
`Edge Cache TTL → Ignore cache-control header` هەڵگیرێن. ئەگەر یاسایەکی
وەهات هەیە:

1. لە `Caching` > `Cache Rules` یاسای **Cache Everything** ناچالاک/بسڕەوە،
   یان لانیکەم هەڵبژاردەی نادیدەگرتنی origin header لاببە.
2. تەنها `/assets/`، `/css/`، `/js/` و `/vendor/` بۆ cache ـی درێژخایەن
   بهێڵە؛ کۆدەکە fingerprint ـی ناوەڕۆک بۆ CSS/JS دروست دەکات.
3. یەک جار `Purge Everything` بکە تا HTML و Service Worker ـی کۆن لە edge
   نەمێننەوە.
4. `/` و `/sw.js` بپشکنە: `CF-Cache-Status` دەبێت `BYPASS` یان `DYNAMIC`
   بێت و `Cloudflare-CDN-Cache-Control: no-store` هەبێت.

هێدەرەکانی ناو repo بە تەنها ناتوانن یاسایەک بشکێنن کە بە ئەنقەست
`Cache-Control` نادیدە دەگرێت؛ بۆیە ئەم هەنگاوە لە داشبۆرد پێویستە.

---

## ٥. پشکنینی Supabase Studio

Edge Function ـەکانی `blog-admin`، `projects-admin`، `latest-admin` و
`set-token` لە دۆمەینی Supabase جێبەجێ دەبن، نە لە Pages. لە هەر یەکێکیاندا:

- `x-edit-token` لەگەڵ secret ـی سێرڤەر بەراورد بکە؛
- CORS تەنها بۆ `https://bqurtas.com` ڕێگە پێبدە؛
- تۆکنێکی پێشتر دەرکەوتوو بگۆڕە و log ـەکان پاک بکەوە؛
- RLS ـی خشتەکان بۆ anonymous write داخراو بێت.

تۆکنەکە لە وێبگەڕدا ئێستا تەنها لە `sessionStorage` ـە و بە داخستنی تاب
نامێنێت؛ بەڵام گۆڕینی secret ـی Supabase دەبێت لە داشبۆردی Supabase خۆی
ئەنجام بدرێت.
