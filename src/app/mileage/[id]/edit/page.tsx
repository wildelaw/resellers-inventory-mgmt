'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/header';

export default function EditMileagePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState({ date: '', miles: '', fromLocation: '', toLocation: '', address: '', vehicle: '', purpose: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mileage/${id}`).then((r) => r.json()).then((d) => {
      setForm({ date: new Date(d.date * 1000).toISOString().slice(0, 10), miles: String(d.miles), fromLocation: d.fromLocation || '', toLocation: d.toLocation || '', address: d.address || '', vehicle: d.vehicle || '', purpose: d.purpose || '' });
      setLoading(false);
    });
  }, [id]);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/mileage/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) router.push('/mileage');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="py-8 text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Edit Mileage Entry</h1>
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
