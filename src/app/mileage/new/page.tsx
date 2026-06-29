'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientShell from '@/components/client-shell';
import { apiPost } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewMileagePage() {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), miles: '', fromLocation: '',
    toLocation: '', address: '', vehicle: '', purpose: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPost('/api/mileage', { ...form, miles: Number(form.miles) || 0 });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to save'); return; }
    router.push('/mileage');
    router.refresh();
  }

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">Add Mileage Entry</h1>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Date *</label><input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
          <div><label className={labelClass}>Miles *</label><input type="number" step="0.1" min="0" className={inputClass} value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>From</label><input className={inputClass} value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} /></div>
          <div><label className={labelClass}>To</label><input className={inputClass} value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} /></div>
        </div>
        <div><label className={labelClass}>Address</label><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Vehicle</label><input className={inputClass} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
          <div><label className={labelClass}>Purpose</label><input className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </ClientShell>
  );
}