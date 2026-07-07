'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from '@/components/SaleFormFields';

export default function NewSalePage() {
  const { form, setField, autoTax, setAutoTax, netRevenue } = useSaleForm();
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/inventory?pageSize=100').then((r) => r.json()).then((d) => setItems(d.items.map((i: { id: number; name: string }) => ({ id: i.id, name: i.name })))).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: form.itemId ? Number(form.itemId) : null,
          soldDate: form.soldDate, soldPrice: form.soldPrice,
          shippingCost: form.shippingCost || null, shippingCollected: form.shippingCollected || 0,
          platform: form.platform, salesTax: form.salesTax || null, platformFees: form.platformFees || 0,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.details?.join(', ') || d.error || 'Failed'); }
      router.push('/sales');
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setSaving(false); }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Record Sale</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div><label className="block text-sm mb-1">Link to Item</label><select value={form.itemId} onChange={(e) => setField('itemId', e.target.value)} className={inputClass}><option value="">No item</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
          <div><label className="block text-sm mb-1">Sold Date</label><input type="date" value={form.soldDate} onChange={(e) => setField('soldDate', e.target.value)} className={inputClass} required /></div>
          <SaleFormFields form={form} setField={setField} autoTax={autoTax} setAutoTax={setAutoTax} netRevenue={netRevenue} />
          <div className="flex gap-2"><button type="submit" disabled={saving || !form.soldPrice} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save Sale'}</button><button type="button" onClick={() => router.push('/sales')} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md">Cancel</button></div>
        </form>
      </main>
    </div>
  );
}
