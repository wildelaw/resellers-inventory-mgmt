'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/page-shell';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        setCompanyName(data.company_name ?? '');
        setCompanyTagline(data.company_tagline ?? '');
        setTaxRatePercent(String(Math.round((data.sales_tax_rate ?? 0) * 10000) / 100));
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const rate = parseFloat(taxRatePercent);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_tagline: companyTagline || undefined,
          sales_tax_rate: isNaN(rate) ? undefined : rate / 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ? data.details.join('. ') : data.error || 'Failed to save settings');
        return;
      }
      setMessage('Settings saved');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = () => {
    // Trigger a JSON file download from the backup endpoint
    const a = document.createElement('a');
    a.href = '/api/admin/backup';
    a.rel = 'noopener';
    a.click();
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoreOpen(false);
    setRestoring(true);
    setError('');
    setMessage('');
    try {
      const text = await restoreFile.text();
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ? data.details.join('. ') : data.error || 'Restore failed');
        return;
      }
      setMessage('Backup restored successfully');
      setRestoreFile(null);
      router.refresh();
    } finally {
      setRestoring(false);
    }
  };

  const unlockSetup = async () => {
    setUnlockOpen(false);
    const res = await fetch('/api/admin/setup-unlock', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to re-open setup');
      return;
    }
    setMessage('Setup has been re-opened. Visit /setup to restore a backup.');
  };

  const inputCls = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';

  if (loading) {
    return <PageShell><p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p></PageShell>;
  }

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {message && (
        <div className="mb-4 max-w-xl p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md text-sm">{message}</div>
      )}
      {error && (
        <div className="mb-4 max-w-xl p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <form onSubmit={saveSettings} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-xl mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Application Settings</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Tagline</label>
          <input value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Tax Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used to auto-calculate tax on new sales: tax = price − (price ÷ (1 + rate)).
          </p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-xl mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup &amp; Restore</h2>
        <div>
          <button onClick={downloadBackup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
            Download Backup (JSON)
          </button>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Exports all users, items, sales, photos metadata, mileage, and settings.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Restore from Backup</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-900 dark:text-white file:mr-3 file:rounded-md file:border-0 file:bg-gray-600 file:text-white file:px-3 file:py-1.5"
          />
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Restoring replaces ALL current data with the backup contents.
          </p>
          <button
            onClick={() => setRestoreOpen(true)}
            disabled={!restoreFile || restoring}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {restoring ? 'Restoring…' : 'Restore Backup'}
          </button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Re-open Setup</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Re-opens the /setup wizard so an unauthenticated bootstrap restore can be performed (e.g. after losing admin access). Should be re-locked after use.
          </p>
          <button onClick={() => setUnlockOpen(true)} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Re-open Setup Wizard
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={restoreOpen}
        title="Restore Backup"
        message={`Replace ALL current data with "${restoreFile?.name}"? This cannot be undone.`}
        confirmLabel="Restore"
        onConfirm={handleRestore}
        onCancel={() => setRestoreOpen(false)}
      />

      <ConfirmModal
        isOpen={unlockOpen}
        title="Re-open Setup"
        message="Re-open the setup wizard? /setup will accept unauthenticated admin creation and restore until setup completes again."
        confirmLabel="Re-open Setup"
        onConfirm={unlockSetup}
        onCancel={() => setUnlockOpen(false)}
      />
    </PageShell>
  );
}