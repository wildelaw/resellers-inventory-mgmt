import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('financial', () => {
  describe('calculateProfit', () => {
    it('computes profit with all fields', () => {
      expect(calculateProfit({
        soldPrice: 100, shippingCollected: 10, salesTax: 8, platformFees: 5,
        refundAmount: 0, purchasePrice: 25, shippingCost: 5,
      })).toBe(67);
    });

    it('handles null/undefined optional fields as 0', () => {
      expect(calculateProfit({ soldPrice: 50, purchasePrice: 20 })).toBe(30);
      expect(calculateProfit({ soldPrice: 50, purchasePrice: 20, shippingCollected: null, salesTax: null, platformFees: null, refundAmount: null, shippingCost: null })).toBe(30);
    });

    it('deducts refund amount', () => {
      expect(calculateProfit({ soldPrice: 100, purchasePrice: 20, refundAmount: 30 })).toBe(50);
    });

    it('handles all zeros', () => {
      expect(calculateProfit({ soldPrice: 0, purchasePrice: 0 })).toBe(0);
    });

    it('produces negative profit when costs exceed revenue', () => {
      expect(calculateProfit({ soldPrice: 10, purchasePrice: 50 })).toBe(-40);
    });
  });

  describe('calculateNetRevenue', () => {
    it('excludes purchase price', () => {
      expect(calculateNetRevenue({ soldPrice: 100, shippingCollected: 10, salesTax: 8, platformFees: 5, shippingCost: 5 })).toBe(92);
    });
    it('deducts refund', () => {
      expect(calculateNetRevenue({ soldPrice: 100, refundAmount: 20 })).toBe(80);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('extracts tax from tax-inclusive price at 8.25%', () => {
      const tax = calculateSalesTaxFromPrice(108.25, 0.0825);
      expect(tax).toBeCloseTo(8.25, 1);
    });
    it('returns 0 when rate is 0', () => {
      expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
    });
    it('uses default rate of 0.0825', () => {
      const tax = calculateSalesTaxFromPrice(108.25);
      expect(tax).toBeCloseTo(8.25, 1);
    });
  });
});
