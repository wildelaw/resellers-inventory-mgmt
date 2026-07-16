import { describe, it, expect } from "vitest";
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from "@/lib/financial";

describe("calculateProfit", () => {
  it("basic profit = sold - purchase", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20 })
    ).toBe(30);
  });
  it("subtracts shipping cost", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20, shippingCost: 5 })
    ).toBe(25);
  });
  it("adds shipping collected", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20, shippingCollected: 10 })
    ).toBe(40);
  });
  it("subtracts sales tax", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20, salesTax: 5 })
    ).toBe(25);
  });
  it("subtracts platform fees", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20, platformFees: 3 })
    ).toBe(27);
  });
  it("subtracts refund amount", () => {
    expect(
      calculateProfit({ soldPrice: 50, purchasePrice: 20, refundAmount: 15 })
    ).toBe(15);
  });
  it("handles all null/zero", () => {
    expect(
      calculateProfit({
        soldPrice: 100,
        purchasePrice: 30,
        shippingCollected: null,
        salesTax: null,
        platformFees: null,
        refundAmount: null,
        shippingCost: null,
      })
    ).toBe(70);
  });
  it("can produce negative profit (loss)", () => {
    expect(
      calculateProfit({ soldPrice: 10, purchasePrice: 50 })
    ).toBe(-40);
  });
  it("handles zero sold price", () => {
    expect(
      calculateProfit({ soldPrice: 0, purchasePrice: 10 })
    ).toBe(-10);
  });
});

describe("calculateNetRevenue", () => {
  it("profit + purchase price = revenue", () => {
    const profit = calculateProfit({ soldPrice: 50, purchasePrice: 20 });
    expect(calculateNetRevenue({ soldPrice: 50, purchasePrice: 20 })).toBe(profit + 20);
  });
});

describe("calculateSalesTaxFromPrice", () => {
  it("computes embedded tax for 8.25% rate", () => {
    const tax = calculateSalesTaxFromPrice(100, 0.0825);
    expect(tax).toBeCloseTo(7.64, 1);
  });
  it("returns 0 for zero rate", () => {
    expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
  });
});
