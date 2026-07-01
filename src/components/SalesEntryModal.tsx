'use client';

import { useState, FormEvent } from 'react';
import SaleFormFields from './SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';
import { calculateProfit } from '@/lib/financial';
import { formatCurrency } from '@/lib/utils';

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: number;
  status: string;
}

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items?: InventoryItem[];
  preSelectedItemId?: number;
  taxRate?: number;
  editSale?: {
    id: number;
    soldDate: string;
    soldPrice: number;
    shippingCost?: number | null;
    shippingCollected?: number | null;
    platform: string;
    salesTax?: number | null;
    platformFees?: number | null;
    itemId?: number | null;
  };
}

export default function SalesEntryModal({
  isOpen,
  onClose,
  onSuccess,
  items = [],
  preSelectedItemId,
  taxRate = 0.0825,
  editSale,
}: SalesEntryModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    editSale?.itemId?.toString() || preSelectedItemId?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { form, setSoldDate, setSoldPrice, setShippingCost, setShippingCollected,
    setPlatform, setSalesTax, setPlatformFees, reset, toPayload } = useSaleForm({
    initialData: editSale ? {
      soldDate: editSale.soldDate,
      soldPrice: editSale.soldPrice.toString(),
      shippingCost: editSale.shippingCost?.toString() || '',
      shippingCollected: editSale.shippingCollected?.toString() || '',
      platform: editSale.platform as any,
      salesTax: editSale.salesTax?.toString() || '',
      platformFees: editSale.platformFees?.toString() || '',
    } : undefined,
    taxRate,
  });

  if (!isOpen) return null;

  const selectedItem = items.find(i => i.id.toString() === selectedItemId);

  const estimatedProfit = selectedItem ? calculateProfit({
    ...toPayload(),
    purchasePrice: selectedItem.purchasePrice,
  }) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...toPayload(),
        itemId: selectedItemId ? parseInt(selectedItemId) : undefined,
      };

      const url = editSale ? `/api/sales/${editSale.id}` : '/api/sales';
      const method = editSale ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save sale');

      reset();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editSale ? 'Edit Sale' : 'Record Sale'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item (optional)
              </label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">-- No item linked --</option>
                {items.map(item => (
                  <option key={item.id} value={item.id.toString()}>
                    {item.name} ({item.status})
                  </option>
                ))}
              </select>
            </div>

            <SaleFormFields
              soldDate={form.soldDate}
              soldPrice={form.soldPrice}
              shippingCost={form.shippingCost}
              shippingCollected={form.shippingCollected}
              platform={form.platform}
              salesTax={form.salesTax}
              platformFees={form.platformFees}
              onSoldDateChange={setSoldDate}
              onSoldPriceChange={setSoldPrice}
              onShippingCostChange={setShippingCost}
              onShippingCollectedChange={setShippingCollected}
              onPlatformChange={setPlatform}
              onSalesTaxChange={setSalesTax}
              onPlatformFeesChange={setPlatformFees}
            />

            {estimatedProfit !== null && (
              <div className={`text-sm font-medium p-2 rounded ${
                estimatedProfit >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              }`}>
                Estimated profit: {formatCurrency(estimatedProfit)}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editSale ? 'Update Sale' : 'Record Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
