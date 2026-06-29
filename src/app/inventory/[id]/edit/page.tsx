'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '@/components/client-shell';
import { apiGet, apiPut } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface ItemData {
  id: number; name: string; description: string | null; purchaseDate: number;
  purchasePrice: number; purchaseLocation: string | null; category: string | null;
  status: string; notes: string | null;
}

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', description: '', purchaseDate: '', purchasePrice: '',
    purchaseLocation: '', category: '', notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<ItemData>(`/api/inventory/${id}`).then((res) => {
      if (res.ok && res.data) {
        const d = res.data;
        setForm({
          name: d.name, description: d.description || '',
          purchaseDate: new Date(d.purchaseDate * 1000).toISOString().slice(0, 10),
          purchasePrice: String(d.purchasePrice),
          purchaseLocation: d.purchaseLocation || '', category: d.category || '',
          notes: d.notes || '',
        });
      } else { setError(res.error || 'Item not found'); }
      setLoading(false);
    });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPut(`/api/inventory/${id}`, {
      ...form, purchasePrice: Number(form.purchasePrice) || 0,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to update item'); return; }
    router.push(`/inventory/${id}`);
    router.refresh();
  }

  if (loading) return <ClientShell><p className="text-gray-500">Loading…</p></ClientShell>;

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">Edit Item</h1>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl space-y-4">
        <div><label className={labelClass}>Name *</label><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><label className={labelClass}>Description</label><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Purchase date</label><input type="date" className={inputClass} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
          <div><label className={labelClass}>Purchase price ($)</label><input type="number" step="0.01" min="0" className={inputClass} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Purchase location</label><input className={inputClass} value={form.purchaseLocation} onChange={(e) => setForm({ ...form, purchaseLocation: e.target.value })} /></div>
          <div><label className={labelClass}>Category</label><input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        </div>
        <div><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </ClientShell>
  );
}