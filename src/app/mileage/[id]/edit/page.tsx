'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const [entryId, setEntryId] = useState(0);
  const [formData, setFormData] = useState({
    date: '',
    miles: '',
    fromLocation: '',
    toLocation: '',
    address: '',
    vehicle: '',
    purpose: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setEntryId(Number(id));
      const res = await fetch(`/api/mileage/${id}`);
      if (res.ok) {
        const entry = await res.json();
        setFormData({
          date: entry.date ? new Date(entry.date * 1000).toISOString().split('T')[0] : '',
          miles: String(entry.miles || ''),
          fromLocation: entry.fromLocation || '',
          toLocation: entry.toLocation || '',
          address: entry.address || '',
          vehicle: entry.vehicle || '',
          purpose: entry.purpose || '',
        });
      }
      setFetching(false);
    })();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/mileage/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          miles: Number(formData.miles),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update entry');
      }

      router.push('/mileage');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8"><p className="text-gray-500">Loading...</p></main>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Edit Mileage Entry</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Miles *</label>
              <input type="number" step="0.1" min="0" required value={formData.miles} onChange={(e) => setFormData({ ...formData, miles: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
              <input type="text" value={formData.fromLocation} onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
              <input type="text" value={formData.toLocation} onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
              <input type="text" value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
              <input type="text" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}