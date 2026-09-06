'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface MileageFormData {
  date: string;
  miles: string;
  fromLocation: string;
  toLocation: string;
  address: string;
  vehicle: string;
  purpose: string;
}

export const EMPTY_MILEAGE_FORM: MileageFormData = {
  date: new Date().toISOString().slice(0, 10),
  miles: '',
  fromLocation: '',
  toLocation: '',
  address: '',
  vehicle: '',
  purpose: '',
};

interface Props {
  initial?: Partial<MileageFormData>;
  submitLabel?: string;
  onSubmit: (data: MileageFormData) => Promise<string | null>;
}

export default function MileageForm({ initial, submitLabel = 'Save Trip', onSubmit }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<MileageFormData>({ ...EMPTY_MILEAGE_FORM, ...initial });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field: keyof MileageFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputCls = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const submitError = await onSubmit(form);
    setSaving(false);
    if (submitError) {
      setError(submitError);
    } else {
      router.push('/mileage');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Miles *</label>
          <input type="number" min="0.01" step="0.01" value={form.miles} onChange={(e) => update('miles', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
          <input value={form.fromLocation} onChange={(e) => update('fromLocation', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input value={form.toLocation} onChange={(e) => update('toLocation', e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
          <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
          <input value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
          <input value={form.purpose} onChange={(e) => update('purpose', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/mileage')}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}