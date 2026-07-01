import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('financial', () => {
  describe('calculateProfit', () => {
    it('calculates profit with all values present', () => {
      const profit = calculateProfit({
        soldPrice: 100,
        shippingCollected: 15,
        salesTax: 8.25,
        platformFees: 10,
        refundAmount: 0,
        purchasePrice: 25,
        shippingCost: 5,
      });
      // 100 + 15 - 8.25 - 10 - 0 - 25 - 5 = 66.75
      expect(profit).toBeCloseTo(66.75, 2);
    });

    it('handles null/undefined values', () => {
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

    it('handles zero values', () => {
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

    it('handles refund reducing profit', () => {
      const profit = calculateProfit({
        soldPrice: 100,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 50,
        purchasePrice: 25,
        shippingCost: 0,
      });
      // 100 + 0 - 0 - 0 - 50 - 25 - 0 = 25
      expect(profit).toBe(25);
    });

    it('produces negative profit when costs exceed revenue', () => {
      const profit = calculateProfit({
        soldPrice: 10,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 5,
        refundAmount: 0,
        purchasePrice: 20,
        shippingCost: 5,
      });
      // 10 + 0 - 0 - 5 - 0 - 20 - 5 = -20
      expect(profit).toBe(-20);
    });
  });

  describe('calculateNetRevenue', () => {
    it('calculates net revenue excluding cost of goods', () => {
      const revenue = calculateNetRevenue({
        soldPrice: 100,
        shippingCollected: 15,
        salesTax: 8.25,
        platformFees: 10,
        refundAmount: 0,
      });
      // 100 + 15 - 8.25 - 10 - 0 = 96.75
      expect(revenue).toBeCloseTo(96.75, 2);
    });

    it('handles null values', () => {
      const revenue = calculateNetRevenue({
        soldPrice: 50,
        shippingCollected: null,
        salesTax: undefined,
        platformFees: null,
        refundAmount: undefined,
      });
      expect(revenue).toBe(50);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('calculates tax with default rate', () => {
      const tax = calculateSalesTaxFromPrice(100);
      expect(tax).toBeCloseTo(8.25, 2);
    });

    it('calculates tax with custom rate', () => {
      const tax = calculateSalesTaxFromPrice(100, 0.05);
      expect(tax).toBe(5);
    });

    it('handles zero price', () => {
      expect(calculateSalesTaxFromPrice(0)).toBe(0);
    });

    it('handles null/undefined price', () => {
      expect(calculateSalesTaxFromPrice(null as never)).toBe(0);
    });
  });
});