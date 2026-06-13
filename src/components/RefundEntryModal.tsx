'use client';

import { useState } from 'react';
import { REFUND_TYPES } from '@/lib/constants';

interface RefundEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { saleId: number; refundAmount: number; refundType: string; refundReason: string }) => Promise<void>;
  saleId: number;
  salePrice: number;
}

export default function RefundEntryModal({ isOpen, onClose, onSubmit, saleId, salePrice }: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState(String(salePrice));
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_with_return');
  const [refundReason, setRefundReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit({
        saleId,
        refundAmount: parseFloat(refundAmount),
        refundType,
        refundReason,
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Process Refund</h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refund Amount</label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refund Type</label>
            <select
              value={refundType}
              onChange={e => setRefundType(e.target.value as 'refund_no_return' | 'refund_with_return')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="refund_with_return">Refund with Return (item returns to inventory)</option>
              <option value="refund_no_return">Refund No Return (item stays sold)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refund Reason</label>
            <textarea
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
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