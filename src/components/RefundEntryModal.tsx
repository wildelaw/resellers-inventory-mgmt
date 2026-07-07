'use client';
import { useState } from 'react';

interface RefundEntryModalProps {
  open: boolean;
  saleId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundEntryModal({ open, saleId, onClose, onSuccess }: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || saleId === null) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          refundAmount,
          refundReason: refundReason || null,
          refundType,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process refund');
      }
      setRefundAmount('');
      setRefundReason('');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Process Refund</h3>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Refund Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Refund Type</label>
            <select
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as 'refund_no_return' | 'refund_with_return')}
              className={inputClass}
            >
              <option value="refund_no_return">Refund (no return)</option>
              <option value="refund_with_return">Refund with return</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className={inputClass}
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !refundAmount}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Process Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
