/* Additive setup shared by first-party hit collection and private reporting. */
const schemas = new WeakMap();

export async function ensureAnalyticsStore(DB) {
  let pending = schemas.get(DB);
  if (!pending) {
    pending = (async () => {
      await DB.prepare(`CREATE TABLE IF NOT EXISTS hits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
        path TEXT NOT NULL, ref TEXT DEFAULT '', country TEXT DEFAULT '',
        device TEXT DEFAULT '', lang TEXT DEFAULT '', vid TEXT DEFAULT ''
      )`).run();
      // Older visit tables predate pseudonymous unique-visitor counts. Keep
      // those visits while adding the column needed by current reporting.
      const columns = (await DB.prepare('PRAGMA table_info(hits)').all()).results || [];
      if (!columns.some(column => column.name === 'vid')) {
        try { await DB.prepare("ALTER TABLE hits ADD COLUMN vid TEXT DEFAULT ''").run(); }
        catch (error) {
          const refreshed = (await DB.prepare('PRAGMA table_info(hits)').all()).results || [];
          if (!refreshed.some(column => column.name === 'vid')) throw error;
        }
      }
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_hits_ts ON hits(ts)').run();
      await DB.prepare('CREATE INDEX IF NOT EXISTS idx_hits_path ON hits(path)').run();
    })();
    schemas.set(DB, pending);
  }
  try { await pending; } catch (error) { schemas.delete(DB); throw error; }
}
