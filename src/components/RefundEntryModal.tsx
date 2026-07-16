"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REFUND_TYPE_LABELS, ALL_REFUND_TYPES, type RefundType } from "@/lib/constants";

interface RefundEntryModalProps {
  open: boolean;
  saleId: number;
  onClose: () => void;
}

export default function RefundEntryModal({ open, saleId, onClose }: RefundEntryModalProps) {
  const router = useRouter();
  const [refundType, setRefundType] = useState<RefundType>("refund_no_return");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId,
          refundAmount: parseFloat(refundAmount) || 0,
          refundReason: refundReason || null,
          refundType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Refund Type</label>
            <select
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as RefundType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            >
              {ALL_REFUND_TYPES.filter((r) => r !== "none").map((r) => (
                <option key={r} value={r}>
                  {REFUND_TYPE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Refund Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {busy ? "Processing..." : "Process Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
