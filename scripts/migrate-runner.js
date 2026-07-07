// Migration runner for container entrypoint
const { runMigrations } = require('./migrate.js');

(async () => {
  try {
    await runMigrations();
    console.log('Migrations complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();