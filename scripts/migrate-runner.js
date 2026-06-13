// Migration runner script for entrypoint
const { runMigrations } = require('../src/lib/migrate');

runMigrations()
  .then(() => {
    console.log('Migrations complete.');
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });