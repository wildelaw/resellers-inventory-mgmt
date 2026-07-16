import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and, sql } from "drizzle-orm";
import { createTestDb, cleanupTestDb } from "../../setup/db";
import * as schema from "@/lib/schema";
import { calculateProfit } from "@/lib/financial";

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

describe("Sale and refund flow", () => {
  it("creating sale updates item to sold", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Item",
        purchaseDate: now,
        purchasePrice: 20,
        status: "available",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    db.transaction((tx) => {
      tx.insert(schema.sales).values({
        itemId: item.id,
        soldDate: now,
        soldPrice: 50,
        platform: "ebay",
        soldBy: testUser.id,
        createdAt: now,
      }).run();
      tx
        .update(schema.items)
        .set({ status: "sold", removalDate: now, updatedAt: now })
        .where(eq(schema.items.id, item.id))
        .run();
    });

    const [updated] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updated.status).toBe("sold");
  });

  it("refund_with_return transitions item back to returned", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Item2",
        purchaseDate: now,
        purchasePrice: 20,
        status: "sold",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
        removalDate: now,
      })
      .returning();

    const [sale] = await db
      .insert(schema.sales)
      .values({
        itemId: item.id,
        soldDate: now,
        soldPrice: 50,
        platform: "ebay",
        soldBy: testUser.id,
        createdAt: now,
      })
      .returning();

    db.transaction((tx) => {
      tx
        .update(schema.sales)
        .set({ refundAmount: 50, refundType: "refund_with_return" })
        .where(eq(schema.sales.id, sale.id))
        .run();
      tx
        .update(schema.items)
        .set({ status: "returned", removalDate: null, updatedAt: now })
        .where(eq(schema.items.id, item.id))
        .run();
    });

    const [updatedItem] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updatedItem.status).toBe("returned");
    expect(updatedItem.removalDate).toBe(null);

    const [updatedSale] = await db.select().from(schema.sales).where(eq(schema.sales.id, sale.id));
    expect(updatedSale.refundType).toBe("refund_with_return");
    expect(updatedSale.refundAmount).toBe(50);
  });

  it("refund_no_return leaves item as sold", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Item3",
        purchaseDate: now,
        purchasePrice: 20,
        status: "sold",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
        removalDate: now,
      })
      .returning();

    const [sale] = await db
      .insert(schema.sales)
      .values({
        itemId: item.id,
        soldDate: now,
        soldPrice: 50,
        platform: "ebay",
        soldBy: testUser.id,
        createdAt: now,
      })
      .returning();

    db.transaction((tx) => {
      tx
        .update(schema.sales)
        .set({ refundAmount: 10, refundType: "refund_no_return" })
        .where(eq(schema.sales.id, sale.id))
        .run();
    });

    const [updatedItem] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updatedItem.status).toBe("sold");
  });

  it("deleting sale reverts item to available", async () => {
    const now = Math.floor(Date.now() / 1000);
    const [item] = await db
      .insert(schema.items)
      .values({
        name: "Item4",
        purchaseDate: now,
        purchasePrice: 20,
        status: "sold",
        ownerId: testUser.id,
        createdAt: now,
        updatedAt: now,
        removalDate: now,
      })
      .returning();

    const [sale] = await db
      .insert(schema.sales)
      .values({
        itemId: item.id,
        soldDate: now,
        soldPrice: 50,
        platform: "ebay",
        soldBy: testUser.id,
        createdAt: now,
      })
      .returning();

    db.transaction((tx) => {
      tx.delete(schema.sales).where(eq(schema.sales.id, sale.id)).run();
      tx
        .update(schema.items)
        .set({ status: "available", removalDate: null, updatedAt: now })
        .where(eq(schema.items.id, item.id))
        .run();
    });

    const [updated] = await db.select().from(schema.items).where(eq(schema.items.id, item.id));
    expect(updated.status).toBe("available");
  });
});
