'use client';

import { useState } from 'react';

interface RefundEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefund: (data: { saleId: number; refundAmount: number; refundReason: string; refundType: 'refund_no_return' | 'refund_with_return' }) => Promise<void>;
  saleId: number;
  salePrice: number;
}

export default function RefundEntryModal({
  isOpen,
  onClose,
  onRefund,
  saleId,
  salePrice,
}: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState(String(salePrice));
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onRefund({
        saleId,
        refundAmount: parseFloat(refundAmount) || 0,
        refundReason,
        refundType,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Process Refund
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Type *
            </label>
            <select
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as 'refund_no_return' | 'refund_with_return')}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="refund_no_return">Refund No Return</option>
              <option value="refund_with_return">Refund With Return</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {refundType === 'refund_with_return'
                ? 'Item will be marked as "Returned" and removal date cleared'
                : 'Item stays "Sold"; refund amount recorded'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Reason
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Reason for refund (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}