'use client';
import { useState } from 'react';
import Header from '@/components/header';

export default function ImportPage() {
  const [type, setType] = useState<'inventory' | 'sales' | 'mileage'>('inventory');
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvData(reader.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, csvData }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Import failed'); }
      setResult(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setImporting(false); }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">CSV Import</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {result && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
            Imported {result.success} rows.
            {result.errors.length > 0 && <details className="mt-2"><summary className="cursor-pointer">{result.errors.length} errors</summary><ul className="mt-1 list-disc pl-5">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <div><label className="block text-sm mb-1">Type</label><select value={type} onChange={(e) => setType(e.target.value as 'inventory' | 'sales' | 'mileage')} className={inputClass}><option value="inventory">Inventory</option><option value="sales">Sales</option><option value="mileage">Mileage</option></select></div>
          <div><label className="block text-sm mb-1">CSV File</label><input type="file" accept=".csv" onChange={handleFile} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Or paste CSV data</label><textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} className={inputClass} rows={6} placeholder="name,purchase_date,purchase_price&#10;Item,2024-01-15,25.00" /></div>
          <button onClick={handleImport} disabled={importing || !csvData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{importing ? 'Importing...' : 'Import'}</button>
        </div>
      </main>
    </div>
  );
}
