export interface ProfitInput {
  soldPrice: number;
  shippingCollected?: number | null;
  salesTax?: number | null;
  platformFees?: number | null;
  refundAmount?: number | null;
  purchasePrice: number;
  shippingCost?: number | null;
}

export function calculateProfit(input: ProfitInput): number {
  const shippingCollected = input.shippingCollected ?? 0;
  const salesTax = input.salesTax ?? 0;
  const platformFees = input.platformFees ?? 0;
  const refundAmount = input.refundAmount ?? 0;
  const shippingCost = input.shippingCost ?? 0;

  return (
    input.soldPrice +
    shippingCollected -
    salesTax -
    platformFees -
    refundAmount -
    input.purchasePrice -
    shippingCost
  );
}

export function calculateNetRevenue(input: ProfitInput): number {
  return calculateProfit(input) + input.purchasePrice;
}

export function calculateSalesTaxFromPrice(price: number, rate: number): number {
  if (rate <= 0) return 0;
  return price - price / (1 + rate);
}
