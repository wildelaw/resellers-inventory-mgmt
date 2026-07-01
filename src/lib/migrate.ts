import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { getDbPath } from './config';
import { createHash } from 'crypto';

interface Migration {
  name: string;
  sql: string;
  hash: string;
}

/**
 * Get all migration files from the drizzle directory
 */
function getMigrationFiles(): Migration[] {
  const migrationsDir = join(process.cwd(), 'drizzle');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    return files.map(file => {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      const hash = createHash('sha256').update(sql).digest('hex');
      
      return {
        name: file,
        sql,
        hash,
      };
    });
  } catch (error) {
    console.error('Error reading migration files:', error);
    return [];
  }
}

/**
 * Create the migrations tracking table if it doesn't exist
 */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

/**
 * Get list of applied migrations
 */
function getAppliedMigrations(db: Database.Database): Set<string> {
  const rows = db.prepare('SELECT name FROM __drizzle_migrations').all() as { name: string }[];
  return new Set(rows.map(r => r.name));
}

/**
 * Check if a migration has been applied with the same hash
 */
function isMigrationApplied(db: Database.Database, name: string, hash: string): boolean {
  const row = db.prepare('SELECT hash FROM __drizzle_migrations WHERE name = ?').get(name) as { hash: string } | undefined;
  return row?.hash === hash;
}

/**
 * Apply a single migration
 */
function applyMigration(db: Database.Database, migration: Migration): void {
  console.log(`Applying migration: ${migration.name}`);
  
  try {
    // Execute the migration SQL
    db.exec(migration.sql);
    
    // Record the migration
    db.prepare(`
      INSERT INTO __drizzle_migrations (name, hash, applied_at)
      VALUES (?, ?, ?)
    `).run(migration.name, migration.hash, Date.now());
    
    console.log(`✓ Applied migration: ${migration.name}`);
  } catch (error) {
    console.error(`✗ Failed to apply migration ${migration.name}:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Ensure migrations table exists
    ensureMigrationsTable(db);
    
    // Get all migrations
    const migrations = getMigrationFiles();
    
    if (migrations.length === 0) {
      console.log('No migrations found');
      return;
    }
    
    // Get applied migrations
    const applied = getAppliedMigrations(db);
    
    // Filter pending migrations
    const pending = migrations.filter(m => {
      if (applied.has(m.name)) {
        // Check if hash matches
        if (!isMigrationApplied(db, m.name, m.hash)) {
          console.warn(`Warning: Migration ${m.name} has been modified since it was applied`);
        }
        return false;
      }
      return true;
    });
    
    if (pending.length === 0) {
      console.log('All migrations are up to date');
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s)`);
    
    // Apply each pending migration in a transaction
    for (const migration of pending) {
      const transaction = db.transaction(() => {
        applyMigration(db, migration);
      });
      
      transaction();
    }
    
    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  total: number;
  applied: number;
  pending: number;
}> {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  
  try {
    ensureMigrationsTable(db);
    
    const migrations = getMigrationFiles();
    const applied = getAppliedMigrations(db);
    
    return {
      total: migrations.length,
      applied: applied.size,
      pending: migrations.length - applied.size,
    };
  } finally {
    db.close();
  }
}
