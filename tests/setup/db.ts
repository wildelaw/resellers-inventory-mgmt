/**
 * Test database setup — each suite gets a unique timestamped SQLite database,
 * migrations applied, connection reset. cleanupTestDb() in afterEach.
 */
import { existsSync, rmSync } from 'node:fs';
import { resetDb } from '@/lib/db';
import { runMigrationsSync } from '@/lib/migrate';

let counter = 0;

export function createTestDb(): string {
  const path = `./sqlite.test.${process.pid}.${Date.now()}.${counter++}.db`;
  // Remove any stale file + journals.
  for (const ext of ['', '-wal', '-shm', '-journal']) {
    try { rmSync(path + ext); } catch { /* ignore */ }
  }
  // Point the lazy db connection at the fresh path and apply migrations.
  resetDb(path);
  runMigrationsSync();
  return path;
}

export function cleanupTestDb(path: string): void {
  try { resetDb(); } catch { /* ignore */ }
  for (const ext of ['', '-wal', '-shm', '-journal']) {
    try { rmSync(path + ext); } catch { /* ignore */ }
  }
}

export { runMigrationsSync };