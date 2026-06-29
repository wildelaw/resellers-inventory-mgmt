/**
 * Lazy SQLite connection via Proxy pattern.
 *
 * The database is not opened until the first query, which lets the app build
 * and boot without a database present (migrations run later via migrate.ts).
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { schema } from './schema';
import { config } from './config';

type DB = BetterSQLite3Database<typeof schema>;

let _db: DB | null = null;
let _sqlite: Database.Database | null = null;

function getDbPath(): string {
  return config.database.path;
}

function getDb(): DB {
  if (_db) return _db;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

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

/** Expose the underlying better-sqlite3 instance (for transactions/pragmas). */
export function getRawDb(): Database.Database {
  void getDb();
  return _sqlite as Database.Database;
}

/** Reset the cached connection (used by tests to point at a fresh database). */
export function resetDb(newPath?: string): void {
  if (_sqlite) {
    try { _sqlite.close(); } catch { /* ignore */ }
  }
  _sqlite = null;
  _db = null;
  if (newPath) {
    // Allow tests to override the path at runtime.
    (config.database as { path: string }).path = newPath;
  }
}

// The `db` proxy lazily forwards every property access to the real connection.
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const actual = getDb();
    const value = Reflect.get(actual, prop as keyof DB, actual);
    if (typeof value === 'function') {
      return value.bind(actual);
    }
    return value;
  },
}) as DB;

export type { DB };