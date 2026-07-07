'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_tagline: '',
    sales_tax_rate: 0.0825,
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Backup/restore
  const [restoreData, setRestoreData] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings({
        company_name: data.company_name || '',
        company_tagline: data.company_tagline || '',
        sales_tax_rate: data.sales_tax_rate || 0.0825,
      }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setMsg('Settings saved successfully');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    window.open('/api/admin/backup', '_blank');
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreLoading(true);
    setError('');

    try {
      const parsed = JSON.parse(restoreData);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Restore failed');
      }

      setMsg('Backup restored successfully');
      setRestoreData('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h1>

        {msg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">{msg}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSave} className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Company Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <input type="text" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Tagline</label>
              <input type="text" value={settings.company_tagline} onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Tax Rate (0-1)</label>
              <input type="number" step="0.0001" min="0" max="1" value={settings.sales_tax_rate} onChange={(e) => setSettings({ ...settings, sales_tax_rate: Number(e.target.value) })} className="input-field" />
              <p className="text-xs text-gray-500 mt-1">e.g., 0.0825 for 8.25%</p>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-4">{loading ? 'Saving...' : 'Save Settings'}</button>
        </form>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Backup & Restore</h2>
          <button onClick={handleBackup} className="btn-secondary mb-4">Download Backup (JSON)</button>

          <form onSubmit={handleRestore} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Restore from Backup</label>
            <textarea
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              rows={6}
              className="input-field font-mono text-xs"
              placeholder='{"version":2,"tables":{...}}'
            />
            <p className="text-xs text-orange-600 dark:text-orange-400">Warning: This will replace ALL data. All rows are validated before any changes are made.</p>
            <button type="submit" disabled={restoreLoading || !restoreData} className="btn-danger">
              {restoreLoading ? 'Restoring...' : 'Restore Backup'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}