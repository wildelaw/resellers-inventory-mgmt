'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { ALL_STATUSES, STATUS_LABELS, getAllowedTransitions, type ItemStatus } from '@/lib/constants';

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const [itemId, setItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purchaseDate: '',
    purchasePrice: '',
    purchaseLocation: '',
    category: '',
    status: 'available' as ItemStatus,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      const id = parseInt(p.id, 10);
      setItemId(id);
      fetch(`/api/inventory/${id}`)
        .then((r) => r.json())
        .then((item) => {
          setFormData({
            name: item.name || '',
            description: item.description || '',
            purchaseDate: new Date(item.purchaseDate * 1000).toISOString().split('T')[0],
            purchasePrice: String(item.purchasePrice || ''),
            purchaseLocation: item.purchaseLocation || '',
            category: item.category || '',
            status: item.status as ItemStatus,
            notes: item.notes || '',
          });
        });
    });
  }, [params]);

  const allowedTransitions = itemId ? getAllowedTransitions(formData.status) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.details?.join(', ') || 'Failed to update item');
      }
      router.push(`/inventory/${itemId}`);
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
        <h1 className="text-3xl font-bold mb-6">Edit Item</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={3} maxLength={2000} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date *</label>
              <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Price *</label>
              <input type="number" step="0.01" min="0" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Location</label>
              <input type="text" value={formData.purchaseLocation} onChange={(e) => setFormData({ ...formData, purchaseLocation: e.target.value })} className="input-field" maxLength={200} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field" maxLength={100} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })} className="input-field">
              <option value={formData.status}>{STATUS_LABELS[formData.status]} (current)</option>
              {allowedTransitions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={3} maxLength={2000} />
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