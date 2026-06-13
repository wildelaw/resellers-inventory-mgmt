'use client';

import { useState } from 'react';
import SaleFormFields from './SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';
import type { Platform } from '@/lib/constants';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  items?: { id: number; name: string }[];
  initialData?: Record<string, unknown>;
}

export default function SalesEntryModal({
  isOpen,
  onClose,
  onSave,
  items,
  initialData,
}: SalesEntryModalProps) {
  const { formData, updateField, reset, getSubmitData } = useSaleForm(
    initialData
      ? {
          itemId: (initialData.itemId as number) || null,
          soldDate: initialData.soldDate
            ? new Date((initialData.soldDate as number) * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          soldPrice: String(initialData.soldPrice || ''),
          shippingCost: String(initialData.shippingCost || ''),
          shippingCollected: String(initialData.shippingCollected || ''),
          platform: (initialData.platform as Platform) || '',
          salesTax: String(initialData.salesTax || ''),
          platformFees: String(initialData.platformFees || ''),
        }
      : undefined
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = getSubmitData();
      await onSave(data);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initialData ? 'Edit Sale' : 'Record Sale'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <SaleFormFields
            formData={formData}
            onChange={(field, value) => updateField(field as keyof typeof formData, value)}
            items={items}
            itemId={formData.itemId}
            onItemChange={(value) => updateField('itemId', value ? parseInt(value) : null)}
          />

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialData ? 'Update Sale' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}