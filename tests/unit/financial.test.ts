import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice } from '@/lib/financial';

describe('Financial calculations', () => {
  describe('calculateProfit', () => {
    it('calculates profit with all values provided', () => {
      expect(calculateProfit({
        soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
        platformFees: 5, refundAmount: 0, purchasePrice: 25, shippingCost: 5
      })).toBeCloseTo(66.75);
    });

    it('handles null optional values as zero', () => {
      expect(calculateProfit({
        soldPrice: 50, shippingCollected: null, salesTax: null,
        platformFees: null, refundAmount: null, purchasePrice: 20, shippingCost: null
      })).toBe(30);
    });

    it('returns negative profit when purchase price exceeds revenue', () => {
      expect(calculateProfit({
        soldPrice: 10, shippingCollected: 0, salesTax: 0,
        platformFees: 0, refundAmount: 0, purchasePrice: 50, shippingCost: 0
      })).toBe(-40);
    });

    it('subtracts refund amount from profit', () => {
      const withRefund = calculateProfit({
        soldPrice: 100, shippingCollected: 5, salesTax: 5,
        platformFees: 10, refundAmount: 20, purchasePrice: 30, shippingCost: 5
      });
      const withoutRefund = calculateProfit({
        soldPrice: 100, shippingCollected: 5, salesTax: 5,
        platformFees: 10, refundAmount: 0, purchasePrice: 30, shippingCost: 5
      });
      expect(withoutRefund - withRefund).toBe(20);
    });
  });

  describe('calculateNetRevenue', () => {
    it('calculates net revenue without purchase price and shipping cost', () => {
      expect(calculateNetRevenue({
        soldPrice: 100, shippingCollected: 10, salesTax: 8.25,
        platformFees: 5, refundAmount: 0
      })).toBeCloseTo(96.75);
    });

    it('handles null optional values', () => {
      expect(calculateNetRevenue({
        soldPrice: 50, shippingCollected: null, salesTax: null,
        platformFees: null, refundAmount: null
      })).toBe(50);
    });
  });

  describe('calculateSalesTaxFromPrice', () => {
    it('calculates tax from a price that includes tax', () => {
      expect(calculateSalesTaxFromPrice(108.25, 0.0825)).toBeCloseTo(8.25, 1);
    });

    it('uses default rate of 8.25%', () => {
      expect(calculateSalesTaxFromPrice(100)).toBeCloseTo(7.62, 1);
    });

    it('returns 0 for price of 0', () => {
      expect(calculateSalesTaxFromPrice(0)).toBe(0);
    });
  });
});