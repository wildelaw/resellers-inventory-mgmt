import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/schema";

let counter = 0;

export function createTestDb(): { db: ReturnType<typeof drizzle<typeof schema>>; sqlite: Database.Database; path: string } {
  const path = `:memory:`;
  const sqlite = new Database(path);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  counter++;
  return { db, sqlite, path };
}

export function cleanupTestDb(_path: string) {
  // in-memory DBs are cleaned up automatically
}
