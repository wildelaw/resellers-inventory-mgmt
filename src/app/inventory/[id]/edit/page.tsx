'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { ALL_STATUSES, STATUS_LABELS, getAllowedTransitions } from '@/lib/constants';

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const [itemId, setItemId] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purchaseDate: '',
    purchasePrice: '',
    purchaseLocation: '',
    category: '',
    status: 'available',
    notes: '',
  });
  const [currentStatus, setCurrentStatus] = useState('available');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setItemId(Number(id));
      const res = await fetch(`/api/inventory/${id}`);
      if (res.ok) {
        const item = await res.json();
        setFormData({
          name: item.name || '',
          description: item.description || '',
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate * 1000).toISOString().split('T')[0] : '',
          purchasePrice: String(item.purchasePrice || ''),
          purchaseLocation: item.purchaseLocation || '',
          category: item.category || '',
          status: item.status || 'available',
          notes: item.notes || '',
        });
        setCurrentStatus(item.status || 'available');
      }
      setFetching(false);
    })();
  }, [params]);

  const allowedTransitions = getAllowedTransitions(currentStatus as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchasePrice: Number(formData.purchasePrice),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update item');
      }

      router.push(`/inventory/${itemId}`);
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
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Edit Item</h1>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input type="text" required maxLength={200} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea maxLength={2000} rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date *</label>
              <input type="date" required value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price *</label>
              <input type="number" step="0.01" min="0" required value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Location</label>
              <input type="text" maxLength={200} value={formData.purchaseLocation} onChange={(e) => setFormData({ ...formData, purchaseLocation: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <input type="text" maxLength={100} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field">
              <option value={currentStatus}>{STATUS_LABELS[currentStatus as keyof typeof STATUS_LABELS]} (current)</option>
              {allowedTransitions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea maxLength={2000} rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" />
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