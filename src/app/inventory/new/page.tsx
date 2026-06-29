'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', description: '', purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: '', purchaseLocation: '', category: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          purchaseDate: form.purchaseDate,
          purchasePrice: Number(form.purchasePrice),
          purchaseLocation: form.purchaseLocation || null,
          category: form.category || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      const created = await res.json();
      router.push(`/inventory/${created.id}`);
    } finally {
      setBusy(false);
    }
  }, [form, router]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Add Item</h1>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div>
            <label className={labelCls} htmlFor="name">Name *</label>
            <input id="name" required className={inputCls} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="description">Description</label>
            <textarea id="description" rows={3} className={inputCls} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="purchaseDate">Purchase date *</label>
              <input id="purchaseDate" type="date" required className={inputCls} value={form.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="purchasePrice">Purchase price *</label>
              <input id="purchasePrice" type="number" step="0.01" min="0" required className={inputCls} value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="purchaseLocation">Purchase location</label>
              <input id="purchaseLocation" className={inputCls} value={form.purchaseLocation} onChange={(e) => update('purchaseLocation', e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="category">Category</label>
              <input id="category" className={inputCls} value={form.category} onChange={(e) => update('category', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="notes">Notes</label>
            <textarea id="notes" rows={2} className={inputCls} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}