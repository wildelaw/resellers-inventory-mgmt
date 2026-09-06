import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('calculateProfit', () => {
  it('computes profit with all components', () => {
    expect(calculateProfit({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 0,
      purchasePrice: 40,
      shippingCost: 7,
    })).toBe(50);
  });

  it('treats null and undefined optional fields as zero', () => {
    expect(calculateProfit({
      soldPrice: 100,
      shippingCollected: null,
      salesTax: null,
      platformFees: null,
      refundAmount: null,
      purchasePrice: 40,
      shippingCost: null,
    })).toBe(60);
    expect(calculateProfit({ soldPrice: 100, purchasePrice: 40 })).toBe(60);
  });

  it('treats zero fields the same as null', () => {
    expect(calculateProfit({
      soldPrice: 100,
      shippingCollected: 0,
      salesTax: 0,
      platformFees: 0,
      refundAmount: 0,
      purchasePrice: 40,
      shippingCost: 0,
    })).toBe(60);
  });

  it('subtracts refunds', () => {
    expect(calculateProfit({
      soldPrice: 100,
      refundAmount: 100,
      purchasePrice: 40,
    })).toBe(-40);
  });

  it('produces negative profit on a loss', () => {
    expect(calculateProfit({
      soldPrice: 30,
      purchasePrice: 50,
      shippingCost: 5,
    })).toBe(-25);
  });
});

describe('calculateNetRevenue', () => {
  it('deducts tax, fees, and refunds from gross', () => {
    expect(calculateNetRevenue({
      soldPrice: 100,
      shippingCollected: 10,
      salesTax: 8,
      platformFees: 5,
      refundAmount: 20,
    })).toBe(77);
  });

  it('handles null/zero optionals', () => {
    expect(calculateNetRevenue({ soldPrice: 50, shippingCollected: null, salesTax: null, platformFees: null, refundAmount: null })).toBe(50);
    expect(calculateNetRevenue({ soldPrice: 50, shippingCollected: 0, salesTax: 0, platformFees: 0, refundAmount: 0 })).toBe(50);
  });
});

describe('calculateSalesTaxFromPrice', () => {
  it('extracts tax from a tax-inclusive price', () => {
    // 100 at 8.25% → tax = 100 - 100/1.0825 ≈ 7.6212
    const tax = calculateSalesTaxFromPrice(100, 0.0825);
    expect(tax).toBeCloseTo(7.6212, 4);
  });

  it('returns zero for zero or negative rates', () => {
    expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
    expect(calculateSalesTaxFromPrice(100, -0.05)).toBe(0);
  });

  it('is consistent: price - tax = price / (1 + rate)', () => {
    const rate = 0.0825;
    const price = 53.27;
    const tax = calculateSalesTaxFromPrice(price, rate);
    expect(price - tax).toBeCloseTo(price / (1 + rate), 10);
  });
});