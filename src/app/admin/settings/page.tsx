'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({ company_name: '', company_tagline: '', sales_tax_rate: 0.0825 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupData, setBackupData] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: settings.company_name,
          companyTagline: settings.company_tagline,
          salesTaxRate: parseFloat(String(settings.sales_tax_rate)) || 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess('Settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    const res = await fetch('/api/admin/backup');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = JSON.parse(backupData);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.details?.join(', ') || 'Restore failed');
      }
      setSuccess('Backup restored successfully');
      setBackupData('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid backup data');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

        <form onSubmit={handleSave} className="card mb-6 space-y-4">
          <h2 className="text-xl font-semibold">Company Settings</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input type="text" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} className="input-field" maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Tagline</label>
            <input type="text" value={settings.company_tagline} onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })} className="input-field" maxLength={500} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sales Tax Rate (0–1)</label>
            <input type="number" step="0.0001" min="0" max="1" value={settings.sales_tax_rate} onChange={(e) => setSettings({ ...settings, sales_tax_rate: parseFloat(e.target.value) })} className="input-field" />
            <p className="mt-1 text-xs text-gray-500">e.g., 0.0825 for 8.25%</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Settings'}</button>
        </form>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
          <button onClick={handleDownloadBackup} className="btn-secondary mb-4">Download Backup</button>
          <form onSubmit={handleRestore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Restore from Backup JSON</label>
              <textarea
                value={backupData}
                onChange={(e) => setBackupData(e.target.value)}
                className="input-field font-mono text-sm"
                rows={6}
                placeholder="Paste backup JSON here..."
              />
            </div>
            <button type="submit" disabled={restoreLoading} className="btn-danger">{restoreLoading ? 'Restoring...' : 'Restore Backup'}</button>
            <p className="text-xs text-gray-500">Warning: Restore will replace all current data.</p>
          </form>
        </div>
      </main>
    </div>
  );
}