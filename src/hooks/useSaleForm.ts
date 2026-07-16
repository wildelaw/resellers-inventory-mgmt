"use client";
import { useEffect, useState } from "react";

export interface SaleFormState {
  soldPrice: string;
  platform: string;
  shippingCost: string;
  shippingCollected: string;
  salesTax: string;
  platformFees: string;
  purchasePrice: string;
  taxRate: number;
}

export interface UseSaleFormResult {
  state: SaleFormState;
  setField: <K extends keyof SaleFormState>(
    field: K,
    value: SaleFormState[K]
  ) => void;
  setTaxRate: (rate: number) => void;
  computedSalesTax: number;
  computedTotal: number;
}

export function useSaleForm(initial?: Partial<SaleFormState>): UseSaleFormResult {
  const [state, setState] = useState<SaleFormState>({
    soldPrice: initial?.soldPrice ?? "",
    platform: initial?.platform ?? "local",
    shippingCost: initial?.shippingCost ?? "0",
    shippingCollected: initial?.shippingCollected ?? "0",
    salesTax: initial?.salesTax ?? "",
    platformFees: initial?.platformFees ?? "0",
    purchasePrice: initial?.purchasePrice ?? "0",
    taxRate: initial?.taxRate ?? 0.0825,
  });

  const [computedSalesTax, setComputedSalesTax] = useState(0);
  const [computedTotal, setComputedTotal] = useState(0);

  const setField = <K extends keyof SaleFormState>(
    field: K,
    value: SaleFormState[K]
  ) => {
    setState((s) => ({ ...s, [field]: value }));
  };

  const setTaxRate = (rate: number) => {
    setState((s) => ({ ...s, taxRate: rate }));
  };

  useEffect(() => {
    const price = parseFloat(state.soldPrice) || 0;
    const tax = state.taxRate > 0 ? price - price / (1 + state.taxRate) : 0;
    setComputedSalesTax(parseFloat(tax.toFixed(2)));
    const total =
      price +
      (parseFloat(state.shippingCollected) || 0) -
      (parseFloat(state.platformFees) || 0);
    setComputedTotal(parseFloat(total.toFixed(2)));
  }, [
    state.soldPrice,
    state.shippingCollected,
    state.platformFees,
    state.taxRate,
  ]);

  return {
    state,
    setField,
    setTaxRate,
    computedSalesTax,
    computedTotal,
  };
}
