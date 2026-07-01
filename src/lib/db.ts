import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { getDbPath } from './config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleInstance | null = null;

function getDb(): DrizzleInstance {
  if (_db) return _db;

  const dbPath = getDbPath();
  
  // Ensure directory exists for production paths
  if (dbPath.startsWith('/data/')) {
    mkdirSync('/data', { recursive: true });
  } else {
    // For development, ensure the directory exists
    const dir = dirname(dbPath);
    if (dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);
  
  // Configure SQLite for optimal performance
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 32000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('foreign_keys = ON');

  _db = drizzle(sqlite, { schema });
  return _db;
}

// Proxy pattern for lazy initialization
// This allows the module to be imported during build without requiring a database
export const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const actualDb = getDb();
    const value = actualDb[prop as keyof DrizzleInstance];
    
    // Bind methods to the actual db instance
    if (typeof value === 'function') {
      return value.bind(actualDb);
    }
    
    return value;
  },
});

// Export for testing purposes
export function resetDb() {
  _db = null;
}
