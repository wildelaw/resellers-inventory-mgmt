'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchSettings(); }, []);
  const fetchSettings = async () => { const res = await fetch('/api/settings'); const data = await res.json(); setSettings(data); setLoading(false); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName: settings.company_name, companyTagline: settings.company_tagline, salesTaxRate: parseFloat(settings.sales_tax_rate) }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setMessage('Settings saved');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleBackup = async () => {
    const res = await fetch('/api/admin/backup');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  const handleRestore = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const text = await file.text();
      try {
        const res = await fetch('/api/admin/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.details?.join(', ') || 'Restore failed'); }
        setMessage('Backup restored successfully');
      } catch (err) { setError(err instanceof Error ? err.message : 'Restore failed'); }
    };
    input.click();
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"><Header /><div className="text-center py-12 text-gray-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4 mb-6">
          <h2 className="text-lg font-semibold">Company Settings</h2>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label><input type="text" value={settings.company_name || ''} onChange={e => setSettings((s: any) => ({...s, company_name: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Tagline</label><input type="text" value={settings.company_tagline || ''} onChange={e => setSettings((s: any) => ({...s, company_tagline: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Tax Rate</label><input type="number" step="0.0001" value={settings.sales_tax_rate || 0.0825} onChange={e => setSettings((s: any) => ({...s, sales_tax_rate: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /><p className="mt-1 text-xs text-gray-500">Enter as decimal (e.g., 0.0825 for 8.25%)</p></div>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save Settings'}</button>
        </form>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Backup & Restore</h2>
          <div className="flex gap-3">
            <button onClick={handleBackup} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md">Download Backup</button>
            <button onClick={handleRestore} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md">Restore from Backup</button>
          </div>
        </div>
      </main>
    </div>
  );
}
