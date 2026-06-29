import { describe, it, expect } from 'vitest';
import {
  calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice, calculateGrossRevenue,
} from '@/lib/financial';

describe('calculateProfit', () => {
  it('computes the full formula', () => {
    // 50 + 10 - 4 - 5 - 0 - 25 - 8 = 18
    expect(calculateProfit({
      soldPrice: 50, shippingCollected: 10, salesTax: 4, platformFees: 5,
      refundAmount: 0, purchasePrice: 25, shippingCost: 8,
    })).toBe(18);
  });

  it('subtracts refund amount', () => {
    expect(calculateProfit({
      soldPrice: 50, shippingCollected: 0, salesTax: 0, platformFees: 0,
      refundAmount: 20, purchasePrice: 10, shippingCost: 0,
    })).toBe(20);
  });

  it('treats null/undefined optional fields as 0', () => {
    expect(calculateProfit({
      soldPrice: 30, shippingCollected: null, salesTax: undefined, platformFees: null,
      refundAmount: undefined, purchasePrice: 10, shippingCost: null,
    })).toBe(20);
  });

  it('handles all-zero inputs', () => {
    expect(calculateProfit({
      soldPrice: 0, shippingCollected: 0, salesTax: 0, platformFees: 0,
      refundAmount: 0, purchasePrice: 0, shippingCost: 0,
    })).toBe(0);
  });

  it('produces negative profit when costs exceed revenue', () => {
    expect(calculateProfit({
      soldPrice: 5, shippingCollected: 0, salesTax: 0, platformFees: 0,
      refundAmount: 0, purchasePrice: 20, shippingCost: 0,
    })).toBe(-15);
  });
});

describe('calculateNetRevenue', () => {
  it('excludes costs and platform fees', () => {
    // 50 + 10 - 4 - 20 = 36
    expect(calculateNetRevenue({
      soldPrice: 50, shippingCollected: 10, salesTax: 4, platformFees: 5,
      refundAmount: 20, purchasePrice: 25, shippingCost: 8,
    })).toBe(36);
  });
});

describe('calculateGrossRevenue', () => {
  it('is soldPrice + shippingCollected', () => {
    expect(calculateGrossRevenue({
      soldPrice: 50, shippingCollected: 10, salesTax: 4, platformFees: 5,
      refundAmount: 20, purchasePrice: 25, shippingCost: 8,
    })).toBe(60);
  });
});

describe('calculateSalesTaxFromPrice', () => {
  it('backs out tax from a tax-inclusive price at default rate', () => {
    // price 108.25 at 8.25% -> tax = 108.25 - (108.25/1.0825) = 108.25 - 100 = 8.25
    expect(calculateSalesTaxFromPrice(108.25)).toBeCloseTo(8.25, 2);
  });

  it('returns 0 when rate is 0', () => {
    expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
  });

  it('handles explicit rate', () => {
    // 110 at 10% -> 110 - 100 = 10
    expect(calculateSalesTaxFromPrice(110, 0.1)).toBeCloseTo(10, 2);
  });
});