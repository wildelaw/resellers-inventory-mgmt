'use client';

import { useState } from 'react';
import Header from '@/components/header';
import { useSession } from 'next-auth/react';

export default function ImportsPage() {
  const { data: session } = useSession();
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
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">CSV Import</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CSV Data</label>
            <textarea value={csvData} onChange={e => setCsvData(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm" rows={10} placeholder="Paste CSV data here..." />
          </div>
          <button type="submit" disabled={loading || !csvData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Importing...' : 'Import'}</button>
          {result && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded">
              <p className="text-green-700 dark:text-green-300 font-semibold">Successfully imported {result.success} rows</p>
              {result.errors.length > 0 && (<div className="mt-2"><p className="text-orange-600 dark:text-orange-300 font-semibold">Errors:</p><ul className="list-disc list-inside text-sm text-orange-600 dark:text-orange-300">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>)}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}