import type { Sale } from './schema';

/**
 * Calculate profit for a sale.
 * This is the SINGLE SOURCE OF TRUTH for profit calculation.
 * 
 * Formula:
 * profit = (soldPrice + shippingCollected) - salesTax - platformFees - refundAmount - purchasePrice - shippingCost
 */
export function calculateProfit(sale: {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  purchasePrice: number;
  shippingCost?: number | null;
}): number {
  const revenue = sale.soldPrice + (sale.shippingCollected || 0);
  const costs = 
    (sale.salesTax || 0) +
    (sale.platformFees || 0) +
    (sale.refundAmount || 0) +
    sale.purchasePrice +
    (sale.shippingCost || 0);
  
  return revenue - costs;
}

/**
 * Calculate net revenue (revenue after taxes and fees, before costs)
 */
export function calculateNetRevenue(sale: {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
}): number {
  const grossRevenue = sale.soldPrice + (sale.shippingCollected || 0);
  const deductions = 
    (sale.salesTax || 0) +
    (sale.platformFees || 0) +
    (sale.refundAmount || 0);
  
  return grossRevenue - deductions;
}

/**
 * Calculate sales tax from a price that includes tax
 * Formula: tax = price - (price / (1 + rate))
 * 
 * Example: If price is $108.25 and rate is 0.0825 (8.25%):
 * tax = 108.25 - (108.25 / 1.0825) = 108.25 - 100 = 8.25
 */
export function calculateSalesTaxFromPrice(priceWithTax: number, taxRate: number): number {
  if (taxRate <= 0) return 0;
  return priceWithTax - (priceWithTax / (1 + taxRate));
}

/**
 * Calculate sales tax to add to a price
 * Formula: tax = price * rate
 */
export function calculateSalesTaxToAdd(priceWithoutTax: number, taxRate: number): number {
  if (taxRate <= 0) return 0;
  return priceWithoutTax * taxRate;
}

/**
 * Calculate price including tax
 */
export function calculatePriceWithTax(priceWithoutTax: number, taxRate: number): number {
  return priceWithoutTax * (1 + taxRate);
}
