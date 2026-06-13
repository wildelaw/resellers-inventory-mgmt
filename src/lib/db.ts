import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { config } from './config';
import { mkdirSync } from 'fs';

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  const dbPath = config.database.path;
  if (dbPath.startsWith('/data/')) {
    mkdirSync('/data', { recursive: true });
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

// Lazy initialization via Proxy pattern — allows build without DB
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const actualDb = getDb();
    return (actualDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Export for test access to raw connection
export function getRawDb() {
  return getDb();
}