import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { config } from "./config";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;
let _sqlite: Database.Database | null = null;

function getDbPath(): string {
  return config.database.path;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function init(): DrizzleDB {
  const dbPath = getDbPath();
  ensureDir(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("cache_size = 32000");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("foreign_keys = ON");
  _sqlite = sqlite;
  return drizzle(sqlite, { schema });
}

function getDb(): DrizzleDB {
  if (!_db) {
    _db = init();
  }
  return _db;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop: string | symbol) {
    const actual = getDb();
    const value = (actual as unknown as Record<string | symbol, unknown>)[
      prop as string
    ];
    return typeof value === "function" ? value.bind(actual) : value;
  },
}) as DrizzleDB;

export function getRawSqlite(): Database.Database {
  if (!_sqlite) {
    getDb();
  }
  return _sqlite!;
}

export function resetDbForTesting(newDb?: DrizzleDB): void {
  _db = newDb || null;
  if (newDb) {
    _sqlite = null;
  }
}
