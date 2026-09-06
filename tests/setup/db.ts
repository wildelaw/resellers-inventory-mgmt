import path from 'path';
import os from 'os';
import { rmSync } from 'fs';
import { afterAll } from 'vitest';
import { cleanupTestDbs } from './global-teardown';

const createdDbs: string[] = [];

/**
 * Create an isolated, timestamped SQLite database for this test file, run the
 * real migrations against it, and return a lazily-initialized drizzle instance.
 * Vitest re-evaluates modules per test file, so setting DATABASE_PATH here
 * before the dynamic import gives each suite its own database.
 */
export async function setupTestDb() {
  const dbPath = path.join(
    os.tmpdir(),
    `rim-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  );
  createdDbs.push(dbPath);

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;

  // Vitest's single fork shares module state across test files, so the config
  // module may already be cached with a previous suite's path — patch it and
  // drop the cached connection before opening the new database.
  const { config } = await import('@/lib/config');
  (config.database as { path: string }).path = dbPath;

  const { runMigrations } = await import('@/lib/migrate');
  runMigrations({ dbPath });

  const { db, __resetDbForTests } = await import('@/lib/db');
  __resetDbForTests();
  return { db, dbPath };
}

function removeDbFiles(dbPath: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      rmSync(dbPath + suffix, { force: true });
    } catch {
      // best effort
    }
  }
}

afterAll(() => {
  for (const dbPath of createdDbs) removeDbFiles(dbPath);
  // Sweep any leftovers from other suites or crashed runs
  cleanupTestDbs();
});