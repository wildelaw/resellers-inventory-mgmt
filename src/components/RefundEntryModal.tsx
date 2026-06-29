'use client';

import { useState } from 'react';
import { apiPatch } from '@/lib/api-client';

export interface RefundEntryModalProps {
  open: boolean;
  saleId: number;
  onClose: () => void;
  onRefunded: () => void;
}

export default function RefundEntryModal({ open, saleId, onClose, onRefunded }: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await apiPatch('/api/sales', {
      saleId,
      refundAmount: Number(refundAmount) || 0,
      refundReason: refundReason || null,
      refundType,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to process refund'); return; }
    onRefunded();
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="refundAmount">Refund amount ($)</label>
            <input id="refundAmount" type="number" step="0.01" min="0" className={inputClass}
              value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="refundType">Refund type</label>
            <select id="refundType" className={inputClass} value={refundType}
              onChange={(e) => setRefundType(e.target.value as 'refund_no_return' | 'refund_with_return')}>
              <option value="refund_no_return">Refund (no return) — item stays sold</option>
              <option value="refund_with_return">Refund with return — item becomes returned</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="refundReason">Reason</label>
            <textarea id="refundReason" className={inputClass} rows={2}
              value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">
              {saving ? 'Processing…' : 'Process refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}