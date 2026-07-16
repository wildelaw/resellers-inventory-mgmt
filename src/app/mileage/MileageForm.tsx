"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MileageForm({ initial }: { initial?: { id: number; date: number; miles: number; fromLocation: string | null; toLocation: string | null; address: string | null; vehicle: string | null; purpose: string | null } }) {
  const router = useRouter();
  const [form, setForm] = useState({
    date: initial?.date ? new Date(initial.date * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    miles: initial ? String(initial.miles) : "",
    fromLocation: initial?.fromLocation ?? "",
    toLocation: initial?.toLocation ?? "",
    address: initial?.address ?? "",
    vehicle: initial?.vehicle ?? "",
    purpose: initial?.purpose ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = initial ? `/api/mileage/${initial.id}` : "/api/mileage";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          miles: parseFloat(form.miles) || 0,
          fromLocation: form.fromLocation || null,
          toLocation: form.toLocation || null,
          address: form.address || null,
          vehicle: form.vehicle || null,
          purpose: form.purpose || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push("/mileage");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Miles</label>
          <input
            type="number"
            step="0.1"
            min="0"
            required
            value={form.miles}
            onChange={(e) => update("miles", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">From</label>
        <input
          type="text"
          value={form.fromLocation}
          onChange={(e) => update("fromLocation", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">To</label>
        <input
          type="text"
          value={form.toLocation}
          onChange={(e) => update("toLocation", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Vehicle</label>
        <input
          type="text"
          value={form.vehicle}
          onChange={(e) => update("vehicle", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Purpose</label>
        <input
          type="text"
          value={form.purpose}
          onChange={(e) => update("purpose", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
        />
      </div>
      {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          {busy ? "Saving..." : initial ? "Save Changes" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/mileage")}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
