'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SaleFormFields from './SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';
import type { SaleFormData } from '@/hooks/useSaleForm';

export interface SaleModalItem {
  id: number;
  name: string;
  status: string;
}

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (sale: unknown) => void;
  /** When provided, edits this sale; otherwise creates a new sale */
  sale?: (SaleFormData & { id: number }) | null;
  /** When provided, the item is fixed (e.g. recording a sale from an item page) */
  fixedItemId?: number;
}

export default function SalesEntryModal({
  isOpen,
  onClose,
  onSaved,
  sale = null,
  fixedItemId,
}: SalesEntryModalProps) {
  const router = useRouter();
  const { form, update, loadSettings } = useSaleForm(
    sale ?? (fixedItemId ? { itemId: String(fixedItemId) } : undefined)
  );
  const [items, setItems] = useState<SaleModalItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadSettings();
    fetch('/api/inventory?pageSize=100&status=available')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, [isOpen, loadSettings]);

  // Ensure the fixed item is selectable even if it isn't in the available list
  const itemOptions: SaleModalItem[] = fixedItemId && !items.some((i) => i.id === fixedItemId)
    ? [...items, { id: fixedItemId, name: 'Selected item', status: 'selected' }]
    : items;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...(form.itemId ? { itemId: Number(form.itemId) } : {}),
      soldDate: form.soldDate,
      soldPrice: form.soldPrice,
      shippingCost: form.shippingCost || undefined,
      shippingCollected: form.shippingCollected || undefined,
      platform: form.platform,
      salesTax: form.salesTax || undefined,
      platformFees: form.platformFees || undefined,
    };

    try {
      const res = sale
        ? await fetch(`/api/sales/${sale.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save sale');
        return;
      }

      const saved = await res.json();
      onSaved?.(saved);
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {sale ? 'Edit Sale' : 'Record Sale'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <SaleFormFields
            form={form}
            update={update}
            items={itemOptions}
            itemLocked={!!fixedItemId}
          />

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : sale ? 'Save Changes' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}