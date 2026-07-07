'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({ company_name: '', company_tagline: '', sales_tax_rate: 0.0825 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupData, setBackupData] = useState('');
  const [restoring, setRestoring] = useState(false);
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white';

  useEffect(() => { fetch('/api/settings').then((r) => r.json()).then(setSettings).catch(() => {}); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setMessage('Settings saved');
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setSaving(false); }
  };

  const handleDownload = () => { window.location.href = '/api/admin/backup'; };

  const handleRestore = async () => {
    setRestoring(true); setError(null); setMessage(null);
    try {
      const parsed = JSON.parse(backupData);
      const res = await fetch('/api/admin/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Restore failed'); }
      setMessage('Backup restored successfully'); setBackupData('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid backup data'); } finally { setRestoring(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Company</h2>
          <div><label className="block text-sm mb-1">Company Name</label><input value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Tagline</label><input value={settings.company_tagline} onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Sales Tax Rate (0–1)</label><input type="number" step="0.0001" min="0" max="1" value={settings.sales_tax_rate} onChange={(e) => setSettings({ ...settings, sales_tax_rate: parseFloat(e.target.value) })} className={inputClass} /></div>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save Settings'}</button>
        </form>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Backup & Restore</h2>
          <button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">Download Backup</button>
          <div><label className="block text-sm mb-1">Restore from Backup (paste JSON)</label><textarea value={backupData} onChange={(e) => setBackupData(e.target.value)} className={inputClass} rows={8} placeholder="Paste backup JSON..." /></div>
          <button onClick={handleRestore} disabled={restoring || !backupData} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">{restoring ? 'Restoring...' : 'Restore'}</button>
        </div>
      </main>
    </div>
  );
}
