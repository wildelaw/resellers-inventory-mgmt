'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [salesTaxRate, setSalesTaxRate] = useState('0.0825');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setCompanyName(data.company_name || '');
      setCompanyTagline(data.company_tagline || '');
      setSalesTaxRate(String(data.sales_tax_rate ?? 0.0825));
    }).catch(() => {});
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, companyTagline, salesTaxRate: parseFloat(salesTaxRate) }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setMessage('Settings saved');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const exportBackup = async () => {
    const res = await fetch('/api/admin/backup');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const r = await res.json(); throw new Error(r.error || 'Restore failed'); }
      setMessage('Backup restored successfully');
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
        <form onSubmit={saveSettings} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Settings</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label><input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Tagline</label><input type="text" value={companyTagline} onChange={e => setCompanyTagline(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Tax Rate (0-1)</label><input type="number" step="0.0001" min="0" max="1" value={salesTaxRate} onChange={e => setSalesTaxRate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
          </div>
          <button type="submit" disabled={loading} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Save Settings'}</button>
        </form>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Backup & Restore</h2>
          <div className="space-y-4">
            <button onClick={exportBackup} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">Download Backup</button>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Restore from Backup</label><input type="file" accept=".json" onChange={importBackup} className="mt-1" /></div>
          </div>
        </div>
      </main>
    </div>
  );
}