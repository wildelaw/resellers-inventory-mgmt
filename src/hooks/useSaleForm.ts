'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';

export interface SaleFormState {
  itemId: string;
  soldDate: string;          // YYYY-MM-DD
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: string;
  salesTax: string;
  platformFees: string;
  notes: string;
  applyTaxAuto: boolean;
}

export const EMPTY_SALE: SaleFormState = {
  itemId: '',
  soldDate: new Date().toISOString().slice(0, 10),
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
  notes: '',
  applyTaxAuto: true,
};

export function useSaleForm(initial?: Partial<SaleFormState>, taxRate = 0.0825) {
  const [state, setState] = useState<SaleFormState>({ ...EMPTY_SALE, ...initial });

  const update = useCallback((key: keyof SaleFormState, value: string | boolean) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  // Auto-compute sales tax when soldPrice changes (if enabled)
  const computedTax = useMemo(() => {
    if (!state.applyTaxAuto) return null;
    const price = Number(state.soldPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    return calculateSalesTaxFromPrice(price, taxRate);
  }, [state.applyTaxAuto, state.soldPrice, taxRate]);

  useEffect(() => {
    if (computedTax !== null) {
      setState((s) => ({ ...s, salesTax: computedTax.toFixed(2) }));
    }
  }, [computedTax]);

  const reset = useCallback(() => setState({ ...EMPTY_SALE, ...initial }), [initial]);

  return { state, update, reset, setState };
}