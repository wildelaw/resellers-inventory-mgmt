'use client';

import { useState, useCallback } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';
import { DEFAULT_SALES_TAX_RATE } from '@/lib/constants';
import { type Platform } from '@/lib/constants';

export interface SaleFormData {
  itemId?: number | null;
  itemName?: string;
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: Platform;
  salesTax: string;
  platformFees: string;
}

const emptyForm: SaleFormData = {
  itemId: null,
  itemName: '',
  soldDate: new Date().toISOString().split('T')[0],
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
};

export function useSaleForm(initialData?: Partial<SaleFormData>, taxRate?: number) {
  const [formData, setFormData] = useState<SaleFormData>({
    ...emptyForm,
    ...initialData,
  });

  const updateField = useCallback((field: keyof SaleFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const autoCalculateTax = useCallback(() => {
    setFormData(prev => {
      const price = Number(prev.soldPrice);
      if (price > 0 && !prev.salesTax) {
        const rate = taxRate ?? DEFAULT_SALES_TAX_RATE;
        return { ...prev, salesTax: calculateSalesTaxFromPrice(price, rate).toFixed(2) };
      }
      return prev;
    });
  }, [taxRate]);

  const reset = useCallback(() => {
    setFormData(emptyForm);
  }, []);

  return {
    formData,
    updateField,
    autoCalculateTax,
    reset,
    setFormData,
  };
}