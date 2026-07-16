"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportType = "inventory" | "sales" | "mileage";

export default function ImportPage() {
  const router = useRouter();
  const [type, setType] = useState<ImportType>("inventory");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, csvData: csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: 0, errors: [data.error || `HTTP ${res.status}`] });
        return;
      }
      setResult({ success: data.success, errors: data.errors || [] });
      if (data.success > 0) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsv(text);
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Import CSV</h1>
        <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ImportType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            >
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CSV File</label>
            <input type="file" accept=".csv,text/csv" onChange={loadFile} className="w-full text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Or paste CSV data</label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              placeholder="name,purchase_date,purchase_price&#10;Vintage Jacket,2024-01-15,25.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !csv}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {busy ? "Importing..." : "Import"}
          </button>
        </form>
        {result && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-green-600 font-medium">Imported {result.success} row(s).</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-sm text-red-600 list-disc pl-5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
