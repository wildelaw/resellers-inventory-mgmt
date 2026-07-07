import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSqlite } from './db';

interface MigrationRow {
  id: number;
  tag: string;
  hash: string;
  applied_at: number;
}

/**
 * In-app migration runner.
 *
 * Reads .sql files from the `drizzle/` directory (skipping `meta/`), computes a
 * content hash, and applies migrations idempotently. Already-applied migrations
 * (matching tag + hash) are skipped. Each migration runs inside a transaction.
 */
export async function runMigrations(migrationsDir: string = join(process.cwd(), 'drizzle')): Promise<{ applied: number; skipped: number }> {
  const sqlite = getSqlite();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  let files: string[];
  try {
    files = (await readdir(migrationsDir)).filter(
      (f) => f.endsWith('.sql') && !f.startsWith('meta'),
    );
    files.sort();
  } catch {
    // No migrations directory — nothing to do.
    return { applied: 0, skipped: 0 };
  }

  const appliedRows = sqlite.prepare('SELECT tag, hash FROM _migrations').all() as { tag: string; hash: string }[];
  const appliedMap = new Map(appliedRows.map((r) => [r.tag, r.hash]));

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const content = await readFile(filePath, 'utf-8');
    const hash = await sha256(content);
    const tag = file;

    const existingHash = appliedMap.get(tag);
    if (existingHash === hash) {
      skipped++;
      continue;
    }

    const txn = sqlite.transaction(() => {
      sqlite.exec(content);
      sqlite
        .prepare('INSERT INTO _migrations (tag, hash, applied_at) VALUES (?, ?, unixepoch())')
        .run(tag, hash);
    });
    txn();
    applied++;
  }

  return { applied, skipped };
}

async function sha256(input: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(input).digest('hex');
}
