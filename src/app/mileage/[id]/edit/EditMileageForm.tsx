'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditMileageForm({ entry }: { entry: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
    miles: String(entry.miles ?? ''),
    fromLocation: entry.fromLocation || '',
    toLocation: entry.toLocation || '',
    address: entry.address || '',
    vehicle: entry.vehicle || '',
    purpose: entry.purpose || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/mileage/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, miles: parseFloat(form.miles) || 0 }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update entry'); }
      router.push('/mileage');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Miles *</label><input type="number" step="0.1" value={form.miles} onChange={e => setForm({...form, miles: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From Location</label><input type="text" value={form.fromLocation} onChange={e => setForm({...form, fromLocation: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To Location</label><input type="text" value={form.toLocation} onChange={e => setForm({...form, toLocation: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle</label><input type="text" value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label><input type="text" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
      </div>
      <div className="flex justify-end space-x-3"><button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button></div>
    </form>
  );
}