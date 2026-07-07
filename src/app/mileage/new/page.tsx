'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function NewMileagePage() {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), miles: '', fromLocation: '', toLocation: '', address: '', vehicle: '', purpose: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const res = await fetch('/api/mileage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.details?.join(', ') || d.error || 'Failed'); }
      router.push('/mileage');
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Add Mileage Entry</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">Date *</label><input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className={inputClass} required /></div><div><label className="block text-sm mb-1">Miles *</label><input type="number" step="0.1" value={form.miles} onChange={(e) => setField('miles', e.target.value)} className={inputClass} required /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">From</label><input value={form.fromLocation} onChange={(e) => setField('fromLocation', e.target.value)} className={inputClass} /></div><div><label className="block text-sm mb-1">To</label><input value={form.toLocation} onChange={(e) => setField('toLocation', e.target.value)} className={inputClass} /></div></div>
          <div><label className="block text-sm mb-1">Address</label><input value={form.address} onChange={(e) => setField('address', e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm mb-1">Vehicle</label><input value={form.vehicle} onChange={(e) => setField('vehicle', e.target.value)} className={inputClass} /></div><div><label className="block text-sm mb-1">Purpose</label><input value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} className={inputClass} /></div></div>
          <div className="flex gap-2"><button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => router.push('/mileage')} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md">Cancel</button></div>
        </form>
      </main>
    </div>
  );
}
