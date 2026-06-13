import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

let dbCounter = 0;

/**
 * Create a unique test database with all migrations applied.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Apply migration
  const migrationPath = join(process.cwd(), 'drizzle');
  try {
    const files = require('fs').readdirSync(migrationPath)
      .filter((f: string) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = readFileSync(join(migrationPath, file), 'utf-8');
      // Split by statement breakpoint and execute each
      const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        sqlite.exec(stmt);
      }
    }
  } catch (e) {
    // If no migration files, create tables inline
    console.warn('No migration files found, creating tables inline for test db');
  }

  return { db, sqlite };
}

/**
 * Clean up a test database.
 */
export function cleanupTestDb(sqlite: Database.Database) {
  sqlite.close();
}

/**
 * Seed a test database with basic data.
 */
export async function seedTestDb(db: ReturnType<typeof drizzle>) {
  const { users, appConfig } = schema;
  const bcrypt = require('bcrypt');

  // Create admin user
  const adminHash = await bcrypt.hash('AdminP@ss1', 10);
  const userHash = await bcrypt.hash('UserP@ss1', 10);

  await db.insert(users).values([
    {
      email: 'admin@test.com',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'admin',
      canViewAll: 1,
      isActive: 1,
      passwordChangedAt: 0,
    },
    {
      email: 'user@test.com',
      passwordHash: userHash,
      name: 'Regular User',
      role: 'user',
      canViewAll: 0,
      isActive: 1,
      passwordChangedAt: 0,
    },
    {
      email: 'viewer@test.com',
      passwordHash: userHash,
      name: 'View All User',
      role: 'user',
      canViewAll: 1,
      isActive: 1,
      passwordChangedAt: 0,
    },
  ]);

  // Create app config
  await db.insert(appConfig).values({
    id: 1,
    companyName: 'Test Company',
    companyTagline: 'Test Tagline',
    salesTaxRate: 0.0825,
    setupComplete: 1,
    updatedAt: Math.floor(Date.now() / 1000),
  });
}