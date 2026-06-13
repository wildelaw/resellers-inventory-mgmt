'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import ConfirmModal from '@/components/ConfirmModal';

export default function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [entryId, setEntryId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: '',
    miles: '',
    fromLocation: '',
    toLocation: '',
    address: '',
    vehicle: '',
    purpose: '',
  });

  useEffect(() => {
    params.then((p) => {
      const id = Number(p.id);
      setEntryId(id);
      fetch(`/api/mileage/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Entry not found');
          return res.json();
        })
        .then((data) => {
          setForm({
            date: data.date ? new Date(data.date * 1000).toISOString().split('T')[0] : '',
            miles: String(data.miles ?? ''),
            fromLocation: data.fromLocation || '',
            toLocation: data.toLocation || '',
            address: data.address || '',
            vehicle: data.vehicle || '',
            purpose: data.purpose || '',
          });
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/mileage/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: Math.floor(new Date(form.date).getTime() / 1000),
          miles: parseFloat(form.miles) || 0,
          fromLocation: form.fromLocation || null,
          toLocation: form.toLocation || null,
          address: form.address || null,
          vehicle: form.vehicle || null,
          purpose: form.purpose || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update entry');
      }

      router.push('/mileage');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/mileage/${entryId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete entry');
      }
      router.push('/mileage');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Mileage Entry</h1>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="miles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Miles *</label>
              <input
                id="miles"
                type="number"
                step="0.1"
                min="0"
                required
                value={form.miles}
                onChange={(e) => setForm({ ...form, miles: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Location</label>
              <input id="fromLocation" type="text" value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Location</label>
              <input id="toLocation" type="text" value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <input id="address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
              <input id="vehicle" type="text" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
              <input id="purpose" type="text" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </main>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Mileage Entry"
        message="Are you sure you want to delete this mileage entry? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </>
  );
}