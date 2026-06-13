// Migration runner for container entrypoint
const { runMigrations } = require('../src/lib/migrate');
console.log('Starting migration runner...');
runMigrations();
console.log('Migrations complete.');