import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';
import { config } from './config';
import * as schema from './schema';

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleInstance | null = null;

function getDb(): DrizzleInstance {
  if (_db) return _db;

  const dbPath = config.database.path;
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.') {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 32000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('foreign_keys = ON');

  _db = drizzle(sqlite, { schema });
  return _db;
}

/**
 * Lazy database connection via Proxy pattern — no connection is opened until
 * the first property access, which allows `next build` to run without a DB.
 */
export const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const actualDb = getDb();
    const value = Reflect.get(actualDb as unknown as object, prop);
    return typeof value === 'function' ? value.bind(actualDb) : value;
  },
});

/**
 * TEST-ONLY: drop the cached connection so a changed DATABASE_PATH (used by
 * the per-suite test databases in tests/setup/db.ts) takes effect on the
 * next access. Never call this in application code.
 */
export function __resetDbForTests(): void {
  _db = null;
}