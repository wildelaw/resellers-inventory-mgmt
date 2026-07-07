'use client';
import { useState, useMemo, useCallback } from 'react';
import { calculateSalesTaxFromPrice } from '@/lib/financial';

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

const EMPTY: SaleFormData = {
  itemId: '',
  soldDate: new Date().toISOString().slice(0, 10),
  soldPrice: '',
  shippingCost: '',
  shippingCollected: '',
  platform: 'local',
  salesTax: '',
  platformFees: '',
};

export function useSaleForm(initial?: Partial<SaleFormData>, taxRate = 0.0825) {
  const [form, setForm] = useState<SaleFormData>({ ...EMPTY, ...initial });
  const [autoTax, setAutoTax] = useState(true);

  const setField = useCallback((field: keyof SaleFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-calculate sales tax when price changes (if autoTax enabled).
  const effectiveSalesTax = useMemo(() => {
    if (!autoTax) return form.salesTax;
    const price = parseFloat(form.soldPrice);
    if (isNaN(price) || price <= 0) return '';
    return calculateSalesTaxFromPrice(price, taxRate).toFixed(2);
  }, [autoTax, form.soldPrice, form.salesTax, taxRate]);

  const computedTax = parseFloat(effectiveSalesTax) || 0;
  const soldPriceNum = parseFloat(form.soldPrice) || 0;
  const shippingCollectedNum = parseFloat(form.shippingCollected) || 0;
  const platformFeesNum = parseFloat(form.platformFees) || 0;
  const shippingCostNum = parseFloat(form.shippingCost) || 0;
  const netRevenue = soldPriceNum + shippingCollectedNum - computedTax - platformFeesNum - shippingCostNum;

  const reset = useCallback(() => setForm(EMPTY), []);

  return {
    form: { ...form, salesTax: effectiveSalesTax },
    setField,
    autoTax,
    setAutoTax,
    computedTax,
    netRevenue,
    reset,
  };
}
