'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '@/components/client-shell';
import { apiPost } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewItemPage() {
  const [form, setForm] = useState({
    name: '', description: '', purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: '', purchaseLocation: '', category: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPost('/api/inventory', {
      ...form,
      purchasePrice: Number(form.purchasePrice) || 0,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to create item'); return; }
    const id = (res.data as { id: number }).id;
    router.push(`/inventory/${id}`);
  }

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">Add Item</h1>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl space-y-4">
        <div><label className={labelClass}>Name *</label><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><label className={labelClass}>Description</label><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Purchase date *</label><input type="date" className={inputClass} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required /></div>
          <div><label className={labelClass}>Purchase price ($) *</label><input type="number" step="0.01" min="0" className={inputClass} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} required /></div>
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