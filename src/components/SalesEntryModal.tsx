'use client';

import { useState, useEffect } from 'react';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from './SaleFormFields';

interface SalesEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id?: number;
    itemId?: number | null;
    soldDate?: string;
    soldPrice?: string;
    shippingCost?: string;
    shippingCollected?: string;
    platform?: string;
    salesTax?: string;
    platformFees?: string;
  };
  taxRate?: number;
}

export default function SalesEntryModal({ open, onClose, onSuccess, initialData, taxRate }: SalesEntryModalProps) {
  const { formData, updateField, autoTax, setAutoTax, reset } = useSaleForm({
    initialData: initialData ? {
      itemId: initialData.itemId,
      soldDate: initialData.soldDate,
      soldPrice: initialData.soldPrice,
      shippingCost: initialData.shippingCost,
      shippingCollected: initialData.shippingCollected,
      platform: initialData.platform as never,
      salesTax: initialData.salesTax,
      platformFees: initialData.platformFees,
    } : undefined,
    taxRate,
  });
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/api/inventory?status=available&status=listed&pageSize=100')
        .then((r) => r.json())
        .then((d) => setItems(d.items?.map((i: { id: number; name: string }) => ({ id: i.id, name: i.name })) || []))
        .catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        itemId: formData.itemId || null,
        soldPrice: parseFloat(formData.soldPrice) || 0,
        shippingCost: formData.shippingCost ? parseFloat(formData.shippingCost) : null,
        shippingCollected: formData.shippingCollected ? parseFloat(formData.shippingCollected) : 0,
        salesTax: formData.salesTax ? parseFloat(formData.salesTax) : null,
        platformFees: formData.platformFees ? parseFloat(formData.platformFees) : 0,
      };

      const url = initialData?.id ? `/api/sales/${initialData.id}` : '/api/sales';
      const method = initialData?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save sale');
      }

      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{initialData?.id ? 'Edit Sale' : 'Record Sale'}</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item (optional)</label>
            <select
              value={formData.itemId || ''}
              onChange={(e) => updateField('itemId', e.target.value ? parseInt(e.target.value, 10) : null)}
              className="input-field"
            >
              <option value="">No linked item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <SaleFormFields
            soldDate={formData.soldDate}
            soldPrice={formData.soldPrice}
            shippingCost={formData.shippingCost}
            shippingCollected={formData.shippingCollected}
            platform={formData.platform}
            salesTax={formData.salesTax}
            platformFees={formData.platformFees}
            autoTax={autoTax}
            onChange={(field, value) => updateField(field as never, value as never)}
            onAutoTaxChange={setAutoTax}
          />
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : initialData?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}