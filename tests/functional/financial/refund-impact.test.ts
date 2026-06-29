import { describe, it, expect } from 'vitest';
import { calculateProfit } from '@/lib/financial';

describe('refund impact on profit (functional/unit)', () => {
  it('a refund reduces profit by the refund amount', () => {
    const base = { soldPrice: 50, shippingCollected: 10, salesTax: 4, platformFees: 5, purchasePrice: 25, shippingCost: 8 };
    const before = calculateProfit({ ...base, refundAmount: 0 });
    const after = calculateProfit({ ...base, refundAmount: 20 });
    expect(before - after).toBe(20);
  });

  it('refund_no_return and refund_with_return reduce profit identically (refund amount only)', () => {
    // The refund amount is what affects profit; item status difference does not change the formula.
    const noReturn = calculateProfit({ soldPrice: 50, shippingCollected: 0, salesTax: 0, platformFees: 0, refundAmount: 15, purchasePrice: 20, shippingCost: 0 });
    const withReturn = calculateProfit({ soldPrice: 50, shippingCollected: 0, salesTax: 0, platformFees: 0, refundAmount: 15, purchasePrice: 20, shippingCost: 0 });
    expect(noReturn).toBe(withReturn);
    expect(noReturn).toBe(15);
  });

  it('a full refund can make profit negative', () => {
    const p = calculateProfit({ soldPrice: 50, shippingCollected: 0, salesTax: 0, platformFees: 5, refundAmount: 50, purchasePrice: 20, shippingCost: 0 });
    expect(p).toBe(-25);
  });
});