'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSaleForm } from '@/hooks/useSaleForm';
import SaleFormFields from './SaleFormFields';
import { calculateSalesTaxFromPrice } from '@/lib/financial';

interface Item {
  id: number;
  name: string;
  status: string;
}

interface ExistingSale {
  id: number;
  itemId: number | null;
  soldDate: string;
  soldPrice: number;
  platform: string;
  shippingCost: number | null;
  shippingCollected: number | null;
  salesTax: number | null;
  platformFees: number | null;
}

interface Props {
  open: boolean;
  items: Item[];
  taxRate?: number;
  existing?: ExistingSale | null;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInput(value: number | string): string {
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  return d.toISOString().slice(0, 10);
}

export default function SalesEntryModal({
  open,
  items,
  taxRate = 0.0825,
  existing,
  onClose,
  onSaved,
}: Props) {
  const { state, update, setState } = useSaleForm(
    existing
      ? {
          itemId: existing.itemId ? String(existing.itemId) : '',
          soldDate: toDateInput(existing.soldDate),
          soldPrice: String(existing.soldPrice ?? ''),
          shippingCost: existing.shippingCost ? String(existing.shippingCost) : '',
          shippingCollected: existing.shippingCollected ? String(existing.shippingCollected) : '',
          platform: existing.platform,
          salesTax: existing.salesTax ? String(existing.salesTax) : '',
          platformFees: existing.platformFees ? String(existing.platformFees) : '',
          applyTaxAuto: false,
        }
      : undefined,
    taxRate,
  );

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        itemId: state.itemId ? Number(state.itemId) : null,
        soldDate: state.soldDate,
        soldPrice: Number(state.soldPrice),
        shippingCost: state.shippingCost ? Number(state.shippingCost) : null,
        shippingCollected: state.shippingCollected ? Number(state.shippingCollected) : 0,
        platform: state.platform,
        salesTax: state.salesTax ? Number(state.salesTax) : null,
        platformFees: state.platformFees ? Number(state.platformFees) : 0,
      };
      const url = existing ? `/api/sales/${existing.id}` : '/api/sales';
      const method = existing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(data.error || 'Request failed');
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }, [state, existing, onSaved]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-lg font-semibold mb-4">
          {existing ? 'Edit sale' : 'Record a sale'}
        </h3>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <SaleFormFields state={state} update={update} items={items} />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}