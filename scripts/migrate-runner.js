// Standalone migration runner for the container entrypoint.
// Runs before `node server.js` so the schema is ready when the app starts.
// Idempotent: already-applied migrations (tracked by content hash in
// __drizzle_migrations) are skipped.
const path = require('path');

async function main() {
  const dbPath = process.env.DATABASE_PATH || '/data/sqlite.db';
  const migrationsFolder = path.join(__dirname, '..', 'drizzle');

  // Standalone builds trace these packages into .next/standalone/node_modules
  const candidates = [
    path.join(process.cwd(), 'node_modules'),
    path.join(__dirname, '..', 'node_modules'),
    path.join(__dirname, '..', '.next', 'standalone', 'node_modules'),
  ];

  let Database, drizzle, migrate;
  let lastError;
  for (const dir of candidates) {
    try {
      Database = require(path.join(dir, 'better-sqlite3'));
      const orm = require(path.join(dir, 'drizzle-orm', 'better-sqlite3'));
      drizzle = orm.drizzle;
      migrate = require(path.join(dir, 'drizzle-orm', 'better-sqlite3', 'migrator')).migrate;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!Database) {
    console.error('Migration error: could not load better-sqlite3/drizzle-orm:', lastError);
    process.exit(1);
  }

  const fs = require('fs');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  try {
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully.');
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});