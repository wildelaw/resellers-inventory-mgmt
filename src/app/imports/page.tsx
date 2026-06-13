'use client';

import { useState } from 'react';
import Header from '@/components/header';

type ImportType = 'inventory' | 'sales' | 'mileage';

const SAMPLE_HEADERS: Record<ImportType, string[]> = {
  inventory: ['name', 'purchaseDate', 'purchasePrice', 'purchaseLocation', 'category', 'description', 'notes'],
  sales: ['soldDate', 'soldPrice', 'platform', 'shippingCost', 'shippingCollected', 'salesTax', 'platformFees', 'itemId'],
  mileage: ['date', 'miles', 'fromLocation', 'toLocation', 'address', 'vehicle', 'purpose'],
};

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('inventory');
  const [csvData, setCsvData] = useState('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      // Auto-guess column mappings from headers
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const mappings: Record<string, string> = {};
        const expectedHeaders = SAMPLE_HEADERS[importType];
        for (const header of headers) {
          for (const expected of expectedHeaders) {
            if (header.includes(expected.toLowerCase()) || expected.toLowerCase().includes(header)) {
              mappings[header] = expected;
              break;
            }
          }
          if (!mappings[header]) {
            mappings[header] = header;
          }
        }
        setColumnMappings(mappings);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          csvData,
          columnMappings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const parsedHeaders = csvData ? csvData.split('\n')[0]?.split(',').map((h) => h.trim()) || [] : [];

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Import CSV</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
            <p className="text-green-800 font-medium">Import completed!</p>
            <p className="text-green-700 text-sm">{result.success} records imported successfully.</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-700 text-sm font-medium">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>...and {result.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {/* Import Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Import Type *
            </label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ImportType);
                setCsvData('');
                setColumnMappings({});
                setResult(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="inventory">Inventory Items</option>
              <option value="sales">Sales</option>
              <option value="mileage">Mileage Entries</option>
            </select>
          </div>

          {/* Expected Columns Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Expected columns for {importType}:</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              {SAMPLE_HEADERS[importType].join(', ')}
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Paste CSV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Or paste CSV data
            </label>
            <textarea
              rows={8}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="Paste CSV data here..."
            />
          </div>

          {/* Column Mapping */}
          {parsedHeaders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Column Mappings
              </label>
              <div className="space-y-2">
                {parsedHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-40 truncate" title={header}>
                      {header}
                    </span>
                    <span className="text-gray-400">&rarr;</span>
                    <input
                      type="text"
                      value={columnMappings[header] || header}
                      onChange={(e) => setColumnMappings({ ...columnMappings, [header]: e.target.value })}
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              disabled={loading || !csvData}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
            >
              {loading ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}