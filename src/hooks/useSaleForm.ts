'use client';

import { useState, useCallback } from 'react';

export interface SaleFormData {
  itemId: string;
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: string;
  salesTax: string;
  platformFees: string;
}

const EMPTY_FORM: SaleFormData = {
  itemId: '',
  soldDate: new Date().toISOString().slice(0, 10),
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
};

/**
 * Sale form state with auto-tax calculation.
 * When no explicit salesTax is entered, tax is auto-derived from the sold
 * price using the configured rate: tax = price - (price / (1 + rate)).
 */
export function useSaleForm(initial?: Partial<SaleFormData>) {
  const [form, setForm] = useState<SaleFormData>({ ...EMPTY_FORM, ...initial });
  const [taxRate, setTaxRate] = useState(0.0825);

  const update = useCallback((field: keyof SaleFormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-tax calculation from the sold price
      if (field === 'soldPrice' && value) {
        const price = parseFloat(value);
        if (!isNaN(price) && price > 0) {
          const tax = price - price / (1 + taxRate);
          if (tax > 0) {
            next.salesTax = tax.toFixed(2);
          }
        }
      }
      return next;
    });
  }, [taxRate]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.sales_tax_rate === 'number') setTaxRate(data.sales_tax_rate);
      }
    } catch {
      // keep default rate
    }
  }, []);

  const reset = useCallback(() => setForm({ ...EMPTY_FORM }), []);

  return { form, update, reset, taxRate, loadSettings };
}