import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('Financial Calculations', () => {
  describe('calculateProfit', () => {
    it('calculates profit with all values present', () => {
      const result = calculateProfit({
        soldPrice: 100,
        shippingCollected: 10,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 0,
        purchasePrice: 25,
        shippingCost: 5,
      });
      // 100 + 10 - 8.25 - 5 - 0 - 25 - 5 = 66.75
      expect(result).toBeCloseTo(66.75);
    });

    it('handles null shippingCollected', () => {
      const result = calculateProfit({
        soldPrice: 100,
        shippingCollected: null,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 0,
        purchasePrice: 25,
        shippingCost: 5,
      });
      // 100 + 0 - 8.25 - 5 - 0 - 25 - 5 = 56.75
      expect(result).toBeCloseTo(56.75);
    });

    it('handles all null optional values', () => {
      const result = calculateProfit({
        soldPrice: 100,
        shippingCollected: null,
        salesTax: null,
        platformFees: null,
        refundAmount: null,
        purchasePrice: 25,
        shippingCost: null,
      });
      // 100 + 0 - 0 - 0 - 0 - 25 - 0 = 75
      expect(result).toBeCloseTo(75);
    });

    it('calculates profit with refund', () => {
      const result = calculateProfit({
        soldPrice: 100,
        shippingCollected: 10,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 50,
        purchasePrice: 25,
        shippingCost: 5,
      });
      // 100 + 10 - 8.25 - 5 - 50 - 25 - 5 = 16.75
      expect(result).toBeCloseTo(16.75);
    });

    it('can return negative profit', () => {
      const result = calculateProfit({
        soldPrice: 10,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
        purchasePrice: 50,
        shippingCost: 5,
      });
      // 10 + 0 - 0 - 0 - 0 - 50 - 5 = -45
      expect(result).toBeCloseTo(-45);
    });

    it('handles zero soldPrice', () => {
      const result = calculateProfit({
        soldPrice: 0,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
        purchasePrice: 10,
        shippingCost: 5,
      });
      expect(result).toBeCloseTo(-15);
    });
  });

  describe('calculateNetRevenue', () => {
    it('calculates net revenue correctly', () => {
      const result = calculateNetRevenue({
        soldPrice: 100,
        shippingCollected: 10,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 0,
      });
      // 100 + 10 - 8.25 - 5 - 0 = 96.75
      expect(result).toBeCloseTo(96.75);
    });

    it('handles null values', () => {
      const result = calculateNetRevenue({
        soldPrice: 100,
        shippingCollected: null,
        salesTax: null,
        platformFees: null,
        refundAmount: null,
      });
      expect(result).toBeCloseTo(100);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('calculates tax from price-inclusive amount', () => {
      // Price $100 includes 8.25% tax
      // Tax = 100 - (100 / 1.0825) = 100 - 92.38 = 7.62
      const result = calculateSalesTaxFromPrice(100, 0.0825);
      expect(result).toBeCloseTo(7.62, 1);
    });

    it('uses default rate of 8.25%', () => {
      const result = calculateSalesTaxFromPrice(100);
      const explicit = calculateSalesTaxFromPrice(100, 0.0825);
      expect(result).toBeCloseTo(explicit, 2);
    });

    it('handles zero price', () => {
      expect(calculateSalesTaxFromPrice(0, 0.0825)).toBeCloseTo(0);
    });
  });
});