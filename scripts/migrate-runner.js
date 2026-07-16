#!/bin/sh
set -e
node -e "
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('/data/sqlite.db');
db.pragma('journal_mode = WAL');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
const ddb = drizzle(db);
migrate(ddb, { migrationsFolder: './drizzle' });
console.log('Migrations applied.');
db.close();
"
