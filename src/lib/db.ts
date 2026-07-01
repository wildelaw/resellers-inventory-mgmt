import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';
import { config } from './config';

type DrizzleInstance = BetterSQLite3Database<typeof schema>;

let _db: DrizzleInstance | null = null;
let _sqlite: Database.Database | null = null;

function getDb(): DrizzleInstance {
  if (_db) return _db;

  const dbPath = config.database.path;
  const dir = dirname(dbPath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // directory may already exist
  }

  _sqlite = new Database(dbPath);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('synchronous = NORMAL');
  _sqlite.pragma('cache_size = 32000');
  _sqlite.pragma('temp_store = MEMORY');
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });
  return _db;
}

/**
 * Lazy database connection via Proxy pattern.
 * Allows the app to build/import modules without requiring a database file.
 */
export const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const actualDb = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (actualDb as any)[prop];
  },
}) as DrizzleInstance;

/**
 * Get the raw better-sqlite3 instance (for transactions / pragma).
 */
export function getRawDb(): Database.Database {
  if (!_sqlite) getDb();
  return _sqlite!;
}

/**
 * Close the database connection (used in tests / shutdown).
 */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}