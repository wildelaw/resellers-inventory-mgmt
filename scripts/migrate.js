// Migration runner module — exports runMigrations(); does not execute on import.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
}

function resolveDbPath() {
  return (
    process.env.DATABASE_PATH ||
    (process.env.NODE_ENV === 'production' ? '/data/sqlite.db' : './sqlite.db')
  );
}

function runMigrations({ dbPath, migrationsDir } = {}) {
  const resolvedDb = dbPath || resolveDbPath();
  const resolvedDir = migrationsDir || path.join(__dirname, '..', 'drizzle');
  fs.mkdirSync(path.dirname(resolvedDb), { recursive: true });

  const db = new Database(resolvedDb);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const files = fs.existsSync(resolvedDir)
    ? fs.readdirSync(resolvedDir).filter((f) => f.endsWith('.sql')).sort()
    : [];

  const applied = new Set(
    db.prepare('SELECT tag FROM __drizzle_migrations').all().map((r) => r.tag)
  );

  const stmtInsert = db.prepare(
    'INSERT INTO __drizzle_migrations (tag, hash, created_at) VALUES (?, ?, ?)'
  );
  const now = () => Math.floor(Date.now() / 1000);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(resolvedDir, file), 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    const tx = db.transaction(() => {
      db.exec(sql);
      stmtInsert.run(file, hash, now());
    });
    tx();
    count++;
    console.log(`[migrate] Applied ${file}`);
  }

  if (count === 0) console.log('[migrate] No pending migrations.');
  db.close();
  return count;
}

module.exports = { runMigrations, resolveDbPath };