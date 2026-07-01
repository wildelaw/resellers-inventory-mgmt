'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const [entryId, setEntryId] = useState<number | null>(null);
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
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      const id = parseInt(p.id, 10);
      setEntryId(id);
      fetch(`/api/mileage/${id}`).then((r) => r.json()).then((e) => {
        setFormData({
          date: new Date(e.date * 1000).toISOString().split('T')[0],
          miles: String(e.miles),
          fromLocation: e.fromLocation || '',
          toLocation: e.toLocation || '',
          address: e.address || '',
          vehicle: e.vehicle || '',
          purpose: e.purpose || '',
        });
      });
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/mileage/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, miles: parseFloat(formData.miles) || 0 }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update entry');
      }
      router.push('/mileage');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Mileage Entry</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Miles *</label>
              <input type="number" step="0.1" min="0" value={formData.miles} onChange={(e) => setFormData({ ...formData, miles: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input type="text" value={formData.fromLocation} onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })} className="input-field" maxLength={200} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input type="text" value={formData.toLocation} onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })} className="input-field" maxLength={200} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" maxLength={500} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle</label>
            <input type="text" value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} className="input-field" maxLength={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Purpose</label>
            <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="input-field" rows={2} maxLength={500} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}