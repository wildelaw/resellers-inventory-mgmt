"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSaleForm } from "@/hooks/useSaleForm";
import SaleFormFields from "./SaleFormFields";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: number;
  status: string;
}

interface SalesEntryModalProps {
  open: boolean;
  onClose: () => void;
  itemId?: number;
  itemName?: string;
  itemPurchasePrice?: number;
}

export default function SalesEntryModal({
  open,
  onClose,
  itemId,
  itemName,
  itemPurchasePrice,
}: SalesEntryModalProps) {
  const router = useRouter();
  const form = useSaleForm({
    purchasePrice: itemPurchasePrice ? String(itemPurchasePrice) : "0",
  });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | "">(itemId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0.0825);

  useEffect(() => {
    if (open) {
      fetch("/api/settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.salesTaxRate) {
            setTaxRate(d.salesTaxRate);
            form.setTaxRate(d.salesTaxRate);
          }
        })
        .catch(() => null);
      if (!itemId) {
        fetch("/api/inventory?pageSize=100")
          .then((r) => r.json())
          .then((d) => setItems((d.items || []).filter((i: InventoryItem) => i.status === "available" || i.status === "listed")))
          .catch(() => null);
      }
    }
    if (!open) {
      setError(null);
      setBusy(false);
    }
  }, [open, itemId, form]);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        soldDate: Math.floor(Date.now() / 1000),
        soldPrice: parseFloat(form.state.soldPrice) || 0,
        platform: form.state.platform,
        shippingCost: parseFloat(form.state.shippingCost) || 0,
        shippingCollected: parseFloat(form.state.shippingCollected) || 0,
        salesTax: form.state.salesTax
          ? parseFloat(form.state.salesTax)
          : form.computedSalesTax,
        platformFees: parseFloat(form.state.platformFees) || 0,
      };
      if (selectedItemId) payload.itemId = selectedItemId;
      else if (itemName) payload.itemName = itemName;

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">Record Sale</h3>
        {!itemId && !itemName && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Inventory Item (optional)</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            >
              <option value="">— None / untracked —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (${i.purchasePrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}
        {itemName && (
          <div className="mb-4 text-sm">
            <span className="font-medium">Item:</span> {itemName}
          </div>
        )}
        <SaleFormFields form={form} />
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
            {busy ? "Saving..." : "Record Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
