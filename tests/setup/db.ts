import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import * as schema from '../../src/lib/schema';

let testDbCounter = 0;

export function createTestDb(): BetterSQLite3Database<typeof schema> {
  const dbName = `test-${Date.now()}-${testDbCounter++}.sqlite`;
  const dbPath = join(process.cwd(), dbName);

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  // Run migrations
  const migrationsDir = join(process.cwd(), 'drizzle');
  if (existsSync(migrationsDir)) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at INTEGER
      );
    `);

    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const content = readFileSync(join(migrationsDir, file), 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      const applied = sqlite.prepare('SELECT hash FROM __drizzle_migrations WHERE hash = ?').get(hash);
      if (!applied) {
        sqlite.exec(content);
        sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(hash, Date.now());
      }
    }
  }

  const db = drizzle(sqlite, { schema });

  // Attach the raw sqlite instance for cleanup
  (db as any).$raw = sqlite;
  (db as any).$path = dbPath;

  return db;
}

export function cleanupTestDb(db: BetterSQLite3Database<typeof schema>) {
  const raw = (db as any).$raw as Database.Database;
  const path = (db as any).$path as string;

  if (raw) raw.close();

  // Delete the database files
  try { unlinkSync(path); } catch {}
  try { unlinkSync(path + '-wal'); } catch {}
  try { unlinkSync(path + '-shm'); } catch {}
  try { unlinkSync(path + '-journal'); } catch {}
}