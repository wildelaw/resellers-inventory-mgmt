// Migration runner for container entrypoint
const { runMigrations } = require('../src/lib/migrate.ts');

runMigrations()
  .then(() => {
    console.log('Migrations complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });