-- Studio CMS — blog posts (and, later, works) managed from the dashboard.
-- Reuses the SAME Cloudflare D1 database as the analytics (binding: DB).
-- Run once: D1 → your database → Console, paste this and Run; or:
--   wrangler d1 execute <db-name> --remote --file=content-schema.sql

CREATE TABLE IF NOT EXISTS posts (
  id      TEXT PRIMARY KEY,        -- short slug, e.g. "c01" or auto "c1a2b3"
  type    TEXT    DEFAULT 'post',  -- 'post' (blog) — 'work' reserved for later
  num     TEXT    DEFAULT '',      -- display number, e.g. "17"
  tag     TEXT    DEFAULT '',      -- category label, e.g. "Editorial"
  date    TEXT    DEFAULT '',      -- human date, e.g. "Jun 2026"
  readmin INTEGER DEFAULT 4,       -- minutes to read
  accent  TEXT    DEFAULT '#1a2740', -- preview background colour
  img     TEXT    DEFAULT '',      -- full image URL (CDN/GitHub/any)
  title   TEXT    DEFAULT '',
  sub     TEXT    DEFAULT '',      -- one-line subtitle
  body    TEXT    DEFAULT '[]',    -- JSON array of paragraphs
  ts      INTEGER NOT NULL         -- created / updated, unix ms
);
CREATE INDEX IF NOT EXISTS idx_posts_ts ON posts(ts);
