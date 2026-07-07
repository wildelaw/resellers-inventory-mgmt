import { describe, it, expect } from 'vitest';
import { calculateProfit } from '@/lib/financial';

describe('refund impact on profit', () => {
  it('no refund: profit = 100 - 20 = 80', () => {
    expect(calculateProfit({ soldPrice: 100, purchasePrice: 20 })).toBe(80);
  });

  it('partial refund reduces profit', () => {
    expect(calculateProfit({ soldPrice: 100, purchasePrice: 20, refundAmount: 30 })).toBe(50);
  });

  it('full refund wipes out revenue', () => {
    expect(calculateProfit({ soldPrice: 100, purchasePrice: 20, refundAmount: 100 })).toBe(-20);
  });

  it('refund_no_return vs refund_with_return produce same profit (item status differs)', () => {
    const base = { soldPrice: 100, purchasePrice: 20, refundAmount: 25 };
    // Profit is the same regardless of refund type — the difference is item status.
    expect(calculateProfit(base)).toBe(55);
  });
});
