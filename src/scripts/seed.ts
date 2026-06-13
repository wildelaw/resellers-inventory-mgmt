import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { config } from '../lib/config';

async function seed() {
  const dbPath = config.database.path;
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Run migrations
  const { runMigrations } = await import('../lib/migrate');
  // Re-open with our db connection for migrations
  const migrationDb = new Database(dbPath);
  migrationDb.pragma('journal_mode = WAL');
  migrationDb.pragma('foreign_keys = ON');

  try {
    const fs = await import('fs');
    const path = await import('path');
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    // Create migrations tracking table
    migrationDb.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL UNIQUE,
        content_hash TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const applied = migrationDb.prepare('SELECT tag FROM __drizzle_migrations').all() as { tag: string }[];
    const appliedTags = new Set(applied.map(a => a.tag));

    for (const file of files) {
      const tag = file.replace('.sql', '');
      if (appliedTags.has(tag)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

      const transaction = migrationDb.transaction(() => {
        for (const stmt of statements) {
          migrationDb.exec(stmt);
        }
        migrationDb.prepare('INSERT INTO __drizzle_migrations (tag, content_hash) VALUES (?, ?)').run(tag, 'seed');
      });
      transaction();
      console.log(`Applied migration: ${tag}`);
    }
  } catch (e) {
    console.log('No migrations to apply or migrations directory not found');
  }

  migrationDb.close();

  // Check if admin already exists
  const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.role, 'admin')).limit(1);
  if (existingAdmin.length > 0) {
    console.log('Admin user already exists. Skipping seed.');
    sqlite.close();
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('AdminP@ss1', 10);
  await db.insert(schema.users).values({
    email: 'admin@resalemanager.com',
    passwordHash,
    name: 'Admin User',
    role: 'admin',
    canViewAll: 1,
    isActive: 1,
    passwordChangedAt: 0,
  });

  // Create app config
  await db.insert(schema.appConfig).values({
    id: 1,
    companyName: 'Resale Manager',
    companyTagline: '',
    salesTaxRate: 0.0825,
    setupComplete: 1,
    updatedAt: Math.floor(Date.now() / 1000),
  });

  console.log('Seed completed: Admin user and app config created.');
  console.log('Admin email: admin@resalemanager.com');
  console.log('Admin password: AdminP@ss1');

  sqlite.close();
}

seed().catch(console.error);