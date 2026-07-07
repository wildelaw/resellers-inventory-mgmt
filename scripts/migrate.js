// Migration runner for container entrypoint.
const { runMigrations } = require('../src/lib/migrate');

runMigrations()
  .then((result) => {
    console.log(`Migrations: ${result.applied} applied, ${result.skipped} skipped`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
