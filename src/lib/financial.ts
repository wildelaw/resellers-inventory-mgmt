import { DEFAULT_SALES_TAX_RATE } from './constants';
import type { Sale, Item } from './schema';

export interface ProfitInput {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  purchasePrice: number;
  shippingCost?: number | null;
}

/**
 * Calculate profit for a sale.
 * This is the SINGLE SOURCE OF TRUTH for the profit formula.
 * No duplicate SQL formula exists.
 *
 * profit = soldPrice + shippingCollected - salesTax - platformFees
 *          - refundAmount - purchasePrice - shippingCost
 */
export function calculateProfit(input: ProfitInput): number {
  const soldPrice = Number(input.soldPrice) || 0;
  const shippingCollected = Number(input.shippingCollected) || 0;
  const salesTax = Number(input.salesTax) || 0;
  const platformFees = Number(input.platformFees) || 0;
  const refundAmount = Number(input.refundAmount) || 0;
  const purchasePrice = Number(input.purchasePrice) || 0;
  const shippingCost = Number(input.shippingCost) || 0;

  return soldPrice + shippingCollected - salesTax - platformFees - refundAmount - purchasePrice - shippingCost;
}

/**
 * Calculate net revenue (before cost of goods sold).
 * netRevenue = soldPrice + shippingCollected - salesTax - platformFees - refundAmount
 */
export function calculateNetRevenue(input: Pick<ProfitInput, 'soldPrice' | 'shippingCollected' | 'salesTax' | 'platformFees' | 'refundAmount'>): number {
  const soldPrice = Number(input.soldPrice) || 0;
  const shippingCollected = Number(input.shippingCollected) || 0;
  const salesTax = Number(input.salesTax) || 0;
  const platformFees = Number(input.platformFees) || 0;
  const refundAmount = Number(input.refundAmount) || 0;

  return soldPrice + shippingCollected - salesTax - platformFees - refundAmount;
}

/**
 * Calculate sales tax from a price using tax-inclusive pricing.
 * tax = price - (price / (1 + rate))
 * Default rate: 0.0825 (8.25%)
 */
export function calculateSalesTaxFromPrice(price: number, rate: number = DEFAULT_SALES_TAX_RATE): number {
  const p = Number(price) || 0;
  if (p <= 0 || rate <= 0) return 0;
  return p - (p / (1 + rate));
}

/**
 * Calculate profit from a Sale record and its associated Item.
 */
export function calculateProfitFromSale(sale: Sale, item: Pick<Item, 'purchasePrice'> | null): number {
  return calculateProfit({
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    purchasePrice: item?.purchasePrice ?? 0,
    shippingCost: sale.shippingCost,
  });
}