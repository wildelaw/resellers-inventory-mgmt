"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSaleForm } from "@/hooks/useSaleForm";
import SaleFormFields from "@/components/SaleFormFields";
import { ALL_PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/constants";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: number;
  status: string;
}

export default function NewSaleForm({ inventory }: { inventory: InventoryItem[] }) {
  const router = useRouter();
  const form = useSaleForm();
  const [itemId, setItemId] = useState<number | "">("");
  const [itemName, setItemName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0.0825);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.salesTaxRate) {
          setTaxRate(d.salesTaxRate);
          form.setTaxRate(d.salesTaxRate);
        }
      })
      .catch(() => null);
  }, [form]);

  useEffect(() => {
    if (itemId) {
      const it = inventory.find((i) => i.id === itemId);
      if (it) {
        setItemName(it.name);
        setPurchasePrice(String(it.purchasePrice));
      }
    }
  }, [itemId, inventory]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        soldDate: Math.floor(Date.now() / 1000),
        soldPrice: parseFloat(form.state.soldPrice) || 0,
        platform: form.state.platform,
        shippingCost: parseFloat(form.state.shippingCost) || 0,
        shippingCollected: parseFloat(form.state.shippingCollected) || 0,
        salesTax: form.state.salesTax ? parseFloat(form.state.salesTax) : form.computedSalesTax,
        platformFees: parseFloat(form.state.platformFees) || 0,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
      };
      if (itemId) payload.itemId = itemId;
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
      const sale = await res.json();
      router.push(`/sales/${sale.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Inventory Item</label>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        >
          <option value="">— None / new item —</option>
          {inventory.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} (${i.purchasePrice.toFixed(2)})
            </option>
          ))}
        </select>
      </div>
      {!itemId && (
        <div>
          <label className="block text-sm font-medium mb-1">Item Name (optional)</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Purchase Price (if not from inventory)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <SaleFormFields form={form} />
      {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          {busy ? "Saving..." : "Record Sale"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/sales")}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
