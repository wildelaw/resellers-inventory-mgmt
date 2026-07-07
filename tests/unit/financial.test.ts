import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '../../src/lib/financial';

describe('Financial Calculations', () => {
  describe('calculateProfit', () => {
    it('calculates profit with all fields provided', () => {
      const profit = calculateProfit({
        soldPrice: 100,
        shippingCollected: 10,
        salesTax: 8,
        platformFees: 5,
        refundAmount: 0,
        purchasePrice: 25,
        shippingCost: 5,
      });
      // 100 + 10 - 8 - 5 - 0 - 25 - 5 = 67
      expect(profit).toBe(67);
    });

    it('handles null/undefined optional fields', () => {
      const profit = calculateProfit({
        soldPrice: 50,
        shippingCollected: null,
        salesTax: undefined,
        platformFees: null,
        refundAmount: undefined,
        purchasePrice: 20,
        shippingCost: null,
      });
      // 50 + 0 - 0 - 0 - 0 - 20 - 0 = 30
      expect(profit).toBe(30);
    });

    it('handles refund amounts', () => {
      const profit = calculateProfit({
        soldPrice: 100,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 30,
        purchasePrice: 25,
        shippingCost: 0,
      });
      // 100 - 30 - 25 = 45
      expect(profit).toBe(45);
    });

    it('handles zero sold price', () => {
      const profit = calculateProfit({
        soldPrice: 0,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
        purchasePrice: 10,
        shippingCost: 0,
      });
      expect(profit).toBe(-10);
    });

    it('handles negative profit (loss)', () => {
      const profit = calculateProfit({
        soldPrice: 10,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
        purchasePrice: 50,
        shippingCost: 5,
      });
      expect(profit).toBe(-45);
    });

    it('handles all zero values', () => {
      const profit = calculateProfit({
        soldPrice: 0,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
        purchasePrice: 0,
        shippingCost: 0,
      });
      expect(profit).toBe(0);
    });
  });

  describe('calculateNetRevenue', () => {
    it('calculates net revenue without purchase price', () => {
      const netRevenue = calculateNetRevenue({
        soldPrice: 100,
        shippingCollected: 10,
        salesTax: 8,
        platformFees: 5,
        refundAmount: 0,
      });
      // 100 + 10 - 8 - 5 - 0 = 97
      expect(netRevenue).toBe(97);
    });

    it('handles null values', () => {
      const netRevenue = calculateNetRevenue({
        soldPrice: 50,
        shippingCollected: null,
        salesTax: undefined,
        platformFees: null,
        refundAmount: undefined,
      });
      expect(netRevenue).toBe(50);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('calculates tax from tax-inclusive price', () => {
      const tax = calculateSalesTaxFromPrice(100, 0.0825);
      // 100 - (100 / 1.0825) = 100 - 92.38... = 7.62...
      expect(tax).toBeCloseTo(7.621, 1);
    });

    it('uses default rate when none provided', () => {
      const tax = calculateSalesTaxFromPrice(100);
      expect(tax).toBeCloseTo(7.621, 1);
    });

    it('returns 0 for zero price', () => {
      expect(calculateSalesTaxFromPrice(0)).toBe(0);
    });

    it('returns 0 for negative price', () => {
      expect(calculateSalesTaxFromPrice(-10)).toBe(0);
    });

    it('returns 0 for zero rate', () => {
      expect(calculateSalesTaxFromPrice(100, 0)).toBe(0);
    });
  });
});