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

// Use Proxy to allow lazy initialization — enables build without DB
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop: string | symbol) {
    const actualDb = getDb();
    return (actualDb as any)[prop];
  },
});

// For testing — reset the cached connection
export function resetDb() {
  _db = null;
}

// Export the getDb function for direct access when needed
export { getDb };