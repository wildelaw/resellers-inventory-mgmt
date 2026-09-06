'use client';

import { useState } from 'react';
import PageShell from '@/components/page-shell';

const IMPORT_TYPES = [
  { value: 'inventory', label: 'Inventory Items' },
  { value: 'sales', label: 'Sales' },
  { value: 'mileage', label: 'Mileage Trips' },
] as const;

type ImportType = (typeof IMPORT_TYPES)[number]['value'];

const REQUIRED_HINTS: Record<ImportType, string[]> = {
  inventory: ['name (required)', 'purchasePrice (required)', 'purchaseDate', 'purchaseLocation', 'category', 'description', 'notes'],
  sales: ['soldPrice (required)', 'soldDate (required)', 'itemName', 'itemId', 'platform', 'shippingCost', 'salesTax', 'platformFees'],
  mileage: ['date', 'miles', 'fromLocation', 'toLocation', 'vehicle', 'purpose'],
};

interface ParsedPreview {
  headers: string[];
  rows: Record<string, string>[];
}

export default function ImportsPage() {
  const [type, setType] = useState<ImportType>('inventory');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  const targetColumns: Record<ImportType, string[]> = {
    inventory: ['name', 'purchasePrice', 'purchaseDate', 'purchaseLocation', 'category', 'description', 'notes'],
    sales: ['itemId', 'itemName', 'soldPrice', 'soldDate', 'platform', 'shippingCost', 'shippingCollected', 'salesTax', 'platformFees', 'refundAmount'],
    mileage: ['date', 'miles', 'fromLocation', 'toLocation', 'address', 'vehicle', 'purpose'],
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    setMappings({});
    setResult(null);
    setError('');
    if (!f) return;
    if (f.size > 1024 * 1024) {
      setError('File exceeds the 1MB limit');
      return;
    }
    const text = await f.text();
    setCsvData(text);

    // Local preview: parse first data row for mapping UI
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError('CSV needs a header row and at least one data row');
      return;
    }
    // Minimal comma-split preview (the server does the authoritative parse)
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1, 4).map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
      return row;
    });
    setPreview({ headers, rows });
    setMappings(Object.fromEntries(headers.map((h) => [h, h])));
  };

  const handleImport = async () => {
    if (!csvData) return;
    setError('');
    setResult(null);
    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, csvData, columnMappings: mappings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ? data.details.join('. ') : data.error || 'Import failed');
        return;
      }
      setResult({ success: data.success, errors: data.errors ?? [] });
    } finally {
      setImporting(false);
    }
  };

  const inputCls = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">CSV Import</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-3xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value as ImportType); setPreview(null); setMappings({}); setResult(null); }} className={inputCls}>
            {IMPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Recognized columns for {type}:</p>
          <p>{REQUIRED_HINTS[type].join(', ')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CSV File (max 1MB)</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-900 dark:text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:px-3 file:py-1.5"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
        )}

        {preview && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Column Mapping</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 py-2 pr-4">CSV Header</th>
                    <th className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 py-2">Maps To</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.headers.map((h) => (
                    <tr key={h}>
                      <td className="py-1.5 pr-4 text-gray-900 dark:text-white">{h}</td>
                      <td className="py-1.5">
                        <select
                          value={mappings[h] ?? ''}
                          onChange={(e) => setMappings((m) => ({ ...m, [h]: e.target.value }))}
                          className={inputCls}
                        >
                          <option value="">— ignore —</option>
                          {targetColumns[type].map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {preview && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">First Rows Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    {preview.headers.map((h) => <th key={h} className="text-left px-2 py-1.5 uppercase text-gray-500 dark:text-gray-400">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => <td key={h} className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!csvData || importing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import'}
        </button>

        {result && (
          <div className="p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md text-sm">
            <p className="font-medium">{result.success} row{result.success === 1 ? '' : 's'} imported.</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}