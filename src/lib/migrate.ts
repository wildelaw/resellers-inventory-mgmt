import Database from 'better-sqlite3';
import { config } from './config';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface MigrationRecord {
  id: number;
  tag: string;
  content_hash: string;
  applied_at: number;
}

/**
 * In-app migration runner.
 * Uses content-hash + tag tracking for idempotency.
 * Already-applied migrations are skipped.
 */
export async function runMigrations(): Promise<void> {
  const dbPath = config.database.path;
  if (dbPath.startsWith('/data/')) {
    mkdirSync('/data', { recursive: true });
  }

  const sqlite = new Database(dbPath);
  
  try {
    // Enable WAL mode and foreign keys
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    // Create migration tracking table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL UNIQUE,
        content_hash TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // Get list of applied migrations
    const applied = sqlite.prepare('SELECT tag, content_hash FROM _migrations').all() as MigrationRecord[];
    const appliedMap = new Map(applied.map(m => [m.tag, m.content_hash]));

    // Find migration files
    const migrationDir = join(process.cwd(), 'drizzle');
    if (!existsSync(migrationDir)) {
      console.log('No migrations directory found, skipping migrations.');
      sqlite.close();
      return;
    }

    const { readdirSync } = await import('fs');
    const { join: pathJoin } = await import('path');

    const files = readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const tag = file.replace('.sql', '');
      const filePath = pathJoin(migrationDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const contentHash = createHash('sha256').update(content).digest('hex');

      // Skip if already applied with same content
      if (appliedMap.has(tag)) {
        if (appliedMap.get(tag) === contentHash) {
          console.log(`Migration ${tag} already applied, skipping.`);
          continue;
        }
        // Content changed since last application — log warning
        console.warn(`Migration ${tag} content has changed since last application. Skipping to prevent data loss.`);
        continue;
      }

      console.log(`Applying migration: ${tag}`);
      
      // Apply migration in a transaction
      const transaction = sqlite.transaction(() => {
        // Split on semicolons and execute each statement
        const statements = content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          sqlite.exec(statement);
        }

        // Record the migration
        sqlite.prepare(
          'INSERT INTO _migrations (tag, content_hash, applied_at) VALUES (?, ?, ?)'
        ).run(tag, contentHash, Math.floor(Date.now() / 1000));
      });

      transaction();
      console.log(`Migration ${tag} applied successfully.`);
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().then(() => {
    console.log('Migrations complete.');
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}