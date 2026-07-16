import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, cleanupTestDb } from "../../setup/db";
import * as schema from "@/lib/schema";
import { isValidTransition, getAllowedTransitions } from "@/lib/constants";

let db: ReturnType<typeof createTestDb>["db"];
let path: string;
let testUser: schema.User;

beforeAll(async () => {
  const t = createTestDb();
  db = t.db;
  path = t.path;
  const now = Math.floor(Date.now() / 1000);
  const [u] = await db
    .insert(schema.users)
    .values({
      email: "a@b.com",
      passwordHash: "x",
      name: "A",
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  testUser = u;
});

afterAll(() => {
  cleanupTestDb(path);
});

describe("Status transition workflow", () => {
  it("validates every allowed transition from constants", async () => {
    for (const from of ["available", "listed", "sold", "returned"] as const) {
      const allowed = getAllowedTransitions(from);
      expect(allowed.length).toBeGreaterThan(0);
      for (const to of allowed) {
        expect(isValidTransition(from, to)).toBe(true);
      }
    }
  });

  it("donated and discarded are terminal", () => {
    for (const terminal of ["donated", "discarded"] as const) {
      expect(getAllowedTransitions(terminal)).toEqual([]);
    }
  });

  it("applies status update to item and sets removalDate for sold/donated/discarded", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "X",
        purchaseDate: now,
        purchasePrice: 10,
        status: "available",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db
      .update(schema.items)
      .set({ status: "sold", removalDate: now, updatedAt: now })
      .where(eq(schema.items.id, item.id));

    const [updated] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updated.status).toBe("sold");
    expect(updated.removalDate).toBe(now);
  });

  it("clears removalDate when returned → available", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Y",
        purchaseDate: now,
        purchasePrice: 10,
        status: "returned",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
        removalDate: now,
      })
      .returning();

    await db
      .update(schema.items)
      .set({ status: "available", removalDate: null, updatedAt: now })
      .where(eq(schema.items.id, item.id));

    const [updated] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updated.status).toBe("available");
    expect(updated.removalDate).toBe(null);
  });

  it("rejects invalid transition (sold → available)", () => {
    expect(isValidTransition("sold", "available")).toBe(false);
  });
});
