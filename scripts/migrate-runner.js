#!/usr/bin/env node
// CLI entry: applies pending migrations from drizzle/*.sql.
const { runMigrations } = require('./migrate.js');

runMigrations().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});