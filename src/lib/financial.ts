/**
 * Financial calculations — the SINGLE SOURCE OF TRUTH for the profit formula.
 *
 * No SQL duplicate of this formula exists anywhere in the codebase. The reports
 * endpoint fetches raw sale rows and computes aggregates using these functions.
 */

/** Input shape for profit calculation (subset of a sale row + its item's purchase price). */
export interface ProfitInput {
  soldPrice: number;
  shippingCollected: number | null | undefined;
  salesTax: number | null | undefined;
  platformFees: number | null | undefined;
  refundAmount: number | null | undefined;
  purchasePrice: number | null | undefined;
  shippingCost: number | null | undefined;
}

const num = (v: number | null | undefined): number =>
  v === null || v === undefined || Number.isNaN(v) ? 0 : Number(v);

/**
 * profit = soldPrice + shippingCollected
 *        - salesTax - platformFees - refundAmount
 *        - purchasePrice - shippingCost
 */
export function calculateProfit(input: ProfitInput): number {
  return (
    num(input.soldPrice) +
    num(input.shippingCollected) -
    num(input.salesTax) -
    num(input.platformFees) -
    num(input.refundAmount) -
    num(input.purchasePrice) -
    num(input.shippingCost)
  );
}

/** Net revenue = soldPrice + shippingCollected - salesTax - refundAmount (excludes costs). */
export function calculateNetRevenue(input: ProfitInput): number {
  return (
    num(input.soldPrice) +
    num(input.shippingCollected) -
    num(input.salesTax) -
    num(input.refundAmount)
  );
}

/** Gross sold price + shipping collected (top-line). */
export function calculateGrossRevenue(input: ProfitInput): number {
  return num(input.soldPrice) + num(input.shippingCollected);
}

/**
 * Back-out sales tax from a tax-inclusive price.
 *   tax = price - (price / (1 + rate))
 * Default rate 0.0825 (8.25%).
 */
export function calculateSalesTaxFromPrice(price: number, rate = 0.0825): number {
  const p = num(price);
  const r = num(rate);
  if (r <= 0) return 0;
  return p - p / (1 + r);
}

/** Total cost basis (purchase + shipping paid), used in reports. */
export function calculateTotalCost(input: ProfitInput): number {
  return num(input.purchasePrice) + num(input.shippingCost);
}