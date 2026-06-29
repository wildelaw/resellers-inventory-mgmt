import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';

type DrizzleDB = BetterSQLite3Database<typeof schema>;

let _sqlite: Database.Database | null = null;
let _db: DrizzleDB | null = null;

function getDbPath(): string {
  // Read dynamically so tests can override DATABASE_PATH per-suite.
  if (process.env.NODE_ENV === 'production') return '/data/sqlite.db';
  return process.env.DATABASE_PATH || 'sqlite.db';
}

function getDb(): DrizzleDB {
  if (_db && _sqlite) return _db;
  const dbPath = getDbPath();
  // Ensure parent directory exists (esp. for /data in production)
  const parent = dirname(dbPath);
  try {
    mkdirSync(parent, { recursive: true });
  } catch {
    // ignore — may already exist or be read-only in build
  }
  const sqlite = new Database(dbPath);
  // PRAGMA configuration for performance
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 32000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('foreign_keys = ON');
  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}

// Lazy Proxy: allows build/runtime to import `db` without touching the
// actual SQLite file until the first property access.
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    const actual = getDb();
    const value = Reflect.get(actual, prop as keyof DrizzleDB);
    return typeof value === 'function' ? value.bind(actual) : value;
  },
}) as DrizzleDB;

// Explicitly initialize the database connection (used by migrations).
export function initDb(): void {
  getDb();
}

// Exposed for testing / teardown
export function _getRawConnection(): Database.Database | null {
  return _sqlite;
}

export function _resetDbConnection(): void {
  if (_sqlite) {
    try { _sqlite.close(); } catch { /* ignore */ }
  }
  _sqlite = null;
  _db = null;
}