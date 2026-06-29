'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientShell from '@/components/client-shell';
import { apiGet, apiPut, apiDelete } from '@/lib/api-client';
import ConfirmModal from '@/components/ConfirmModal';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface MileageData {
  id: number; date: number; miles: number; fromLocation: string | null;
  toLocation: string | null; address: string | null; vehicle: string | null; purpose: string | null;
}

export default function EditMileagePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState({
    date: '', miles: '', fromLocation: '', toLocation: '', address: '', vehicle: '', purpose: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<MileageData>(`/api/mileage/${id}`).then((res) => {
      if (res.ok && res.data) {
        const d = res.data;
        setForm({
          date: new Date(d.date * 1000).toISOString().slice(0, 10), miles: String(d.miles),
          fromLocation: d.fromLocation || '', toLocation: d.toLocation || '', address: d.address || '',
          vehicle: d.vehicle || '', purpose: d.purpose || '',
        });
      } else setError(res.error || 'Entry not found');
      setLoading(false);
    });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPut(`/api/mileage/${id}`, { ...form, miles: Number(form.miles) || 0 });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to update'); return; }
    router.push('/mileage');
  }

  async function doDelete() {
    setConfirmDelete(false);
    const res = await apiDelete(`/api/mileage/${id}`);
    if (res.ok) router.push('/mileage');
    else setError(res.error || 'Failed to delete');
  }

  if (loading) return <ClientShell><p className="text-gray-500">Loading…</p></ClientShell>;

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">Edit Mileage Entry</h1>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><label className={labelClass}>Miles</label><input type="number" step="0.1" min="0" className={inputClass} value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>From</label><input className={inputClass} value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} /></div>
          <div><label className={labelClass}>To</label><input className={inputClass} value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} /></div>
        </div>
        <div><label className={labelClass}>Address</label><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Vehicle</label><input className={inputClass} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
          <div><label className={labelClass}>Purpose</label><input className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm">Delete</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
      <ConfirmModal open={confirmDelete} title="Delete this entry?" message="This cannot be undone." danger confirmLabel="Delete" onConfirm={doDelete} onCancel={() => setConfirmDelete(false)} />
    </ClientShell>
  );
}