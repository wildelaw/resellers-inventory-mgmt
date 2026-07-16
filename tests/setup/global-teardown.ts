import { afterAll, beforeAll } from "vitest";
import { mkdirSync, rmSync, existsSync } from "fs";
import { runMigrations } from "@/lib/migrate";
import { db } from "@/lib/db";

const TMP_DIR = "./tests/.tmp";

beforeAll(() => {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }
  if (!existsSync(`${TMP_DIR}/uploads`)) {
    mkdirSync(`${TMP_DIR}/uploads`, { recursive: true });
  }
  if (!existsSync(`${TMP_DIR}/backups`)) {
    mkdirSync(`${TMP_DIR}/backups`, { recursive: true });
  }
  try {
    runMigrations();
  } catch {
    // db may not exist; tests that need db should initialize it
  }
});

afterAll(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
