'use client';

import { useState, useCallback } from 'react';
import Header from '@/components/header';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ImportPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, csvData }),
      });
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      setResult(data);
    } finally {
      setBusy(false);
    }
  }, [type, csvData]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Import CSV</h1>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>CSV data *</label>
            <textarea
              rows={12}
              required
              className={`${inputCls} font-mono text-xs`}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="name,purchase_date,purchase_price&#10;Jacket,2024-01-15,25.00"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max 1MB and 32,000 rows. Headers are auto-matched; provide canonical names for best results.
            </p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </form>
        {result && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm">
              <strong>{result.success}</strong> row(s) imported.
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Errors:</div>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {result.errors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}