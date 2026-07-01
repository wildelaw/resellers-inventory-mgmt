'use client';

import { useState, useEffect } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';
import type { Platform } from '@/lib/constants';

export interface SaleFormState {
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: Platform;
  salesTax: string;
  platformFees: string;
}

export interface UseSaleFormOptions {
  initialData?: Partial<SaleFormState>;
  taxRate?: number;
  autoCalculateTax?: boolean;
}

const today = () => new Date().toISOString().split('T')[0];

const defaultState: SaleFormState = {
  soldDate: today(),
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
};

export function useSaleForm(options: UseSaleFormOptions = {}) {
  const { initialData, taxRate = 0.0825, autoCalculateTax = false } = options;

  const [form, setForm] = useState<SaleFormState>({
    ...defaultState,
    ...initialData,
  });

  // Auto-calculate tax when soldPrice changes, if enabled
  useEffect(() => {
    if (!autoCalculateTax) return;
    const price = parseFloat(form.soldPrice);
    if (!isNaN(price) && price > 0) {
      const tax = calculateSalesTaxFromPrice(price, taxRate);
      setForm(f => ({ ...f, salesTax: tax.toFixed(2) }));
    }
  }, [form.soldPrice, autoCalculateTax, taxRate]);

  const setField = <K extends keyof SaleFormState>(key: K) =>
    (value: SaleFormState[K]) => setForm(f => ({ ...f, [key]: value }));

  const reset = () => setForm({ ...defaultState, ...initialData });

  const toPayload = () => ({
    soldDate: form.soldDate,
    soldPrice: parseFloat(form.soldPrice) || 0,
    shippingCost: form.shippingCost ? parseFloat(form.shippingCost) : undefined,
    shippingCollected: parseFloat(form.shippingCollected) || 0,
    platform: form.platform,
    salesTax: form.salesTax ? parseFloat(form.salesTax) : undefined,
    platformFees: parseFloat(form.platformFees) || 0,
  });

  return {
    form,
    setForm,
    setSoldDate: setField('soldDate'),
    setSoldPrice: setField('soldPrice'),
    setShippingCost: setField('shippingCost'),
    setShippingCollected: setField('shippingCollected'),
    setPlatform: setField('platform'),
    setSalesTax: setField('salesTax'),
    setPlatformFees: setField('platformFees'),
    reset,
    toPayload,
  };
}
