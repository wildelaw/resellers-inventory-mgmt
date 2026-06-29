import { describe, it, expect } from 'vitest';
import {
  calculateProfit,
  calculateNetRevenue,
  calculateSalesTaxFromPrice,
} from '@/lib/financial';

describe('financial', () => {
  describe('calculateProfit', () => {
    it('computes profit with all fields provided', () => {
      // 50 + 15 - 3 - 5 - 0 - 25 - 10 = 22
      expect(
        calculateProfit({
          soldPrice: 50,
          shippingCollected: 15,
          salesTax: 3,
          platformFees: 5,
          refundAmount: 0,
          purchasePrice: 25,
          shippingCost: 10,
        }),
      ).toBe(22);
    });

    it('treats null/undefined numeric fields as 0', () => {
      expect(
        calculateProfit({
          soldPrice: 50,
          shippingCollected: null,
          salesTax: undefined,
          platformFees: null,
          refundAmount: null,
          purchasePrice: 25,
          shippingCost: null,
        }),
      ).toBe(25);
    });

    it('subtracts refundAmount from profit', () => {
      expect(
        calculateProfit({
          soldPrice: 50,
          shippingCollected: 0,
          salesTax: 0,
          platformFees: 0,
          refundAmount: 20,
          purchasePrice: 25,
          shippingCost: 0,
        }),
      ).toBe(5);
    });

    it('handles zero soldPrice', () => {
      expect(
        calculateProfit({
          soldPrice: 0,
          shippingCollected: 0,
          salesTax: 0,
          platformFees: 0,
          refundAmount: 0,
          purchasePrice: 10,
          shippingCost: 0,
        }),
      ).toBe(-10);
    });

    it('handles all-zero inputs (yields 0)', () => {
      expect(
        calculateProfit({
          soldPrice: 0,
          shippingCollected: 0,
          salesTax: 0,
          platformFees: 0,
          refundAmount: 0,
          purchasePrice: 0,
          shippingCost: 0,
        }),
      ).toBe(0);
    });

    it('handles NaN inputs as 0', () => {
      expect(
        calculateProfit({
          soldPrice: Number.NaN,
          shippingCollected: Number.NaN,
          salesTax: Number.NaN,
          platformFees: Number.NaN,
          refundAmount: Number.NaN,
          purchasePrice: Number.NaN,
          shippingCost: Number.NaN,
        }),
      ).toBe(0);
    });
  });

  describe('calculateNetRevenue', () => {
    it('sums soldPrice + shippingCollected - refundAmount', () => {
      expect(
        calculateNetRevenue({ soldPrice: 50, shippingCollected: 15, refundAmount: 5 }),
      ).toBe(60);
    });

    it('treats null fields as 0', () => {
      expect(
        calculateNetRevenue({ soldPrice: 50, shippingCollected: null, refundAmount: null }),
      ).toBe(50);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('extracts tax from a tax-inclusive price at default 8.25%', () => {
      // price 100, rate 0.0825 → tax ≈ 7.61
      const tax = calculateSalesTaxFromPrice(100, 0.0825);
      expect(tax).toBeCloseTo(100 - 100 / 1.0825, 5);
    });

    it('returns 0 for non-positive price or rate', () => {
      expect(calculateSalesTaxFromPrice(0, 0.0825)).toBe(0);
      expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
      expect(calculateSalesTaxFromPrice(-5, 0.0825)).toBe(0);
    });

    it('uses default rate when omitted', () => {
      const a = calculateSalesTaxFromPrice(100);
      const b = calculateSalesTaxFromPrice(100, 0.0825);
      expect(a).toBeCloseTo(b, 5);
    });
  });
});