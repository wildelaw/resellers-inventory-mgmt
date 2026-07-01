'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/header';
import { ALL_STATUSES, STATUS_LABELS, getAllowedTransitions } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';
import { formatDateForInput } from '@/lib/utils';

interface ItemForEdit {
  id: number;
  name: string;
  description?: string | null;
  purchaseDate: string | Date;
  purchasePrice: number;
  purchaseLocation?: string | null;
  category?: string | null;
  status: ItemStatus;
  notes?: string | null;
}

interface Props { item: ItemForEdit; }

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function EditItemClient({ item }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [purchaseDate, setPurchaseDate] = useState(formatDateForInput(item.purchaseDate));
  const [purchasePrice, setPurchasePrice] = useState(item.purchasePrice.toString());
  const [purchaseLocation, setPurchaseLocation] = useState(item.purchaseLocation || '');
  const [category, setCategory] = useState(item.category || '');
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [notes, setNotes] = useState(item.notes || '');

  const allowedStatuses = [item.status, ...getAllowedTransitions(item.status)];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          purchaseDate,
          purchasePrice: parseFloat(purchasePrice),
          purchaseLocation: purchaseLocation || undefined,
          category: category || undefined,
          status,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item');

      router.push(`/inventory/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/inventory/${item.id}`} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2">
            ← Back to Item
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Item</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} maxLength={200} />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputClass} maxLength={2000} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Purchase Date *</label>
                <input type="date" required value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Purchase Price *</label>
                <input type="number" required min="0.01" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Purchase Location</label>
                <input type="text" value={purchaseLocation} onChange={e => setPurchaseLocation(e.target.value)} className={inputClass} maxLength={200} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} className={inputClass} maxLength={100} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ItemStatus)} className={inputClass}>
                {allowedStatuses.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {(status === 'donated' || status === 'discarded') && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Note: Setting to {status} will set the removal date. No sale record will be created.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} maxLength={2000} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href={`/inventory/${item.id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
