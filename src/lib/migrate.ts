import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { config } from './config';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

/**
 * Run pending database migrations.
 * Uses content-hash tracking for idempotency.
 */
export async function runMigrations(): Promise<void> {
  const dbPath = config.database.path;
  const dir = dirname(dbPath);

  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  // Create migrations tracking table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER
    );
  `);

  const appliedHashes = new Set(
    sqlite.prepare('SELECT hash FROM __drizzle_migrations').all().map((r: any) => r.hash)
  );

  if (!existsSync(MIGRATIONS_DIR)) {
    sqlite.close();
    return;
  }

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = join(MIGRATIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');

    if (appliedHashes.has(hash)) {
      continue;
    }

    console.log(`Applying migration: ${file}`);
    sqlite.exec(content);
    sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(hash, Date.now());
  }

  sqlite.close();
}