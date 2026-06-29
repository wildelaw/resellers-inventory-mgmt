'use client';

import { useState } from 'react';
import ClientShell from '@/components/client-shell';
import { apiPost } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ImportsPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setResult(null);
    const res = await apiPost<{ success: number; errors: string[] }>('/api/import', { type, csvData });
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Import failed'); return; }
    setResult(res.data ?? null);
  }

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">CSV Import</h1>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl space-y-4">
        <div>
          <label className={labelClass}>Type</label>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as 'inventory' | 'sales' | 'mileage')}>
            <option value="inventory">Inventory</option>
            <option value="sales">Sales</option>
            <option value="mileage">Mileage</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>CSV data</label>
          <textarea className={inputClass} rows={10} value={csvData} onChange={(e) => setCsvData(e.target.value)} required
            placeholder="name,purchase_date,purchase_price&#10;Jacket,2024-01-15,25.00" />
          <p className="text-xs text-gray-500 mt-1">Max 1MB / 32,000 rows. Headers are fuzzy-matched to field names.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{busy ? 'Importing…' : 'Import'}</button>
      </form>
      {result && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl">
          <p className="font-medium">Imported {result.success} row(s).</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-sm text-orange-700 dark:text-orange-400 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </ClientShell>
  );
}