'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/header';

export default function EditItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', purchaseDate: '', purchasePrice: '', purchaseLocation: '', category: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/${id}`).then((r) => r.json()).then((d) => {
      setForm({
        name: d.name, description: d.description || '',
        purchaseDate: new Date(d.purchaseDate * 1000).toISOString().slice(0, 10),
        purchasePrice: String(d.purchasePrice),
        purchaseLocation: d.purchaseLocation || '', category: d.category || '', notes: d.notes || '',
      });
      setLoading(false);
    });
  }, [id]);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details?.join(', ') || data.error || 'Failed to update item');
      }
      router.push(`/inventory/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="max-w-2xl mx-auto py-8 text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Edit Item</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div><label className="block text-sm mb-1">Name *</label><input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} required /></div>
          <div><label className="block text-sm mb-1">Description</label><textarea value={form.description} onChange={(e) => setField('description', e.target.value)} className={inputClass} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">Purchase Date *</label><input type="date" value={form.purchaseDate} onChange={(e) => setField('purchaseDate', e.target.value)} className={inputClass} required /></div>
            <div><label className="block text-sm mb-1">Purchase Price *</label><input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setField('purchasePrice', e.target.value)} className={inputClass} required /></div>
          </div>
          <div><label className="block text-sm mb-1">Purchase Location</label><input value={form.purchaseLocation} onChange={(e) => setField('purchaseLocation', e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Category</label><input value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} className={inputClass} rows={2} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md">Cancel</button>
          </div>
        </form>
      </main>
    </div>
  );
}
