'use client';

import { useState, useCallback } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';
import { DEFAULT_SALES_TAX_RATE } from '@/lib/constants';
import type { Platform } from '@/lib/constants';

export interface SaleFormData {
  itemId: number | null;
  soldDate: string; // ISO date string for form input
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: Platform | '';
  salesTax: string;
  platformFees: string;
}

const initialFormData: SaleFormData = {
  itemId: null,
  soldDate: new Date().toISOString().split('T')[0],
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: '',
  salesTax: '',
  platformFees: '',
};

export function useSaleForm(initialData?: Partial<SaleFormData>) {
  const [formData, setFormData] = useState<SaleFormData>({
    ...initialFormData,
    ...initialData,
  });

  const [autoCalculateTax, setAutoCalculateTax] = useState(true);

  const updateField = useCallback((field: keyof SaleFormData, value: string | number | null) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate sales tax when price changes
      if (autoCalculateTax && (field === 'soldPrice' || field === 'shippingCollected')) {
        const price = parseFloat(updated.soldPrice) || 0;
        const shippingCollected = parseFloat(updated.shippingCollected) || 0;
        if (price > 0) {
          updated.salesTax = calculateSalesTaxFromPrice(price + shippingCollected, DEFAULT_SALES_TAX_RATE).toFixed(2);
        }
      }

      return updated;
    });
  }, [autoCalculateTax]);

  const reset = useCallback(() => {
    setFormData(initialFormData);
    setAutoCalculateTax(true);
  }, []);

  const getSubmitData = useCallback(() => ({
    itemId: formData.itemId,
    soldDate: Math.floor(new Date(formData.soldDate).getTime() / 1000),
    soldPrice: parseFloat(formData.soldPrice) || 0,
    shippingCost: formData.shippingCost ? parseFloat(formData.shippingCost) : null,
    shippingCollected: formData.shippingCollected ? parseFloat(formData.shippingCollected) : null,
    platform: formData.platform,
    salesTax: formData.salesTax ? parseFloat(formData.salesTax) : null,
    platformFees: formData.platformFees ? parseFloat(formData.platformFees) : null,
  }), [formData]);

  return {
    formData,
    updateField,
    reset,
    getSubmitData,
    autoCalculateTax,
    setAutoCalculateTax,
  };
}