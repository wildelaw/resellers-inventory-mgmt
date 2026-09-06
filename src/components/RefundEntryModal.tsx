'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REFUND_TYPE_LABELS } from '@/lib/constants';

interface RefundEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  soldPrice: number;
  onRefunded?: () => void;
}

export default function RefundEntryModal({
  isOpen,
  onClose,
  saleId,
  soldPrice,
  onRefunded,
}: RefundEntryModalProps) {
  const router = useRouter();
  const [refundAmount, setRefundAmount] = useState(String(soldPrice));
  const [refundType, setRefundType] = useState('refund_no_return');
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          refundAmount,
          refundType,
          refundReason: refundReason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to process refund');
        return;
      }

      onRefunded?.();
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-lg w-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Process Refund</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="refund-amount">
              Refund Amount *
            </label>
            <input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={soldPrice}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="refund-type">
              Refund Type
            </label>
            <select
              id="refund-type"
              value={refundType}
              onChange={(e) => setRefundType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="refund_no_return">{REFUND_TYPE_LABELS.refund_no_return} — item stays sold</option>
              <option value="refund_with_return">{REFUND_TYPE_LABELS.refund_with_return} — item becomes returned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="refund-reason">
              Reason
            </label>
            <textarea
              id="refund-reason"
              rows={3}
              maxLength={500}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? 'Processing…' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}