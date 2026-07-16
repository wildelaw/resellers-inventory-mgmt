import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, getRawSqlite } from "./db";

let migrated = false;

export function runMigrations(): void {
  if (migrated) return;
  try {
    migrate(db, { migrationsFolder: "./drizzle" });
    getRawSqlite().pragma("foreign_keys = ON");
    migrated = true;
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  }
}

export function resetMigrationState(): void {
  migrated = false;
}
