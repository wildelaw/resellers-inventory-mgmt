import { describe, it, expect } from "vitest";
import { calculateProfit } from "@/lib/financial";

describe("Refund impact on profit", () => {
  it("refund reduces profit by refund amount", () => {
    const baseProfit = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
    });
    const afterRefund = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      refundAmount: 20,
    });
    expect(afterRefund).toBe(baseProfit - 20);
  });

  it("full refund zeroes profit (when purchasePrice is the only offset)", () => {
    const profit = calculateProfit({
      soldPrice: 50,
      purchasePrice: 30,
      refundAmount: 20,
    });
    expect(profit).toBe(0);
  });

  it("refund can drive profit negative", () => {
    const profit = calculateProfit({
      soldPrice: 50,
      purchasePrice: 30,
      refundAmount: 30,
    });
    expect(profit).toBe(-10);
  });

  it("partial refund with fees", () => {
    const profit = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      platformFees: 10,
      salesTax: 5,
      shippingCost: 5,
      refundAmount: 10,
    });
    expect(profit).toBe(100 - 30 - 10 - 5 - 5 - 10);
  });
});
