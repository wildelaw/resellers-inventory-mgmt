/**
 * Financial calculations — SINGLE SOURCE OF TRUTH
 * 
 * The profit formula exists ONLY in this module.
 * The reports endpoint uses this function to compute aggregates from raw data.
 * There is no duplicate SQL formula.
 */

export interface ProfitInput {
  soldPrice: number;
  purchasePrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
}

/**
 * Calculate profit for a sale.
 * profit = soldPrice + shippingCollected - salesTax - platformFees - refundAmount - purchasePrice - shippingCost
 */
export function calculateProfit(sale: ProfitInput): number {
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
export function calculateNetRevenue(sale: ProfitInput): number {
  return (
    sale.soldPrice +
    (sale.shippingCollected || 0) -
    (sale.salesTax || 0) -
    (sale.platformFees || 0) -
    (sale.refundAmount || 0)
  );
}

/**
 * Calculate sales tax from a total price that includes tax.
 * taxAmount = price - (price / (1 + rate))
 * E.g., price=108.25, rate=0.0825 → taxAmount=8.25
 */
export function calculateSalesTaxFromPrice(price: number, rate: number = 0.0825): number {
  return price - (price / (1 + rate));
}