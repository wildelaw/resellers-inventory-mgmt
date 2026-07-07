'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from '@/components/SaleFormFields';

export default function NewSalePage() {
  const { formData, updateField, autoCalculateTax } = useSaleForm();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemsLoading, setItemsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/inventory?pageSize=100&status=available')
      .then(res => res.json())
      .then(data => setItems(data.items || []))
      .finally(() => setItemsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: formData.itemId || null,
          soldDate: formData.soldDate,
          soldPrice: Number(formData.soldPrice),
          shippingCost: formData.shippingCost ? Number(formData.shippingCost) : null,
          shippingCollected: Number(formData.shippingCollected) || 0,
          platform: formData.platform,
          salesTax: formData.salesTax ? Number(formData.salesTax) : null,
          platformFees: Number(formData.platformFees) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record sale');
      }

      router.push('/sales');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Record New Sale</h1>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Inventory Item</label>
            <select
              value={formData.itemId || ''}
              onChange={(e) => updateField('itemId', e.target.value ? Number(e.target.value) : null)}
              className="input-field"
              disabled={itemsLoading}
            >
              <option value="">No item (standalone sale)</option>
              {items.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name} — {item.purchasePrice ? `$${item.purchasePrice}` : ''}</option>
              ))}
            </select>
            {itemsLoading && <p className="text-xs text-gray-500 mt-1">Loading items...</p>}
          </div>

          <SaleFormFields formData={formData} updateField={updateField} onAutoTax={autoCalculateTax} />

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Recording...' : 'Record Sale'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}