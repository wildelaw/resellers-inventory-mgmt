'use client';

import { useState } from 'react';
import Header from '@/components/header';

export default function ImportPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  const handleImport = async (e: React.FormEvent) => {
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }

      const data = await res.json();
      setResult(data);
      setCsvData('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">CSV Import</h1>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

        {result && (
          <div className="mb-4 card">
            <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">Import Complete</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">Successfully imported: {result.success} rows</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-red-600 dark:text-red-400">Errors ({result.errors.length}):</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside mt-1 max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 20).map((err, i) => <li key={i}>{err}</li>)}
                  {result.errors.length > 20 && <li>...and {result.errors.length - 20} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleImport} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="input-field">
              <option value="inventory">Inventory Items</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload CSV File</label>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or paste CSV data</label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={10}
              className="input-field font-mono text-xs"
              placeholder="name,purchase_date,purchase_price&#10;Item 1,2024-01-15,25.00"
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Max 1MB / 32,000 rows. Headers are auto-matched using fuzzy matching.</p>
            {type === 'inventory' && <p className="mt-1">Required field: name. Other fields auto-parsed.</p>}
            {type === 'sales' && <p className="mt-1">Items auto-matched by ID or name. New items created if no match.</p>}
            {type === 'mileage' && <p className="mt-1">Required fields: date, miles.</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading || !csvData} className="btn-primary">
              {loading ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}