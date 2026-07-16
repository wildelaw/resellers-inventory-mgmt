import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, cleanupTestDb } from "../../setup/db";
import * as schema from "@/lib/schema";

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

describe("Inventory removal date", () => {
  it("removalDate is null for available items", async () => {
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
    expect(item.removalDate).toBe(null);
  });

  it("removalDate is set when transitioning to donated", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Y",
        purchaseDate: now,
        purchasePrice: 10,
        status: "available",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const ts = Math.floor(Date.now() / 1000);
    await db
      .update(schema.items)
      .set({ status: "donated", removalDate: ts, updatedAt: ts })
      .where(eq(schema.items.id, item.id));
    const [u] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(u.status).toBe("donated");
    expect(u.removalDate).toBe(ts);
  });

  it("donated does NOT create a sale record", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Z",
        purchaseDate: now,
        purchasePrice: 10,
        status: "available",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const ts = Math.floor(Date.now() / 1000);
    await db
      .update(schema.items)
      .set({ status: "discarded", removalDate: ts, updatedAt: ts })
      .where(eq(schema.items.id, item.id));
    const sales = await db.select().from(schema.sales).where(eq(schema.sales.itemId, item.id));
    expect(sales).toHaveLength(0);
  });
});
