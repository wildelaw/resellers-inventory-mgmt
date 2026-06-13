import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from './config';

interface MigrationRecord {
  id: number;
  tag: string;
  content_hash: string;
  applied_at: string;
}

/**
 * In-app migration runner.
 * Applies pending Drizzle migrations with content-hash + tag tracking.
 * Idempotent — already-applied migrations are skipped.
 */
export function runMigrations(): void {
  const dbPath = config.database.path;
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create migrations tracking table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      content_hash TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = join(process.cwd(), 'drizzle');
  let migrationFiles: string[];

  try {
    migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    // No migrations directory yet
    sqlite.close();
    return;
  }

  if (migrationFiles.length === 0) {
    sqlite.close();
    return;
  }

  const appliedMigrations = sqlite
    .prepare('SELECT tag, content_hash FROM __drizzle_migrations')
    .all() as MigrationRecord[];

  const appliedTags = new Set(appliedMigrations.map((m) => m.tag));

  for (const file of migrationFiles) {
    const tag = file.replace('.sql', '');

    if (appliedTags.has(tag)) {
      console.log(`Migration ${tag} already applied, skipping`);
      continue;
    }

    const sqlPath = join(migrationsDir, file);
    let sql: string;
    try {
      sql = readFileSync(sqlPath, 'utf-8');
    } catch {
      console.error(`Failed to read migration file: ${file}`);
      continue;
    }

    // Simple content hash
    const contentHash = Buffer.from(sql).toString('base64').slice(0, 16);

    console.log(`Applying migration: ${tag}`);
    const transaction = sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite
        .prepare('INSERT INTO __drizzle_migrations (tag, content_hash) VALUES (?, ?)')
        .run(tag, contentHash);
    });
    transaction();

    console.log(`Migration ${tag} applied successfully`);
  }

  sqlite.close();
}

// Run migrations if this script is executed directly
if (require.main === module || process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
}