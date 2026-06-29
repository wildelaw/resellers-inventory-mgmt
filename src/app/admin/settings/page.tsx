'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [salesTaxRate, setSalesTaxRate] = useState('0.0825');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restoreText, setRestoreText] = useState('');

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((s) => {
      setCompanyName(s.company_name ?? '');
      setCompanyTagline(s.company_tagline ?? '');
      setSalesTaxRate(String(s.sales_tax_rate ?? 0.0825));
    }).catch(() => {});
  }, []);

  const saveSettings = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyTagline,
          salesTaxRate: Number(salesTaxRate),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      setMessage('Settings saved.');
    } finally {
      setBusy(false);
    }
  }, [companyName, companyTagline, salesTaxRate]);

  const doRestore = useCallback(async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      let data: unknown;
      try { data = JSON.parse(restoreText); } catch { setError('Invalid JSON'); return; }
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Restore failed' }));
        setError(d.error || 'Restore failed');
        return;
      }
      setRestoreText('');
      setMessage('Backup restored.');
    } finally {
      setBusy(false);
    }
  }, [restoreText]);

  const unlockSetup = useCallback(async () => {
    if (!confirm('Re-open the setup endpoint? This allows creating a new admin if no users exist.')) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/setup-unlock', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      setMessage('Setup unlocked.');
    } finally {
      setBusy(false);
    }
  }, []);

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            You do not have access to this page.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        {error && <div className="p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">{error}</div>}
        {message && <div className="p-3 rounded bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-100 text-sm">{message}</div>}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Company</h2>
          <div>
            <label className={labelCls}>Company name</label>
            <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input className={inputCls} value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sales tax rate (0–1)</label>
            <input type="number" step="0.0001" min="0" max="1" className={inputCls} value={salesTaxRate} onChange={(e) => setSalesTaxRate(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button onClick={saveSettings} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Backup &amp; Restore</h2>
          <div className="flex gap-2 flex-wrap">
            <a href="/api/admin/backup" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
              Download backup (JSON)
            </a>
            <button onClick={unlockSetup} disabled={busy} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm">
              Unlock setup
            </button>
          </div>
          <div>
            <label className={labelCls}>Restore from backup (paste JSON)</label>
            <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} placeholder='{"version":2,"tables":{...}}' />
          </div>
          <div className="flex justify-end">
            <button onClick={doRestore} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Restoring…' : 'Restore backup'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}