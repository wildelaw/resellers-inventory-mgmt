import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('Financial Calculations', () => {
  describe('calculateProfit', () => {
    it('calculates profit correctly with all fields', () => {
      const result = calculateProfit({
        soldPrice: 100,
        purchasePrice: 30,
        shippingCost: 10,
        shippingCollected: 12,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 0,
      });
      // 100 + 12 - 8.25 - 5 - 0 - 30 - 10 = 58.75
      expect(result).toBeCloseTo(58.75, 2);
    });

    it('calculates profit with null values defaulting to 0', () => {
      const result = calculateProfit({
        soldPrice: 50,
        purchasePrice: 20,
        shippingCost: null,
        shippingCollected: null,
        salesTax: null,
        platformFees: null,
        refundAmount: null,
      });
      // 50 + 0 - 0 - 0 - 0 - 20 - 0 = 30
      expect(result).toBe(30);
    });

    it('calculates profit with refund', () => {
      const result = calculateProfit({
        soldPrice: 100,
        purchasePrice: 30,
        shippingCost: 5,
        shippingCollected: 10,
        salesTax: 8,
        platformFees: 3,
        refundAmount: 25,
      });
      // 100 + 10 - 8 - 3 - 25 - 30 - 5 = 39
      expect(result).toBeCloseTo(39, 2);
    });

    it('can return negative profit (loss)', () => {
      const result = calculateProfit({
        soldPrice: 10,
        purchasePrice: 50,
        shippingCost: 5,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
      });
      // 10 + 0 - 0 - 0 - 0 - 50 - 5 = -45
      expect(result).toBe(-45);
    });

    it('handles zero sold price', () => {
      const result = calculateProfit({
        soldPrice: 0,
        purchasePrice: 30,
        shippingCost: null,
        shippingCollected: null,
        salesTax: null,
        platformFees: null,
        refundAmount: null,
      });
      expect(result).toBe(-30);
    });
  });

  describe('calculateNetRevenue', () => {
    it('calculates net revenue correctly', () => {
      const result = calculateNetRevenue({
        soldPrice: 100,
        purchasePrice: 30,
        shippingCost: 10,
        shippingCollected: 12,
        salesTax: 8.25,
        platformFees: 5,
        refundAmount: 0,
      });
      // 100 + 12 - 8.25 - 5 - 0 = 98.75
      expect(result).toBeCloseTo(98.75, 2);
    });

    it('net revenue excludes purchase price and shipping cost', () => {
      const result = calculateNetRevenue({
        soldPrice: 100,
        purchasePrice: 30,
        shippingCost: 10,
        shippingCollected: 0,
        salesTax: 0,
        platformFees: 0,
        refundAmount: 0,
      });
      // 100 + 0 - 0 - 0 - 0 = 100 (not 60)
      expect(result).toBe(100);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('calculates tax from price including tax', () => {
      // Price of 108.25 includes 8.25 tax at 8.25% rate
      const tax = calculateSalesTaxFromPrice(108.25, 0.0825);
      expect(tax).toBeCloseTo(8.25, 2);
    });

    it('uses default 8.25% rate when not specified', () => {
      const tax = calculateSalesTaxFromPrice(108.25);
      expect(tax).toBeCloseTo(8.25, 2);
    });

    it('handles custom tax rate', () => {
      const tax = calculateSalesTaxFromPrice(110, 0.10);
      expect(tax).toBeCloseTo(10, 2);
    });

    it('returns 0 for zero price', () => {
      const tax = calculateSalesTaxFromPrice(0, 0.0825);
      expect(tax).toBe(0);
    });
  });
});