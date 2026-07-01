import { DEFAULT_SALES_TAX_RATE } from './constants';

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
 * Single source of truth for profit calculation.
 * profit = soldPrice + shippingCollected - salesTax - platformFees - refundAmount - purchasePrice - shippingCost
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
 * Net revenue = soldPrice + shippingCollected - salesTax - platformFees - refundAmount
 * (excludes cost of goods and shipping cost)
 */
export function calculateNetRevenue(input: Omit<ProfitInput, 'purchasePrice' | 'shippingCost'>): number {
  const soldPrice = Number(input.soldPrice) || 0;
  const shippingCollected = Number(input.shippingCollected) || 0;
  const salesTax = Number(input.salesTax) || 0;
  const platformFees = Number(input.platformFees) || 0;
  const refundAmount = Number(input.refundAmount) || 0;

  return soldPrice + shippingCollected - salesTax - platformFees - refundAmount;
}

/**
 * Calculate sales tax from a price using the given rate.
 */
export function calculateSalesTaxFromPrice(price: number, rate: number = DEFAULT_SALES_TAX_RATE): number {
  const p = Number(price) || 0;
  const r = Number(rate) || 0;
  return Math.round(p * r * 100) / 100;
}