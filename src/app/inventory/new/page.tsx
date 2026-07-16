"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: "",
    purchaseLocation: "",
    category: "",
    notes: "",
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
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          purchaseDate: form.purchaseDate,
          purchasePrice: form.purchasePrice,
          purchaseLocation: form.purchaseLocation || null,
          category: form.category || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const item = await res.json();
      router.push(`/inventory/${item.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">New Inventory Item</h1>
        <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <Field label="Name" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Purchase Date" required>
              <input
                type="date"
                required
                value={form.purchaseDate}
                onChange={(e) => update("purchaseDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </Field>
            <Field label="Purchase Price" required>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.purchasePrice}
                onChange={(e) => update("purchasePrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location">
              <input
                type="text"
                value={form.purchaseLocation}
                onChange={(e) => update("purchaseLocation", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </Field>
            <Field label="Category">
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </Field>
          {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              {busy ? "Saving..." : "Create Item"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/inventory")}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
