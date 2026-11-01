-- Run this once in your Cloudflare D1 database (D1 → your database → Console),
-- or with: wrangler d1 execute <db-name> --remote --file=analytics-schema.sql
CREATE TABLE IF NOT EXISTS hits (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,        -- unix milliseconds
  path    TEXT    NOT NULL,        -- page path, e.g. /design/logo
  ref     TEXT    DEFAULT '',      -- referrer hostname only (no full URL)
  country TEXT    DEFAULT '',      -- 2-letter country code
  device  TEXT    DEFAULT '',      -- mobile / tablet / desktop
  lang    TEXT    DEFAULT '',      -- site language at the time
  vid     TEXT    DEFAULT ''       -- keyed pseudonymous visitor hash; raw IP/UA are never stored
);
CREATE INDEX IF NOT EXISTS idx_hits_ts   ON hits(ts);
CREATE INDEX IF NOT EXISTS idx_hits_path ON hits(path);
