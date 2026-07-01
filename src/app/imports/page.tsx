'use client';

import { useState } from 'react';
import Header from '@/components/header';

export default function ImportPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, csvData }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">CSV Import</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {result && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 rounded">
            <p className="font-semibold">Imported {result.success} rows</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Errors:</p>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Import Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'inventory' | 'sales' | 'mileage')} className="input-field">
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CSV Data *</label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="input-field font-mono text-sm"
              rows={10}
              placeholder="name,purchase_date,purchase_price&#10;Item,2024-01-15,25.00"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Max 1MB, 32,000 rows. Headers are fuzzy-matched.</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Importing...' : 'Import'}</button>
        </form>
      </main>
    </div>
  );
}