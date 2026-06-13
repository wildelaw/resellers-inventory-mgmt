import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import * as schema from './schema';
import { config } from './config';

type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

function getDb(): Database {
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
  
  _db = drizzle(sqlite, { schema });
  return _db;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const actualDb = getDb();
    return actualDb[prop as keyof Database];
  },
});

export function getDbInstance() {
  return getDb();
}