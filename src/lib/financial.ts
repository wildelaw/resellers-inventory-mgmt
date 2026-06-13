export interface ProfitInput {
  soldPrice: number;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  purchasePrice: number;
  shippingCost: number | null;
}

export function calculateProfit(input: ProfitInput): number {
  return (
    input.soldPrice +
    (input.shippingCollected || 0) -
    (input.salesTax || 0) -
    (input.platformFees || 0) -
    (input.refundAmount || 0) -
    input.purchasePrice -
    (input.shippingCost || 0)
  );
}

export function calculateNetRevenue(input: Omit<ProfitInput, 'purchasePrice' | 'shippingCost'>): number {
  return (
    input.soldPrice +
    (input.shippingCollected || 0) -
    (input.salesTax || 0) -
    (input.platformFees || 0) -
    (input.refundAmount || 0)
  );
}

export function calculateSalesTaxFromPrice(price: number, rate: number = 0.0825): number {
  return price - (price / (1 + rate));
}