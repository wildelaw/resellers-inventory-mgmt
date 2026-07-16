import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  setupSchema,
  createItemSchema,
  createSaleSchema,
  updateRefundSchema,
  profileUpdateSchema,
  settingsUpdateSchema,
  importSchema,
  passwordSchema,
} from "@/lib/validations";

describe("passwordSchema", () => {
  it("accepts strong passwords", () => {
    expect(passwordSchema.safeParse("Aa1!aaaa").success).toBe(true);
    expect(passwordSchema.safeParse("GoodP@ss1").success).toBe(true);
  });
  it("rejects too short", () => {
    expect(passwordSchema.safeParse("Aa1!").success).toBe(false);
  });
  it("rejects missing lowercase", () => {
    expect(passwordSchema.safeParse("AAAAA1!A").success).toBe(false);
  });
  it("rejects missing uppercase", () => {
    expect(passwordSchema.safeParse("aaaaa1!a").success).toBe(false);
  });
  it("rejects missing digit", () => {
    expect(passwordSchema.safeParse("Aaaaa!aa").success).toBe(false);
  });
  it("rejects missing special", () => {
    expect(passwordSchema.safeParse("Aaaaa1aa").success).toBe(false);
  });
  it("rejects too long", () => {
    expect(passwordSchema.safeParse("A".repeat(130) + "1!a").success).toBe(false);
  });
});

describe("setupSchema", () => {
  it("accepts valid input", () => {
    expect(
      setupSchema.safeParse({ name: "Admin", email: "a@b.com", password: "Aa1!aaaa" }).success
    ).toBe(true);
  });
  it("requires email", () => {
    expect(setupSchema.safeParse({ name: "A", email: "bad", password: "Aa1!aaaa" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts admin and canViewAll", () => {
    const r = createUserSchema.safeParse({
      email: "a@b.com",
      name: "A",
      password: "Aa1!aaaa",
      role: "admin",
      canViewAll: true,
    });
    expect(r.success).toBe(true);
  });
  it("defaults canViewAll to false", () => {
    const r = createUserSchema.safeParse({
      email: "a@b.com",
      name: "A",
      password: "Aa1!aaaa",
      role: "user",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.canViewAll).toBe(false);
  });
  it("rejects bad role", () => {
    expect(
      createUserSchema.safeParse({
        email: "a@b.com",
        name: "A",
        password: "Aa1!aaaa",
        role: "power_user",
      }).success
    ).toBe(false);
  });
});

describe("createItemSchema", () => {
  it("accepts valid item", () => {
    const r = createItemSchema.safeParse({
      name: "Jacket",
      purchaseDate: "2024-01-15",
      purchasePrice: "25.00",
    });
    expect(r.success).toBe(true);
  });
  it("requires name", () => {
    expect(
      createItemSchema.safeParse({
        purchaseDate: "2024-01-15",
        purchasePrice: "25",
      }).success
    ).toBe(false);
  });
  it("rejects negative price", () => {
    expect(
      createItemSchema.safeParse({
        name: "Jacket",
        purchaseDate: "2024-01-15",
        purchasePrice: "-5",
      }).success
    ).toBe(false);
  });
});

describe("createSaleSchema", () => {
  it("accepts valid sale", () => {
    const r = createSaleSchema.safeParse({
      soldDate: "2024-01-15",
      soldPrice: "50",
      platform: "ebay",
    });
    expect(r.success).toBe(true);
  });
  it("requires platform", () => {
    expect(
      createSaleSchema.safeParse({
        soldDate: "2024-01-15",
        soldPrice: "50",
      }).success
    ).toBe(false);
  });
  it("rejects bad platform", () => {
    expect(
      createSaleSchema.safeParse({
        soldDate: "2024-01-15",
        soldPrice: "50",
        platform: "unknown",
      }).success
    ).toBe(false);
  });
});

describe("updateRefundSchema", () => {
  it("accepts valid refund", () => {
    expect(
      updateRefundSchema.safeParse({
        saleId: 1,
        refundAmount: "10",
        refundType: "refund_no_return",
      }).success
    ).toBe(true);
  });
  it("requires refundType", () => {
    expect(
      updateRefundSchema.safeParse({
        saleId: 1,
        refundAmount: "10",
      }).success
    ).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("discriminates profile", () => {
    expect(
      profileUpdateSchema.safeParse({ type: "profile", name: "X" }).success
    ).toBe(true);
  });
  it("discriminates password", () => {
    expect(
      profileUpdateSchema.safeParse({
        type: "password",
        currentPassword: "old",
        newPassword: "Aa1!aaaa",
      }).success
    ).toBe(true);
  });
  it("rejects password with weak new", () => {
    expect(
      profileUpdateSchema.safeParse({
        type: "password",
        currentPassword: "old",
        newPassword: "weak",
      }).success
    ).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts tax rate between 0 and 1", () => {
    expect(settingsUpdateSchema.safeParse({ salesTaxRate: 0.0825 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ salesTaxRate: 1 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ salesTaxRate: 0 }).success).toBe(true);
  });
  it("rejects tax rate above 1", () => {
    expect(settingsUpdateSchema.safeParse({ salesTaxRate: 2 }).success).toBe(false);
  });
});

describe("importSchema", () => {
  it("accepts valid", () => {
    expect(
      importSchema.safeParse({ type: "inventory", csvData: "name,price\nA,5" }).success
    ).toBe(true);
  });
  it("rejects oversized csv", () => {
    const big = "x".repeat(1024 * 1024 + 1);
    expect(importSchema.safeParse({ type: "inventory", csvData: big }).success).toBe(false);
  });
});
