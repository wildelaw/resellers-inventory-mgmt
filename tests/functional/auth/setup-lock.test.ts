import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, cleanupTestDb } from "../../setup/db";
import * as schema from "@/lib/schema";

let db: ReturnType<typeof createTestDb>["db"];
let path: string;

beforeAll(async () => {
  const t = createTestDb();
  db = t.db;
  path = t.path;
});

afterAll(() => {
  cleanupTestDb(path);
});

describe("Setup lock", () => {
  it("no users means needsSetup", async () => {
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(0);
  });

  it("after first user, setupComplete can be set to true", async () => {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(schema.users).values({
      email: "admin@b.com",
      passwordHash: "x",
      name: "Admin",
      role: "admin",
      canViewAll: true,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(schema.appConfig).values({
      id: 1,
      setupComplete: true,
      updatedAt: now,
    });
    const cfg = await db.query.appConfig.findFirst();
    expect(cfg?.setupComplete).toBe(true);
  });

  it("setup-unlock resets setupComplete to false", async () => {
    const cfg = await db.query.appConfig.findFirst();
    await db
      .update(schema.appConfig)
      .set({ setupComplete: false, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(schema.appConfig.id, cfg!.id));
    const after = await db.query.appConfig.findFirst();
    expect(after?.setupComplete).toBe(false);
  });
});
