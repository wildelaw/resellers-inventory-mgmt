'use client';

import { useState, useCallback, useMemo } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';
import { PLATFORMS } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

export interface SaleFormState {
  itemId: string;
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: Platform;
  salesTax: string;
  platformFees: string;
  autoTax: boolean;
}

export interface SaleFormInitial {
  itemId?: number | null;
  soldDate?: number;
  soldPrice?: number | string;
  shippingCost?: number | string | null;
  shippingCollected?: number | string | null;
  platform?: Platform;
  salesTax?: number | string | null;
  platformFees?: number | string | null;
}

function toInputDate(ts?: number): string {
  if (!ts) return new Date().toISOString().slice(0, 10);
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function useSaleForm(initial?: SaleFormInitial, defaultTaxRate = 0.0825) {
  const [state, setState] = useState<SaleFormState>({
    itemId: initial?.itemId ? String(initial.itemId) : '',
    soldDate: toInputDate(initial?.soldDate),
    soldPrice: initial?.soldPrice != null ? String(initial.soldPrice) : '',
    shippingCost: initial?.shippingCost != null ? String(initial.shippingCost) : '',
    shippingCollected: initial?.shippingCollected != null ? String(initial.shippingCollected) : '',
    platform: (initial?.platform as Platform) || 'local',
    salesTax: initial?.salesTax != null ? String(initial.salesTax) : '',
    platformFees: initial?.platformFees != null ? String(initial.platformFees) : '',
    autoTax: initial?.salesTax == null,
  });

  const setField = useCallback(<K extends keyof SaleFormState>(key: K, value: SaleFormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  // Auto-calculate sales tax when soldPrice changes and autoTax is on.
  const computedTax = useMemo(() => {
    if (!state.autoTax) return state.salesTax;
    const price = parseFloat(state.soldPrice);
    if (!Number.isFinite(price) || price <= 0) return '';
    return calculateSalesTaxFromPrice(price, defaultTaxRate).toFixed(2);
  }, [state.autoTax, state.soldPrice, state.salesTax, defaultTaxRate]);

  const toggleAutoTax = useCallback(() => {
    setState((s) => ({ ...s, autoTax: !s.autoTax }));
  }, []);

  const reset = useCallback(() => {
    setState({
      itemId: '', soldDate: toInputDate(), soldPrice: '', shippingCost: '',
      shippingCollected: '', platform: 'local', salesTax: '', platformFees: '', autoTax: true,
    });
  }, []);

  return { state, setField, computedTax, toggleAutoTax, reset, platforms: PLATFORMS };
}