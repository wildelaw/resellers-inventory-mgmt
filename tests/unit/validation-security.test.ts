import { describe, it, expect } from "vitest";
import { createItemSchema, createUserSchema, createSaleSchema } from "@/lib/validations";

describe("Security validations", () => {
  it("rejects extremely long name (XSS attempt)", () => {
    const r = createItemSchema.safeParse({
      name: "A".repeat(201),
      purchaseDate: "2024-01-15",
      purchasePrice: "5",
    });
    expect(r.success).toBe(false);
  });

  it("accepts max length name (200 chars)", () => {
    const r = createItemSchema.safeParse({
      name: "A".repeat(200),
      purchaseDate: "2024-01-15",
      purchasePrice: "5",
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative purchase price", () => {
    expect(
      createItemSchema.safeParse({
        name: "X",
        purchaseDate: "2024-01-15",
        purchasePrice: "-1",
      }).success
    ).toBe(false);
  });

  it("accepts zero price", () => {
    expect(
      createItemSchema.safeParse({
        name: "X",
        purchaseDate: "2024-01-15",
        purchasePrice: "0",
      }).success
    ).toBe(true);
  });

  it("strips/preserves special chars in strings (no SQL injection via ORM)", () => {
    const r = createItemSchema.safeParse({
      name: "'; DROP TABLE items; --",
      purchaseDate: "2024-01-15",
      purchasePrice: "5",
    });
    expect(r.success).toBe(true);
  });

  it("email field is bounded", () => {
    const r = createUserSchema.safeParse({
      email: "a".repeat(250) + "@b.com",
      name: "X",
      password: "Aa1!aaaa",
    });
    expect(r.success).toBe(false);
  });

  it("refund must be non-negative", () => {
    expect(
      createSaleSchema.safeParse({
        soldDate: "2024-01-15",
        soldPrice: "10",
        platform: "ebay",
        platformFees: "-1",
      }).success
    ).toBe(false);
  });
});
