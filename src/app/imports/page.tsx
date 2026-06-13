'use client';
import { useState } from 'react';
import Header from '@/components/header';
import Papa from 'papaparse';

export default function ImportPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => { setCsvData(Papa.unparse(results.data)); } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, csvData, columnMappings: Object.keys(columnMappings).length > 0 ? columnMappings : undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Import failed');
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Import Data</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        {result && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">Successfully imported {result.success} rows{result.errors ? ` with ${result.errors.length} errors` : ''}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label><select value={type} onChange={e => setType(e.target.value as any)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"><option value="inventory">Inventory</option><option value="sales">Sales</option><option value="mileage">Mileage</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload CSV File</label><input type="file" accept=".csv" onChange={handleFileUpload} className="mt-1 w-full" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Or paste CSV data</label><textarea value={csvData} onChange={e => setCsvData(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" rows={10} placeholder="Paste CSV data here" /></div>
          <button type="submit" disabled={loading || !csvData} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{loading ? 'Importing...' : 'Import'}</button>
        </form>
      </main>
    </div>
  );
}
