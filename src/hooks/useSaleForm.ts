'use client';

import { useState } from 'react';

interface SaleFormData {
  itemId: number | null;
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: string;
  salesTax: string;
  platformFees: string;
}

const initialFormData: SaleFormData = {
  itemId: null,
  soldDate: new Date().toISOString().split('T')[0],
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
};

export function useSaleForm(initialData?: Partial<SaleFormData>) {
  const [formData, setFormData] = useState<SaleFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [autoCalculateTax, setAutoCalculateTax] = useState(true);
  const [taxRate, setTaxRate] = useState(0.0825);

  const updateField = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (autoCalculateTax && field === 'soldPrice' && value) {
        const price = parseFloat(value) || 0;
        const tax = price - (price / (1 + taxRate));
        updated.salesTax = tax.toFixed(2);
      }
      return updated;
    });
  };

  const reset = () => setFormData(initialFormData);

  return {
    formData,
    updateField,
    autoCalculateTax,
    setAutoCalculateTax,
    taxRate,
    setTaxRate,
    reset,
  };
}