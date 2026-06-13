'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SaleFormFields from '@/components/SaleFormFields';
import { useSaleForm } from '@/hooks/useSaleForm';

export default function NewSaleForm() {
  const router = useRouter();
  const { formData, updateField, reset } = useSaleForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to record sale'); }
      router.push('/sales');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      <SaleFormFields formData={formData} updateField={updateField} />
      <div className="flex justify-end space-x-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{loading ? 'Saving...' : 'Record Sale'}</button>
      </div>
    </form>
  );
}