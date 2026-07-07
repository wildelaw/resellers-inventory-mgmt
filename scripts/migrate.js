// Migration runner module - uses better-sqlite3 directly
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'drizzle');
const DB_PATH = process.env.NODE_ENV === 'production' ? '/data/sqlite.db' : (process.env.DATABASE_PATH || path.join(__dirname, '..', 'sqlite.db'));

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER
    );
  `);
}

function getAppliedHashes(db) {
  const rows = db.prepare('SELECT hash FROM __drizzle_migrations').all();
  return new Set(rows.map(r => r.hash));
}

async function runMigrations() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  ensureMigrationsTable(db);
  const applied = getAppliedHashes(db);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found, skipping.');
    db.close();
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (applied.has(hash)) {
      continue;
    }

    console.log(`Applying migration: ${file}`);
    db.exec(content);
    db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(hash, Date.now());
  }

  db.close();
}

module.exports = { runMigrations };