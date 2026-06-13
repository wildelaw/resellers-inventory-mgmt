import Database from 'better-sqlite3';
import { config } from './config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export function runMigrations() {
  const dbPath = config.database.path;
  const sqlite = new Database(dbPath);
  
  sqlite.pragma('journal_mode = WAL');
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  const migrationsDir = join(process.cwd(), 'drizzle');
  
  try {
    const entries = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of entries) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');
      const hash = createHash(sql);
      
      const existing = sqlite.prepare('SELECT hash FROM _migrations WHERE name = ?').get(file) as { hash: string } | undefined;
      
      if (existing) {
        if (existing.hash !== hash) {
          console.error(`Migration ${file} has been modified since it was applied`);
          process.exit(1);
        }
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO _migrations (name, hash) VALUES (?, ?)').run(file, hash);
    }
    
    console.log('All migrations applied');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

function createHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}