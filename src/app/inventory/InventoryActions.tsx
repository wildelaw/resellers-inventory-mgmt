"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import SalesEntryModal from "@/components/SalesEntryModal";
import { formatCurrency, formatDate, statusColor, getPhotoUrl } from "@/lib/utils";
import { ALL_STATUSES, STATUS_LABELS, type ItemStatus } from "@/lib/constants";
import type { Item, Photo, Sale } from "@/lib/schema";

interface ItemWithRelations extends Item {
  photos: Photo[];
  sales: Sale[];
}

interface InitialData {
  items: ItemWithRelations[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function InventoryActions({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>("listed");
  const [busy, setBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [saleItem, setSaleItem] = useState<{ id: number; name: string; purchasePrice: number } | null>(null);

  const allSelected =
    initial.items.length > 0 && initial.items.every((i) => selected.has(i.id));

  function toggle(id: number) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(initial.items.map((i) => i.id)));
    }
  }

  async function bulkUpdate() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status: bulkStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `HTTP ${res.status}`);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/bulk?ids=${Array.from(selected).join(",")}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `HTTP ${res.status}`);
        return;
      }
      setSelected(new Set());
      setConfirmDeleteOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteOne(id: number) {
    if (!confirm("Delete this item and all associated photos/sales?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
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
    <div>
      {selected.size > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm">{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ItemStatus)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-sm"
          >
            {ALL_STATUSES.map((s: ItemStatus) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={bulkUpdate}
            disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Update Status
          </button>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={busy}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Delete
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-left">Purchased</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            )}
            {initial.items.map((it) => {
              const photo = it.photos.find((p) => p.isPrimary) || it.photos[0];
              return (
                <tr key={it.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={() => toggle(it.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {photo ? (
                        <img
                          src={getPhotoUrl(it.id, photo.filename)}
                          alt={it.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                      )}
                      <Link
                        href={`/inventory/${it.id}`}
                        className="font-medium hover:underline"
                      >
                        {it.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "px-2 py-1 rounded text-xs font-medium capitalize " + statusColor(it.status)
                      }
                    >
                      {STATUS_LABELS[it.status as ItemStatus] ?? it.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(it.purchasePrice)}</td>
                  <td className="px-3 py-2">{formatDate(it.purchaseDate)}</td>
                  <td className="px-3 py-2">{it.category ?? ""}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() =>
                          setSaleItem({ id: it.id, name: it.name, purchasePrice: it.purchasePrice })
                        }
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Sell
                      </button>
                      <Link
                        href={`/inventory/${it.id}/edit`}
                        className="text-gray-600 hover:underline text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteOne(it.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {initial.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 text-sm">
          {Array.from({ length: initial.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/inventory?page=${p}`}
              className={
                "px-3 py-1 rounded " +
                (p === initial.pagination.page
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700")
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete Items"
        message={`Permanently delete ${selected.size} item(s)? This will also remove associated photos and sales.`}
        confirmLabel="Delete"
        danger
        onConfirm={bulkDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <SalesEntryModal
        open={!!saleItem}
        onClose={() => setSaleItem(null)}
        itemId={saleItem?.id}
        itemName={saleItem?.name}
        itemPurchasePrice={saleItem?.purchasePrice}
      />
    </div>
  );
}
