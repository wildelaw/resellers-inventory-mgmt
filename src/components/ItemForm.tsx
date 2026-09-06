'use client';

import { useState } from 'react';
import { ALL_STATUSES, STATUS_LABELS, type ItemStatus } from '@/lib/constants';

export interface ItemFormData {
  name: string;
  description: string;
  purchaseDate: string;
  purchasePrice: string;
  purchaseLocation: string;
  category: string;
  notes: string;
  status?: ItemStatus;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface ItemFormProps {
  initial?: Partial<ItemFormData>;
  submitLabel: string;
  loadingLabel: string;
  onSubmit: (data: ItemFormData) => Promise<string | null>; // returns error message or null
  onCancel: () => void;
}

export default function ItemForm({ initial, submitLabel, loadingLabel, onSubmit, onCancel }: ItemFormProps) {
  const [form, setForm] = useState<ItemFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    purchaseDate: initial?.purchaseDate ?? new Date().toISOString().slice(0, 10),
    purchasePrice: initial?.purchasePrice ?? '',
    purchaseLocation: initial?.purchaseLocation ?? '',
    category: initial?.category ?? '',
    notes: initial?.notes ?? '',
    status: initial?.status,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field: keyof ItemFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await onSubmit(form);
      if (result) setError(result);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <div>
        <label className={labelClass} htmlFor="item-name">Name *</label>
        <input id="item-name" type="text" maxLength={200} required className={inputClass}
          value={form.name} onChange={(e) => update('name', e.target.value)} />
      </div>

      <div>
        <label className={labelClass} htmlFor="item-description">Description</label>
        <textarea id="item-description" rows={3} maxLength={2000} className={inputClass}
          value={form.description} onChange={(e) => update('description', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="item-purchase-date">Purchase Date *</label>
          <input id="item-purchase-date" type="date" required className={inputClass}
            value={form.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-purchase-price">Purchase Price *</label>
          <input id="item-purchase-price" type="number" step="0.01" min="0" required className={inputClass}
            value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-location">Purchase Location</label>
          <input id="item-location" type="text" maxLength={200} className={inputClass}
            value={form.purchaseLocation} onChange={(e) => update('purchaseLocation', e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-category">Category</label>
          <input id="item-category" type="text" maxLength={100} className={inputClass}
            value={form.category} onChange={(e) => update('category', e.target.value)} />
        </div>
      </div>

      {form.status !== undefined && (
        <div>
          <label className={labelClass} htmlFor="item-status">Status</label>
          <select id="item-status" className={inputClass}
            value={form.status} onChange={(e) => update('status', e.target.value)}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Note: marking an item donated or discarded sets a removal date — no sale record is created.
          </p>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="item-notes">Notes</label>
        <textarea id="item-notes" rows={3} maxLength={2000} className={inputClass}
          value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {saving ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}