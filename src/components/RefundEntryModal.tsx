'use client';

import { useState } from 'react';

interface RefundEntryModalProps {
  open: boolean;
  saleId: number;
  salePrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundEntryModal({ open, saleId, salePrice, onClose, onSuccess }: RefundEntryModalProps) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundType, setRefundType] = useState<'refund_no_return' | 'refund_with_return'>('refund_no_return');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        const data = await res.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Process Refund</h2>

        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
          <span className="text-sm text-gray-600 dark:text-gray-300">Original Sale Price: </span>
          <span className="font-medium text-gray-900 dark:text-white">${salePrice.toFixed(2)}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
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
              max={salePrice}
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Type *
            </label>
            <select
              required
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as any)}
              className="input-field"
            >
              <option value="refund_no_return">Refund (No Return) — item stays sold</option>
              <option value="refund_with_return">Refund with Return — item becomes returned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refund Reason
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
              placeholder="Optional reason for refund"
              className="input-field"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-danger">
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}