'use client';

import { useState, FormEvent } from 'react';

interface RefundEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saleId: number;
  soldPrice: number;
  itemStatus?: string;
}

export default function RefundEntryModal({
  isOpen,
  onClose,
  onSuccess,
  saleId,
  soldPrice,
  itemStatus,
}: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          refundAmount: parseFloat(refundAmount),
          refundReason,
          refundType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund');

      setRefundAmount('');
      setRefundReason('');
      setRefundType('refund_no_return');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Process Refund
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refund Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="refund_no_return"
                    checked={refundType === 'refund_no_return'}
                    onChange={() => setRefundType('refund_no_return')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Refund without return (item stays sold)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="refund_with_return"
                    checked={refundType === 'refund_with_return'}
                    onChange={() => setRefundType('refund_with_return')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Refund with return (item status → returned)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refund Amount *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={soldPrice}
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Original sale price: ${soldPrice.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refund Reason *
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className={inputClass}
                placeholder="Explain the reason for the refund..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
