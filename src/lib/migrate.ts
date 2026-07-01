import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { getRawDb } from './db';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

interface MigrationFile {
  tag: string;
  filename: string;
  content: string;
  hash: string;
}

function listMigrationFiles(): MigrationFile[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((filename) => {
    const content = readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');
    return { tag: filename, filename, content, hash };
  });
}

/**
 * In-app migration runner. Idempotent — tracks applied migrations by tag + content hash.
 */
export async function runMigrations(): Promise<void> {
  const sqlite = getRawDb();

  // Create migrations tracking table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = sqlite.prepare('SELECT tag, hash FROM _migrations').all() as { tag: string; hash: string }[];
  const appliedTags = new Set(applied.map((a) => a.tag));

  const migrations = listMigrationFiles();
  for (const migration of migrations) {
    if (appliedTags.has(migration.tag)) continue;

    console.log(`Applying migration: ${migration.tag}`);
    sqlite.exec(migration.content);
    sqlite.prepare(
      'INSERT INTO _migrations (tag, hash, applied_at) VALUES (?, ?, ?)',
    ).run(migration.tag, migration.hash, Math.floor(Date.now() / 1000));
  }
}