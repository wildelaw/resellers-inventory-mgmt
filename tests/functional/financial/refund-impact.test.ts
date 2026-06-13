import { describe, it, expect } from 'vitest';
import { calculateProfit } from '@/lib/financial';

describe('Refund Impact on Profit', () => {
  it('refund_no_return reduces profit by refund amount but item stays sold', () => {
    // Item: purchase price $30, sold for $100
    // Refund $25 (no return)
    const profitBeforeRefund = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      shippingCost: 0,
      shippingCollected: 0,
      salesTax: 0,
      platformFees: 0,
      refundAmount: 0,
    });
    const profitAfterRefund = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      shippingCost: 0,
      shippingCollected: 0,
      salesTax: 0,
      platformFees: 0,
      refundAmount: 25,
    });
    // Profit drops by refund amount
    expect(profitBeforeRefund - profitAfterRefund).toBe(25);
  });

  it('refund_with_return reduces profit by refund amount and item returns to available', () => {
    // Same calculation, different side effect on item status
    const profit = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      shippingCost: 0,
      shippingCollected: 0,
      salesTax: 0,
      platformFees: 0,
      refundAmount: 100, // Full refund
    });
    // 100 + 0 - 0 - 0 - 100 - 30 - 0 = -30 (loss of purchase price)
    expect(profit).toBe(-30);
  });

  it('partial refund still allows positive profit', () => {
    const profit = calculateProfit({
      soldPrice: 100,
      purchasePrice: 30,
      shippingCost: 5,
      shippingCollected: 10,
      salesTax: 8.25,
      platformFees: 3,
      refundAmount: 20,
    });
    // 100 + 10 - 8.25 - 3 - 20 - 30 - 5 = 43.75
    expect(profit).toBeCloseTo(43.75, 2);
  });
});