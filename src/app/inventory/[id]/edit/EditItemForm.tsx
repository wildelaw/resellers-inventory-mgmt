'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditItemForm({ item }: { item: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: item.name || '',
    description: item.description || '',
    purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
    purchasePrice: String(item.purchasePrice ?? ''),
    purchaseLocation: item.purchaseLocation || '',
    category: item.category || '',
    notes: item.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, purchasePrice: parseFloat(form.purchasePrice) || 0 }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update item'); }
      router.push(`/inventory/${item.id}`);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date *</label><input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price *</label><input type="number" step="0.01" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Location</label><input type="text" value={form.purchaseLocation} onChange={e => setForm({...form, purchaseLocation: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label><input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" rows={2} /></div>
      <div className="flex justify-end space-x-3"><button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button></div>
    </form>
  );
}