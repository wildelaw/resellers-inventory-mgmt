'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { apiGet, apiPut, apiFetch } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function AdminSettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [salesTaxRate, setSalesTaxRate] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [restorePayload, setRestorePayload] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');

  useEffect(() => {
    apiGet<{ company_name: string; company_tagline: string; sales_tax_rate: number }>('/api/settings').then((res) => {
      if (res.ok && res.data) {
        setCompanyName(res.data.company_name);
        setCompanyTagline(res.data.company_tagline);
        setSalesTaxRate(String(res.data.sales_tax_rate));
      }
    });
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    const res = await apiPut('/api/settings', {
      companyName, companyTagline,
      salesTaxRate: Number(salesTaxRate) || 0,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to save'); return; }
    setMsg('Settings saved.');
  }

  function downloadBackup() {
    fetch('/api/admin/backup').then((r) => r.json()).then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'backup.json'; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => setError('Backup failed'));
  }

  async function restore(e: React.FormEvent) {
    e.preventDefault();
    setRestoreMsg(''); setError('');
    let payload: unknown;
    try { payload = JSON.parse(restorePayload); } catch { setError('Invalid JSON'); return; }
    const res = await apiFetch('/api/admin/restore', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { setError(res.error || 'Restore failed'); return; }
    setRestoreMsg('Restore complete. Reloading…');
    setRestorePayload('');
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header companyName={companyName || 'Resale Manager'} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <form onSubmit={saveSettings} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold">Application</h2>
          <div><label className={labelClass}>Company name</label><input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div><label className={labelClass}>Tagline</label><input className={inputClass} value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} /></div>
          <div><label className={labelClass}>Sales tax rate (0–1)</label><input type="number" step="0.0001" min="0" max="1" className={inputClass} value={salesTaxRate} onChange={(e) => setSalesTaxRate(e.target.value)} /></div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save settings'}</button>
        </form>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
          <h2 className="font-semibold">Backup &amp; Restore</h2>
          <button onClick={downloadBackup} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-sm">Download backup</button>
          <form onSubmit={restore} className="space-y-3 pt-2">
            <div><label className={labelClass}>Restore from backup (JSON)</label>
              <textarea className={inputClass} rows={6} value={restorePayload} onChange={(e) => setRestorePayload(e.target.value)} placeholder="Paste backup JSON" />
            </div>
            {restoreMsg && <p className="text-sm text-green-600">{restoreMsg}</p>}
            <button type="submit" className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm">Restore</button>
          </form>
        </div>
      </main>
    </div>
  );
}