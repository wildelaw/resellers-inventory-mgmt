"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import { formatDate } from "@/lib/utils";
import type { Mileage } from "@/lib/schema";

interface InitialData {
  items: Mileage[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function MileageActions({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!deleteId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/mileage/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `HTTP ${res.status}`);
        return;
      }
      setDeleteId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Miles</th>
              <th className="px-3 py-2 text-left">From</th>
              <th className="px-3 py-2 text-left">To</th>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-left">Purpose</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No mileage entries.
                </td>
              </tr>
            )}
            {initial.items.map((m) => (
              <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-3 py-2">{formatDate(m.date)}</td>
                <td className="px-3 py-2 text-right">{m.miles.toFixed(1)}</td>
                <td className="px-3 py-2">{m.fromLocation ?? "—"}</td>
                <td className="px-3 py-2">{m.toLocation ?? "—"}</td>
                <td className="px-3 py-2">{m.vehicle ?? "—"}</td>
                <td className="px-3 py-2">{m.purpose ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <Link
                      href={`/mileage/${m.id}/edit`}
                      className="text-gray-600 hover:underline text-xs"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete Mileage Entry"
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
