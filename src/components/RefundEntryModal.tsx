'use client';

import { useState, useCallback } from 'react';

interface Props {
  open: boolean;
  saleId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RefundEntryModal({ open, saleId, onClose, onSaved }: Props) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = useCallback(async () => {
    if (!saleId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          refundAmount: Number(refundAmount),
          refundReason: refundReason || null,
          refundType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Refund failed' }));
        setError(data.error || 'Refund failed');
        return;
      }
      setRefundAmount('');
      setRefundReason('');
      setRefundType('refund_no_return');
      onSaved();
    } finally {
      setBusy(false);
    }
  }, [saleId, refundAmount, refundReason, refundType, onSaved]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Process refund</h3>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Refund type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as typeof refundType)}
            >
              <option value="refund_no_return">Refund — no return (item stays sold)</option>
              <option value="refund_with_return">Refund with return (item becomes returned)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Refund amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
        </div>
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
            onClick={handle}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            disabled={busy}
          >
            {busy ? 'Processing…' : 'Process refund'}
          </button>
        </div>
      </div>
    </div>
  );
}