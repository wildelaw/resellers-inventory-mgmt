#!/usr/bin/env node
// Container startup migration runner — applies pending Drizzle migrations.
const { runMigrations } = require('../src/lib/migrate');
const { initDb } = require('../src/lib/db');

try {
  initDb();
  runMigrations();
  console.log('[migrate] Migrations applied successfully');
  process.exit(0);
} catch (err) {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
}