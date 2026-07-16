"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_STATUSES, STATUS_LABELS, isValidTransition, getAllowedTransitions, type ItemStatus } from "@/lib/constants";

interface ItemDetailActionsProps {
  itemId: number;
  status: string;
}

export default function ItemDetailActions({ itemId, status }: ItemDetailActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const allowed = getAllowedTransitions(status as ItemStatus);

  async function changeStatus(newStatus: ItemStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`/inventory/${itemId}/edit`}
        className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md text-sm"
      >
        Edit
      </a>
      {allowed.map((s) => (
        <button
          key={s}
          onClick={() => changeStatus(s)}
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
        >
          Mark as {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
