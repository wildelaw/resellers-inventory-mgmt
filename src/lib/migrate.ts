import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { db, initDb } from './db';

let _migrated = false;

/**
 * Run pending Drizzle migrations from the `drizzle/` folder.
 * Idempotent — safe to call multiple times; only runs once per process.
 */
export function runMigrations(migrationsFolder: string = path.resolve(process.cwd(), 'drizzle')): void {
  if (_migrated) return;
  initDb();
  drizzleMigrate(db, { migrationsFolder });
  _migrated = true;
}

/** Reset the migrated flag (test only). */
export function _resetMigrations(): void {
  _migrated = false;
}