'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Initial {
  id: number;
  date: number;
  miles: number;
  fromLocation: string | null;
  toLocation: string | null;
  address: string | null;
  vehicle: string | null;
  purpose: string | null;
}

export default function MileageEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    date: new Date(initial.date).toISOString().slice(0, 10),
    miles: String(initial.miles),
    fromLocation: initial.fromLocation ?? '',
    toLocation: initial.toLocation ?? '',
    address: initial.address ?? '',
    vehicle: initial.vehicle ?? '',
    purpose: initial.purpose ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/mileage/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          miles: Number(form.miles),
          fromLocation: form.fromLocation || null,
          toLocation: form.toLocation || null,
          address: form.address || null,
          vehicle: form.vehicle || null,
          purpose: form.purpose || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      router.push('/mileage');
    } finally {
      setBusy(false);
    }
  }, [form, initial.id, router]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Mileage Entry</h1>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" required className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Miles *</label>
              <input type="number" step="0.1" min="0" required className={inputCls} value={form.miles} onChange={(e) => update('miles', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From</label>
              <input className={inputCls} value={form.fromLocation} onChange={(e) => update('fromLocation', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To</label>
              <input className={inputCls} value={form.toLocation} onChange={(e) => update('toLocation', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input className={inputCls} value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Vehicle</label>
              <input className={inputCls} value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <input className={inputCls} value={form.purpose} onChange={(e) => update('purpose', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}