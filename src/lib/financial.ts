import { DEFAULT_SALES_TAX_RATE } from './constants';

/**
 * Single source of truth for the profit formula.
 *
 *   profit = soldPrice + shippingCollected
 *            - salesTax - platformFees - refundAmount
 *            - purchasePrice - shippingCost
 *
 * All nullable fields are coerced to 0. The reports endpoint and any
 * other consumer MUST use this function — there is no duplicate SQL formula.
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
  const soldPrice = Number(sale.soldPrice) || 0;
  const shippingCollected = Number(sale.shippingCollected) || 0;
  const salesTax = Number(sale.salesTax) || 0;
  const platformFees = Number(sale.platformFees) || 0;
  const refundAmount = Number(sale.refundAmount) || 0;
  const purchasePrice = Number(sale.purchasePrice) || 0;
  const shippingCost = Number(sale.shippingCost) || 0;

  return (
    soldPrice +
    shippingCollected -
    salesTax -
    platformFees -
    refundAmount -
    purchasePrice -
    shippingCost
  );
}

/**
 * Net revenue (what the seller keeps before subtracting purchase cost).
 *   netRevenue = soldPrice + shippingCollected - salesTax - platformFees - refundAmount - shippingCost
 */
export function calculateNetRevenue(sale: {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  shippingCost?: number | null;
}): number {
  const soldPrice = Number(sale.soldPrice) || 0;
  const shippingCollected = Number(sale.shippingCollected) || 0;
  const salesTax = Number(sale.salesTax) || 0;
  const platformFees = Number(sale.platformFees) || 0;
  const refundAmount = Number(sale.refundAmount) || 0;
  const shippingCost = Number(sale.shippingCost) || 0;

  return (
    soldPrice +
    shippingCollected -
    salesTax -
    platformFees -
    refundAmount -
    shippingCost
  );
}

/**
 * Compute the sales tax portion embedded in a tax-inclusive price.
 *   tax = price - (price / (1 + rate))
 * Default rate is 8.25% (stored in app_config.sales_tax_rate).
 */
export function calculateSalesTaxFromPrice(
  price: number,
  rate: number = DEFAULT_SALES_TAX_RATE,
): number {
  const p = Number(price) || 0;
  const r = Number(rate) || 0;
  if (r <= 0) return 0;
  return p - p / (1 + r);
}
