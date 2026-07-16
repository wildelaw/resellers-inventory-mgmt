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

describe("Password change invalidates sessions", () => {
  it("updates passwordChangedAt when password changes", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [u] = await db
      .insert(schema.users)
      .values({
        email: "p@b.com",
        passwordHash: "old",
        name: "P",
        role: "user",
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    expect(u.passwordChangedAt).toBe(0);

    const newTs = now + 100;
    await db
      .update(schema.users)
      .set({ passwordHash: "new", passwordChangedAt: newTs, updatedAt: newTs })
      .where(eq(schema.users.id, u.id));

    const [updated] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    expect(updated.passwordChangedAt).toBe(newTs);
  });

  it("session iat < passwordChangedAt means invalidated", () => {
    const passwordChangedAt = 1000;
    const iat = 500;
    const invalidated = passwordChangedAt > 0 && iat < passwordChangedAt;
    expect(invalidated).toBe(true);
  });

  it("session iat >= passwordChangedAt means valid", () => {
    const passwordChangedAt = 1000;
    const iat = 1000;
    const invalidated = passwordChangedAt > 0 && iat < passwordChangedAt;
    expect(invalidated).toBe(false);
  });

  it("initial passwordChangedAt=0 means any iat is valid", () => {
    const passwordChangedAt = 0;
    const iat = 100;
    const invalidated = passwordChangedAt > 0 && iat < passwordChangedAt;
    expect(invalidated).toBe(false);
  });
});
