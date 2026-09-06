import path from 'path';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * In-app migration runner. Delegates to Drizzle's migrator, which tracks
 * applied migrations by content hash in `__drizzle_migrations` — already-
 * applied migrations are skipped, so this is idempotent and safe to call at
 * every container startup.
 */
export function runMigrations(options?: { migrationsFolder?: string; dbPath?: string }): void {
  const migrationsFolder = options?.migrationsFolder ?? path.join(process.cwd(), 'drizzle');
  const dbPath = options?.dbPath ?? process.env.DATABASE_PATH ?? './sqlite.db';

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  try {
    const db = drizzle(sqlite, { schema });
    drizzleMigrate(db, { migrationsFolder });
  } finally {
    sqlite.close();
  }
}

if (require.main === module) {
  try {
    runMigrations();
    console.log('Migrations applied successfully.');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}