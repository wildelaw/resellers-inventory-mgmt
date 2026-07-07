'use client';

import { useState, useEffect } from 'react';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from './SaleFormFields';

interface SalesEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemId?: number;
  itemName?: string;
  saleId?: number;
  initialData?: any;
}

export default function SalesEntryModal({ open, onClose, onSuccess, itemId, itemName, saleId, initialData }: SalesEntryModalProps) {
  const { formData, updateField, autoCalculateTax } = useSaleForm(
    initialData ? {
      itemId: initialData.itemId,
      soldDate: initialData.soldDate ? new Date(initialData.soldDate * 1000).toISOString().split('T')[0] : undefined,
      soldPrice: String(initialData.soldPrice ?? ''),
      shippingCost: String(initialData.shippingCost ?? ''),
      shippingCollected: String(initialData.shippingCollected ?? ''),
      platform: initialData.platform,
      salesTax: String(initialData.salesTax ?? ''),
      platformFees: String(initialData.platformFees ?? ''),
    } : { itemId, itemName }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        itemId: formData.itemId || null,
        soldDate: formData.soldDate,
        soldPrice: Number(formData.soldPrice),
        shippingCost: formData.shippingCost ? Number(formData.shippingCost) : null,
        shippingCollected: Number(formData.shippingCollected) || 0,
        platform: formData.platform,
        salesTax: formData.salesTax ? Number(formData.salesTax) : null,
        platformFees: Number(formData.platformFees) || 0,
      };

      const url = saleId ? `/api/sales/${saleId}` : '/api/sales';
      const method = saleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save sale');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {saleId ? 'Edit Sale' : 'Record New Sale'}
        </h2>

        {itemName && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <span className="text-sm text-gray-600 dark:text-gray-300">Item: </span>
            <span className="font-medium text-gray-900 dark:text-white">{itemName}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SaleFormFields
            formData={formData}
            updateField={updateField}
            onAutoTax={autoCalculateTax}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : saleId ? 'Update Sale' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}