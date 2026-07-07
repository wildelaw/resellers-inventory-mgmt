import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from '@/lib/schema';
import { runMigrations } from '@/lib/migrate';

let testDbPath: string | null = null;
let testDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let testSqlite: Database.Database | null = null;

export function createTestDb(dbPath?: string): typeof schema {
  const path = dbPath || join(process.cwd(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  mkdirSync(join(path, '..'), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  testSqlite = sqlite;
  testDbInstance = drizzle(sqlite, { schema });
  testDbPath = path;

  // Apply migration SQL directly.
  const { readFileSync } = require('node:fs');
  const migrationSql = readFileSync(join(process.cwd(), 'drizzle/0000_initial.sql'), 'utf-8');
  sqlite.exec(migrationSql);

  return testDbInstance;
}

export function getTestDb() {
  if (!testDbInstance) throw new Error('Test DB not created. Call createTestDb() first.');
  return testDbInstance;
}

export function getTestSqlite() {
  if (!testSqlite) throw new Error('Test DB not created. Call createTestDb() first.');
  return testSqlite;
}

export function cleanupTestDb() {
  if (testSqlite) {
    testSqlite.close();
    testSqlite = null;
    testDbInstance = null;
  }
  if (testDbPath) {
    try { rmSync(testDbPath, { force: true }); } catch {}
    try { rmSync(`${testDbPath}-wal`, { force: true }); } catch {}
    try { rmSync(`${testDbPath}-shm`, { force: true }); } catch {}
    try { rmSync(`${testDbPath}-journal`, { force: true }); } catch {}
    testDbPath = null;
  }
}
