"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RefundEntryModal from "@/components/RefundEntryModal";
import ConfirmModal from "@/components/ConfirmModal";

interface SaleDetailActionsProps {
  saleId: number;
  canRefund: boolean;
}

export default function SaleDetailActions({ saleId, canRefund }: SaleDetailActionsProps) {
  const router = useRouter();
  const [refundOpen, setRefundOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `HTTP ${res.status}`);
        return;
      }
      router.push("/sales");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canRefund && (
        <button
          onClick={() => setRefundOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md text-sm"
        >
          Process Refund
        </button>
      )}
      <button
        onClick={() => setDeleteOpen(true)}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm"
      >
        Delete Sale
      </button>
      <RefundEntryModal open={refundOpen} saleId={saleId} onClose={() => setRefundOpen(false)} />
      <ConfirmModal
        open={deleteOpen}
        title="Delete Sale"
        message="This will permanently delete the sale record. Item status will revert to available."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
