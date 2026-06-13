'use client';

import { useState, useEffect } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';

interface SaleFormState {
  soldPrice: string;
  platform: string;
  shippingCost: string;
  shippingCollected: string;
  salesTax: string;
  platformFees: string;
  soldDate: string;
  itemId: string;
}

export function useSaleForm(initialData?: Partial<SaleFormState>, taxRate: number = 0.0825) {
  const [form, setForm] = useState<SaleFormState>({
    soldPrice: initialData?.soldPrice ?? '',
    platform: initialData?.platform ?? 'local',
    shippingCost: initialData?.shippingCost ?? '',
    shippingCollected: initialData?.shippingCollected ?? '',
    salesTax: initialData?.salesTax ?? '',
    platformFees: initialData?.platformFees ?? '',
    soldDate: initialData?.soldDate ?? new Date().toISOString().split('T')[0],
    itemId: initialData?.itemId ?? '',
  });

  const [autoCalculateTax, setAutoCalculateTax] = useState(false);

  useEffect(() => {
    if (autoCalculateTax && form.soldPrice) {
      const price = parseFloat(form.soldPrice);
      if (!isNaN(price)) {
        const tax = calculateSalesTaxFromPrice(price, taxRate);
        setForm(prev => ({ ...prev, salesTax: tax.toFixed(2) }));
      }
    }
  }, [autoCalculateTax, form.soldPrice, taxRate]);

  const updateField = (field: keyof SaleFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getSubmitData = () => ({
    soldPrice: parseFloat(form.soldPrice) || 0,
    platform: form.platform,
    shippingCost: form.shippingCost ? parseFloat(form.shippingCost) : null,
    shippingCollected: form.shippingCollected ? parseFloat(form.shippingCollected) : 0,
    salesTax: form.salesTax ? parseFloat(form.salesTax) : null,
    platformFees: form.platformFees ? parseFloat(form.platformFees) : 0,
    soldDate: Math.floor(new Date(form.soldDate).getTime() / 1000),
    itemId: form.itemId ? parseInt(form.itemId) : undefined,
  });

  return { form, updateField, getSubmitData, autoCalculateTax, setAutoCalculateTax };
}