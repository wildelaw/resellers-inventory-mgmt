'use client';

import { useState } from 'react';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from './SaleFormFields';
import { apiPost, apiPut } from '@/lib/api-client';
import type { Item } from '@/lib/schema';

export interface SalesEntryModalProps {
  open: boolean;
  items?: Pick<Item, 'id' | 'name' | 'status'>[];
  saleId?: number;
  initial?: Parameters<typeof useSaleForm>[0];
  onClose: () => void;
  onSaved: () => void;
}

export default function SalesEntryModal({ open, items, saleId, initial, onClose, onSaved }: SalesEntryModalProps) {
  const { state, setField, computedTax, toggleAutoTax } = useSaleForm(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      itemId: state.itemId ? Number(state.itemId) : null,
      soldDate: state.soldDate,
      soldPrice: Number(state.soldPrice),
      shippingCost: state.shippingCost ? Number(state.shippingCost) : null,
      shippingCollected: state.shippingCollected ? Number(state.shippingCollected) : 0,
      platform: state.platform,
      salesTax: state.autoTax ? Number(computedTax) || null : (state.salesTax ? Number(state.salesTax) : null),
      platformFees: state.platformFees ? Number(state.platformFees) : 0,
    };
    const res = saleId
      ? await apiPut(`/api/sales/${saleId}`, payload)
      : await apiPost('/api/sales', payload);
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to save sale'); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h3 className="text-lg font-semibold mb-4">{saleId ? 'Edit Sale' : 'Record Sale'}</h3>
        <form onSubmit={submit}>
          <SaleFormFields state={state} computedTax={computedTax} items={items} onField={setField} onToggleAutoTax={toggleAutoTax} />
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}