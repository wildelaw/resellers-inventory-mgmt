'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import SaleFormFields from '@/components/SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';
import { useEffect } from 'react';

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: number;
  status: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { form, setSoldDate, setSoldPrice, setShippingCost, setShippingCollected,
    setPlatform, setSalesTax, setPlatformFees, toPayload } = useSaleForm();

  useEffect(() => {
    fetch('/api/inventory?pageSize=200')
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toPayload(),
          itemId: selectedItemId ? parseInt(selectedItemId) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sale');

      router.push(`/sales/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2">
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Record Sale</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item (optional)</label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-white"
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

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Saving...' : 'Record Sale'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
