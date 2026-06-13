import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue } from '@/lib/financial';

describe('Refund impact on profit', () => {
  it('full refund reduces profit to negative of costs', () => {
    const profit = calculateProfit({
      soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
      platformFees: 12, refundAmount: 100, purchasePrice: 25, shippingCost: 5,
    });
    expect(profit).toBeCloseTo(-40.25);
  });

  it('partial refund reduces profit proportionally', () => {
    const noRefund = calculateProfit({
      soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
      platformFees: 12, refundAmount: 0, purchasePrice: 25, shippingCost: 5,
    });
    const partialRefund = calculateProfit({
      soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
      platformFees: 12, refundAmount: 30, purchasePrice: 25, shippingCost: 5,
    });
    expect(noRefund - partialRefund).toBe(30);
  });

  it('refund amount of 0 has no impact', () => {
    const profit = calculateProfit({
      soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
      platformFees: 12, refundAmount: 0, purchasePrice: 25, shippingCost: 5,
    });
    const netRevenue = calculateNetRevenue({
      soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
      platformFees: 12, refundAmount: 0,
    });
    expect(profit).toBeCloseTo(59.75);
    expect(netRevenue).toBeCloseTo(89.75);
  });

  it('refund_type affects item status but not profit calculation', () => {
    // Both refund_with_return and refund_no_return use the same profit formula
    // The difference is only in item status handling
    const profit = calculateProfit({
      soldPrice: 80, shippingCollected: 5, salesTax: 6.60,
      platformFees: 8, refundAmount: 40, purchasePrice: 20, shippingCost: 3,
    });
    expect(profit).toBeCloseTo(7.40);
  });
});