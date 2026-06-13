'use client';

import { useState } from 'react';
import SaleFormFields from './SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemId?: number;
}

export default function SalesEntryModal({ isOpen, onClose, onSaved, itemId }: SalesEntryModalProps) {
  const { formData, updateField, reset } = useSaleForm(itemId ? { itemId } : undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          itemId: formData.itemId || null,
          soldPrice: parseFloat(formData.soldPrice) || 0,
          shippingCost: formData.shippingCost ? parseFloat(formData.shippingCost) : null,
          shippingCollected: formData.shippingCollected ? parseFloat(formData.shippingCollected) : null,
          salesTax: formData.salesTax ? parseFloat(formData.salesTax) : null,
          platformFees: formData.platformFees ? parseFloat(formData.platformFees) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create sale');
      }

      reset();
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Record Sale</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <SaleFormFields formData={formData} updateField={(field, value) => updateField(field as keyof typeof formData, value)} />
          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{loading ? 'Saving...' : 'Record Sale'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}