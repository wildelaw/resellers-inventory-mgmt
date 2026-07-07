import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';
import { config } from './config';

type DrizzleDB = BetterSQLite3Database<typeof schema>;

let _db: DrizzleDB | null = null;
let _sqlite: Database.Database | null = null;

function getDb(): DrizzleDB {
  if (_db) return _db;

  const dbPath = config.database.path;
  const dir = dirname(dbPath);

  // Create directory if needed (especially for /data/ paths in production)
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // Directory might already exist or be read-only
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

// Proxy pattern: allows `import { db } from './db'` at build time
// without actually opening a database connection until first access.
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    const actualDb = getDb();
    // Return the property from the actual database object
    // This handles both methods (query, insert, update, delete, etc.)
    // and the schema reference
    const value = (actualDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(actualDb);
    }
    return value;
  },
});

// For testing: allows resetting the connection
export function resetDbConnection() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
  }
  _db = null;
}

// For testing: allows setting a custom database instance
export function setDbInstance(instance: DrizzleDB) {
  _db = instance;
}

export type { DrizzleDB };