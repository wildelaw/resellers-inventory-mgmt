import { DEFAULT_SALES_TAX_RATE } from './constants';

// A sale-shaped input for profit calculation. Uses camelCase to match the
// Drizzle inferred Sale type, but is loose enough for raw rows too.
export interface ProfitInput {
  soldPrice: number;
  shippingCollected: number | null | undefined;
  salesTax: number | null | undefined;
  platformFees: number | null | undefined;
  refundAmount: number | null | undefined;
  shippingCost: number | null | undefined;
  purchasePrice: number | null | undefined;
}

// A wider variant used by reports where the sale row is joined with its item.
export function toProfitInput(sale: {
  soldPrice: number;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  shippingCost: number | null;
  item?: { purchasePrice: number | null } | null;
  purchasePrice?: number | null;
}): ProfitInput {
  const purchasePrice = sale.item?.purchasePrice ?? sale.purchasePrice ?? 0;
  return {
    soldPrice: sale.soldPrice,
    shippingCollected: sale.shippingCollected,
    salesTax: sale.salesTax,
    platformFees: sale.platformFees,
    refundAmount: sale.refundAmount,
    shippingCost: sale.shippingCost,
    purchasePrice,
  };
}

/**
 * The single source of truth for profit.
 * profit = soldPrice + shippingCollected - salesTax - platformFees
 *          - refundAmount - purchasePrice - shippingCost
 */
export function calculateProfit(input: ProfitInput): number {
  const soldPrice = numOr(input.soldPrice, 0);
  const shippingCollected = numOr(input.shippingCollected, 0);
  const salesTax = numOr(input.salesTax, 0);
  const platformFees = numOr(input.platformFees, 0);
  const refundAmount = numOr(input.refundAmount, 0);
  const purchasePrice = numOr(input.purchasePrice, 0);
  const shippingCost = numOr(input.shippingCost, 0);
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

/** Net revenue = soldPrice + shippingCollected - refundAmount */
export function calculateNetRevenue(input: {
  soldPrice: number;
  shippingCollected: number | null | undefined;
  refundAmount: number | null | undefined;
}): number {
  return numOr(input.soldPrice, 0) + numOr(input.shippingCollected, 0) - numOr(input.refundAmount, 0);
}

/**
 * Sales tax extracted from a tax-inclusive price.
 * tax = price - (price / (1 + rate))
 */
export function calculateSalesTaxFromPrice(price: number, rate: number = DEFAULT_SALES_TAX_RATE): number {
  const p = numOr(price, 0);
  const r = numOr(rate, 0);
  if (p <= 0 || r <= 0) return 0;
  return p - p / (1 + r);
}

function numOr<T extends number>(v: T | null | undefined, fallback: number): number {
  if (v === null || v === undefined || Number.isNaN(v)) return fallback;
  return v;
}