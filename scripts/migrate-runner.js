#!/usr/bin/env node
// Runs drizzle-kit migrations then starts the server (for Docker entrypoint).
const { execSync } = require('child_process');

try {
  console.log('[entrypoint] Running migrations...');
  execSync('node scripts/migrate.js', { stdio: 'inherit', cwd: process.cwd() });
  console.log('[entrypoint] Migrations complete.');
} catch (err) {
  console.error('[entrypoint] Migration error:', err.message);
  process.exit(1);
}
