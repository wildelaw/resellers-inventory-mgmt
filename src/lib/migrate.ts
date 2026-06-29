/**
 * In-app migration runner — applies pending drizzle/*.sql files idempotently.
 *
 * Tracks applied migrations by tag (filename) + content hash in the
 * __drizzle_migrations table. Already-applied migrations are skipped.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getRawDb } from './db';
import { config } from './config';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'drizzle');

let pending: Promise<number> | null = null;

/** Run migrations once per process (deduplicated). Returns count applied. */
export async function runMigrationsIfDue(): Promise<number> {
  if (!pending) pending = doRunMigrations().catch((e) => { pending = null; throw e; });
  return pending;
}

async function doRunMigrations(): Promise<number> {
  const sqlite = getRawDb();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const dir = config.database.path ? path.dirname(config.database.path) : '.';
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const files = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const applied = new Set(
    sqlite.prepare('SELECT tag FROM __drizzle_migrations').all().map((r) => (r as { tag: string }).tag),
  );

  const insertStmt = sqlite.prepare(
    'INSERT INTO __drizzle_migrations (tag, hash, created_at) VALUES (?, ?, ?)',
  );
  const now = () => Math.floor(Date.now() / 1000);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    const tx = sqlite.transaction(() => {
      sqlite.exec(sql);
      insertStmt.run(file, hash, now());
    });
    tx();
    count++;
    console.log(`[migrate] Applied ${file}`);
  }
  if (count === 0) console.log('[migrate] No pending migrations.');
  return count;
}

/** Synchronous variant for use in seed scripts / tests that import db directly. */
export function runMigrationsSync(): number {
  const sqlite = getRawDb();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const files = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const applied = new Set(
    sqlite.prepare('SELECT tag FROM __drizzle_migrations').all().map((r) => (r as { tag: string }).tag),
  );
  const insertStmt = sqlite.prepare(
    'INSERT INTO __drizzle_migrations (tag, hash, created_at) VALUES (?, ?, ?)',
  );
  const now = () => Math.floor(Date.now() / 1000);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    const tx = sqlite.transaction(() => {
      sqlite.exec(sql);
      insertStmt.run(file, hash, now());
    });
    tx();
    count++;
  }
  return count;
}