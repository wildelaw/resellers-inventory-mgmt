import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config';
import * as schema from './schema';

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleInstance | null = null;
let _sqlite: Database.Database | null = null;

function getDb(): DrizzleInstance {
  if (_db) return _db;
  const dbPath = config.database.path;
  // Ensure parent directory exists (especially for /data paths in production).
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch {
    // ignore — directory may already exist or path may be relative in dev
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 32000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('foreign_keys = ON');
  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}

/** Lazy database accessor. The underlying SQLite connection is opened on first use. */
export const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const actualDb = getDb();
    // @ts-expect-error - dynamic property access on drizzle instance
    return actualDb[prop];
  },
}) as DrizzleInstance;

/** Get the raw better-sqlite3 instance (used by migration runner). */
export function getSqlite(): Database.Database {
  if (!_sqlite) getDb();
  return _sqlite!;
}

/** Close the database connection (used in tests). */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
