'use client';
import { useState } from 'react';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from './SaleFormFields';

interface SalesEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items?: { id: number; name: string }[];
}

export default function SalesEntryModal({ open, onClose, onSuccess, items = [] }: SalesEntryModalProps) {
  const { form, setField, autoTax, setAutoTax, netRevenue, reset } = useSaleForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: form.itemId ? Number(form.itemId) : null,
          soldDate: form.soldDate,
          soldPrice: form.soldPrice,
          shippingCost: form.shippingCost || null,
          shippingCollected: form.shippingCollected || 0,
          platform: form.platform,
          salesTax: form.salesTax || null,
          platformFees: form.platformFees || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create sale');
      }
      reset();
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Record Sale</h3>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        <div className="space-y-4">
          {items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Item</label>
              <select
                value={form.itemId}
                onChange={(e) => setField('itemId', e.target.value)}
                className={inputClass}
              >
                <option value="">No item</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sold Date</label>
            <input
              type="date"
              value={form.soldDate}
              onChange={(e) => setField('soldDate', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <SaleFormFields form={form} setField={setField} autoTax={autoTax} setAutoTax={setAutoTax} netRevenue={netRevenue} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.soldPrice}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
