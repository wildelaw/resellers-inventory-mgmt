'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import { STATUS_LABELS, STATUS_COLORS, getAllowedTransitions } from '@/lib/constants';

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>({});

  useEffect(() => { fetchItem(); }, []);

  const fetchItem = async () => {
    const res = await fetch(`/api/inventory/${params.id}`);
    if (!res.ok) { router.push('/inventory'); return; }
    const data = await res.json();
    setForm({
      ...data.item,
      purchaseDate: new Date(data.item.purchaseDate * 1000).toISOString().split('T')[0],
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { id, photos, sales, owner, createdAt, updatedAt, ...updateData } = form;
      const res = await fetch(`/api/inventory/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updateData,
          purchasePrice: parseFloat(updateData.purchasePrice) || 0,
          purchaseDate: Math.floor(new Date(updateData.purchaseDate).getTime() / 1000),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed'); }
      router.push(`/inventory/${params.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Update failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="text-center py-12 text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Item</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label><input type="text" value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date *</label><input type="date" value={form.purchaseDate || ''} onChange={e => setForm((f: any) => ({ ...f, purchaseDate: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price *</label><input type="number" step="0.01" value={form.purchasePrice || ''} onChange={e => setForm((f: any) => ({ ...f, purchasePrice: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Location</label><input type="text" value={form.purchaseLocation || ''} onChange={e => setForm((f: any) => ({ ...f, purchaseLocation: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label><input type="text" value={form.category || ''} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" rows={3} /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push(`/inventory/${params.id}`)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white rounded-md">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}