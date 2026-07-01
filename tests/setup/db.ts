import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/schema';
import { readFileSync, readdirSync } from 'fs';

let testDbPath = '';

export function createTestDb(): { db: ReturnType<typeof drizzle>; sqlite: Database.Database; path: string } {
  const timestamp = Date.now() + Math.floor(Math.random() * 10000);
  testDbPath = join(process.cwd(), `sqlite-test-${timestamp}.db`);

  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Run migrations
  const migrationsDir = join(process.cwd(), 'drizzle');
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      sqlite.exec(sql);
    }
  }

  const db = drizzle(sqlite, { schema });
  return { db, sqlite, path: testDbPath };
}

export function cleanupTestDb(path?: string) {
  const p = path || testDbPath;
  if (p && existsSync(p)) {
    try {
      rmSync(p);
      rmSync(p + '-wal', { force: true });
      rmSync(p + '-shm', { force: true });
      rmSync(p + '-journal', { force: true });
    } catch {
      // ignore
    }
  }
}