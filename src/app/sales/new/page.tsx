'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import SaleFormFields from '@/components/SaleFormFields';
import { PLATFORMS } from '@/lib/constants';

export default function NewSalePage() {
  const router = useRouter();
  const [soldPrice, setSoldPrice] = useState('');
  const [platform, setPlatform] = useState('local');
  const [shippingCost, setShippingCost] = useState('');
  const [shippingCollected, setShippingCollected] = useState('');
  const [salesTax, setSalesTax] = useState('');
  const [platformFees, setPlatformFees] = useState('');
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemId, setItemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldPrice: parseFloat(soldPrice), platform, 
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          shippingCollected: shippingCollected ? parseFloat(shippingCollected) : 0,
          salesTax: salesTax ? parseFloat(salesTax) : null,
          platformFees: platformFees ? parseFloat(platformFees) : 0,
          soldDate: Math.floor(new Date(soldDate).getTime() / 1000),
          itemId: itemId ? parseInt(itemId) : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      router.push('/sales');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Record Sale</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <SaleFormFields soldPrice={soldPrice} setSoldPrice={setSoldPrice} platform={platform} setPlatform={setPlatform}
            shippingCost={shippingCost} setShippingCost={setShippingCost} shippingCollected={shippingCollected} setShippingCollected={setShippingCollected}
            salesTax={salesTax} setSalesTax={setSalesTax} platformFees={platformFees} setPlatformFees={setPlatformFees}
            soldDate={soldDate} setSoldDate={setSoldDate} showItemId itemId={itemId} setItemId={setItemId} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/sales')} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 dark:text-white rounded-md">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Record Sale'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
