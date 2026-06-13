const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? '/data/sqlite.db' : 'sqlite.db');
const migrationsDir = path.join(process.cwd(), 'drizzle');

console.log('Database path:', dbPath);
console.log('Migrations dir:', migrationsDir);

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);

try {
  const entries = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = sqlite.prepare('SELECT hash FROM __drizzle_migrations').all();
  const appliedHashes = new Set(applied.map(r => r.hash));

  for (const file of entries) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');

    if (appliedHashes.has(hash)) continue;

    console.log('Applying migration:', file);
    sqlite.exec(sql);
    sqlite.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(hash);
  }

  console.log('All migrations applied');
} catch (error) {
  console.error('Migration error:', error);
  process.exit(1);
} finally {
  sqlite.close();
}