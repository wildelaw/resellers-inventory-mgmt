'use client';

import { useState, useRef } from 'react';
import Header from '@/components/header';

type ImportType = 'inventory' | 'sales' | 'mileage';

interface ImportResult {
  imported: number;
  skipped: number;
  errors?: string[];
}

export default function ImportsPage() {
  const [importType, setImportType] = useState<ImportType>('inventory');
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please provide CSV data');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, csvData: csvText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult(data);
      setCsvText('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">CSV Import</h1>

        {result && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Import complete: {result.imported} imported, {result.skipped} skipped
            </p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-400">• {e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Import Type</label>
            <div className="flex gap-4">
              {(['inventory', 'sales', 'mileage'] as ImportType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={importType === type}
                    onChange={() => setImportType(type)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSV File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or paste CSV data
            </label>
            <textarea
              rows={10}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Paste CSV content here..."
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Expected columns:</p>
            {importType === 'inventory' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                name (required), description, purchaseDate, purchasePrice, purchaseLocation, category, notes
              </p>
            )}
            {importType === 'sales' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                soldDate (required), soldPrice (required), platform (required), itemId or itemName, shippingCost, shippingCollected, salesTax, platformFees
              </p>
            )}
            {importType === 'mileage' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                date (required), miles (required), fromLocation, toLocation, address, vehicle, purpose
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
            className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing...' : 'Import CSV'}
          </button>
        </div>
      </main>
    </div>
  );
}
