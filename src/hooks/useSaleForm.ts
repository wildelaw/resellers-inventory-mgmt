'use client';

import { useState, useCallback, useEffect } from 'react';
import { ALL_PLATFORMS, type SalePlatform } from '@/lib/constants';

export interface SaleFormData {
  itemId?: number | null;
  soldDate: string;
  soldPrice: string;
  shippingCost: string;
  shippingCollected: string;
  platform: SalePlatform;
  salesTax: string;
  platformFees: string;
  refundReason: string;
}

interface UseSaleFormOptions {
  initialData?: Partial<SaleFormData>;
  taxRate?: number;
}

export function useSaleForm(options: UseSaleFormOptions = {}) {
  const { initialData, taxRate = 0.0825 } = options;

  const [formData, setFormData] = useState<SaleFormData>({
    itemId: initialData?.itemId ?? null,
    soldDate: initialData?.soldDate ?? new Date().toISOString().split('T')[0],
    soldPrice: initialData?.soldPrice ?? '',
    shippingCost: initialData?.shippingCost ?? '',
    shippingCollected: initialData?.shippingCollected ?? '',
    platform: initialData?.platform ?? ('local' as SalePlatform),
    salesTax: initialData?.salesTax ?? '',
    platformFees: initialData?.platformFees ?? '',
    refundReason: initialData?.refundReason ?? '',
  });

  const [autoTax, setAutoTax] = useState(!initialData?.salesTax);

  // Auto-calculate sales tax from sold price
  useEffect(() => {
    if (autoTax && formData.soldPrice) {
      const price = parseFloat(formData.soldPrice);
      if (!isNaN(price) && price >= 0) {
        const tax = Math.round(price * taxRate * 100) / 100;
        setFormData((prev) => ({ ...prev, salesTax: tax.toFixed(2) }));
      }
    }
  }, [formData.soldPrice, autoTax, taxRate]);

  const updateField = useCallback(<K extends keyof SaleFormData>(field: K, value: SaleFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setFormData({
      itemId: null,
      soldDate: new Date().toISOString().split('T')[0],
      soldPrice: '',
      shippingCost: '',
      shippingCollected: '',
      platform: 'local' as SalePlatform,
      salesTax: '',
      platformFees: '',
      refundReason: '',
    });
    setAutoTax(true);
  }, []);

  return {
    formData,
    setFormData,
    updateField,
    reset,
    autoTax,
    setAutoTax,
  };
}