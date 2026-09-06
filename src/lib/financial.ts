/**
 * Single source of truth for financial calculations.
 *
 * The profit formula exists ONLY here — there is deliberately no duplicate SQL
 * implementation. Reports endpoints fetch raw sale rows and compute aggregates
 * in TypeScript using these functions.
 */

export interface ProfitInputs {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  purchasePrice: number;
  shippingCost?: number | null;
}

/**
 * profit = (soldPrice + shippingCollected)
 *        - salesTax - platformFees - refundAmount
 *        - purchasePrice - shippingCost
 */
export function calculateProfit(sale: ProfitInputs): number {
  return (sale.soldPrice + (sale.shippingCollected || 0))
    - (sale.salesTax || 0)
    - (sale.platformFees || 0)
    - (sale.refundAmount || 0)
    - sale.purchasePrice
    - (sale.shippingCost || 0);
}

/** Net revenue: what actually landed in the account after tax/fees/refunds. */
export function calculateNetRevenue(sale: Pick<ProfitInputs, 'soldPrice' | 'shippingCollected' | 'salesTax' | 'platformFees' | 'refundAmount'>): number {
  return (sale.soldPrice + (sale.shippingCollected || 0))
    - (sale.salesTax || 0)
    - (sale.platformFees || 0)
    - (sale.refundAmount || 0);
}

/**
 * Sales tax extracted from a tax-inclusive price:
 * tax = price - (price / (1 + rate))
 */
export function calculateSalesTaxFromPrice(price: number, rate: number): number {
  if (rate <= 0) return 0;
  return price - (price / (1 + rate));
}