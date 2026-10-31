# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **Bqurtas / Pencemor Studio** personal design portfolio: a static
multilingual site in `preview_site/` served by Cloudflare Pages, plus Cloudflare
Pages Functions in `functions/` (`functions/[[route]].js` for edge SEO/redirects/mail
XML, and `functions/api/*.js` for content, analytics, 2FA, and an AI assistant).
It is plain JavaScript (ESM) with **no framework and no TypeScript**. Node.js 22.

### Standard commands (already documented in `package.json` / CI)

Install/build/lint/test commands live in `package.json` scripts and
`.github/workflows/site-quality.yml`. In short: `npm ci`, `npm run build`,
`npm run check:syntax` (lint = `node --check`), `npm test` (syntax + `validate` +
`node --test`). No ESLint/Prettier is configured. The update script already runs
`npm ci`, so you normally do not need to reinstall.

### Non-obvious caveats

- **Committed minified bundles must stay in sync.** `npm run build` regenerates
  `preview_site/js/*.min.js` and `preview_site/css/*.min.css` from their source
  files. CI fails if the generated `*.v420.min.js` bundles differ from what's
  committed (`git diff --exit-code -- preview_site/js/*.v420.min.js`). After
  editing any `preview_site/js/*.js` or `preview_site/css/style.css`, re-run
  `npm run build` and commit the regenerated bundles.
- **Running the app locally:** there is no dev-server script in `package.json`.
  To exercise the Functions (redirects, mail XML, `/api/*`) run
  `npx --yes wrangler pages dev preview_site --port 8788 --ip 127.0.0.1`.
  Wrangler is intentionally NOT a dependency, so it downloads on first `npx` run
  (needs network). For static-only preview, any static file server pointed at
  `preview_site/` works (the `_redirects` SPA rule falls back to `index.html`).
- **Functions fail closed by design.** All backend features (D1 database `DB`
  binding, Workers `AI` binding, 2FA secrets, Umami/Supabase/Anthropic keys) are
  optional. With no secrets/bindings, Functions return safe no-op/empty/401
  responses — this is expected, not a misconfiguration. No secrets are needed to
  build, test, or serve the site.
- **`wrangler pages dev` writes a local `.wrangler/` cache dir** in the repo root;
  it is a runtime artifact and should not be committed.
