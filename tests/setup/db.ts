import { mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { _resetDbConnection } from '@/lib/db';
import { runMigrations, _resetMigrations } from '@/lib/migrate';

let testCounter = 0;

export interface TestDbHandle {
  dbPath: string;
  cleanup: () => void;
}

/**
 * Create a fresh per-suite SQLite database with migrations applied.
 * Each call gets a unique timestamped file under .test-db/.
 */
export function createTestDb(): TestDbHandle {
  const stamp = `${Date.now()}-${process.pid}-${testCounter++}`;
  const dir = path.resolve(process.cwd(), '.test-db');
  mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, `test-${stamp}.db`);

  // Reset the singleton connection + migration flag so the new path takes effect
  _resetDbConnection();
  _resetMigrations();

  // Point config at our unique DB
  Reflect.set(process.env, 'DATABASE_PATH', dbPath);

  // Apply migrations
  runMigrations();

  return {
    dbPath,
    cleanup: () => {
      _resetDbConnection();
      _resetMigrations();
      // Remove the db files (best-effort)
      for (const ext of ['', '-wal', '-shm']) {
        try { rmSync(dbPath + ext, { force: true }); } catch { /* ignore */ }
      }
      // Restore default path for subsequent suites
      Reflect.set(process.env, 'DATABASE_PATH', './test.db');
    },
  };
}

export function cleanupTestDb(handle: TestDbHandle): void {
  handle.cleanup();
}