import type { Sale, Item } from './schema';

/**
 * Calculate profit for a sale.
 * Single source of truth — no duplicate SQL formula exists.
 *
 * profit = soldPrice + shippingCollected - salesTax - platformFees - refundAmount - purchasePrice - shippingCost
 */
export function calculateProfit(sale: {
  soldPrice: number;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  purchasePrice: number;
  shippingCost: number | null;
}): number {
  return (
    sale.soldPrice +
    (sale.shippingCollected || 0) -
    (sale.salesTax || 0) -
    (sale.platformFees || 0) -
    (sale.refundAmount || 0) -
    sale.purchasePrice -
    (sale.shippingCost || 0)
  );
}

/**
 * Calculate net revenue (before subtracting purchase price and shipping cost).
 * netRevenue = soldPrice + shippingCollected - salesTax - platformFees - refundAmount
 */
export function calculateNetRevenue(sale: {
  soldPrice: number;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
}): number {
  return (
    sale.soldPrice +
    (sale.shippingCollected || 0) -
    (sale.salesTax || 0) -
    (sale.platformFees || 0) -
    (sale.refundAmount || 0)
  );
}

/**
 * Calculate sales tax from a price that includes tax.
 * taxAmount = price - (price / (1 + rate))
 * Default rate: 0.0825 (8.25%)
 */
export function calculateSalesTaxFromPrice(price: number, rate: number = 0.0825): number {
  return price - price / (1 + rate);
}