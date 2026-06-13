'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function EditMileagePage() {
  const params = useParams(); const router = useRouter();
  const [form, setForm] = useState<any>({}); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  useEffect(() => { fetchEntry(); }, []);
  const fetchEntry = async () => { const res = await fetch(`/api/mileage/${params.id}`); if (!res.ok) { router.push('/mileage'); return; } const data = await res.json(); setForm({ ...data.mileage, date: new Date(data.mileage.date * 1000).toISOString().split('T')[0] }); setLoading(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await fetch(`/api/mileage/${params.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, miles: parseFloat(form.miles), date: Math.floor(new Date(form.date).getTime() / 1000) }) }); router.push('/mileage'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="text-center py-12 text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Mileage Entry</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label><input type="date" value={form.date || ''} onChange={e => setForm((f: any) => ({...f, date: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Miles *</label><input type="number" step="0.1" value={form.miles || ''} onChange={e => setForm((f: any) => ({...f, miles: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label><input type="text" value={form.fromLocation || ''} onChange={e => setForm((f: any) => ({...f, fromLocation: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label><input type="text" value={form.toLocation || ''} onChange={e => setForm((f: any) => ({...f, toLocation: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle</label><input type="text" value={form.vehicle || ''} onChange={e => setForm((f: any) => ({...f, vehicle: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label><input type="text" value={form.purpose || ''} onChange={e => setForm((f: any) => ({...f, purpose: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/mileage')} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 dark:text-white rounded-md">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
