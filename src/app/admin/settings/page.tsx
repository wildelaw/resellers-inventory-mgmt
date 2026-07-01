'use client';

import { useState, useEffect, FormEvent } from 'react';
import Header from '@/components/header';

interface Settings {
  companyName: string;
  companyTagline: string;
  salesTaxRate: number;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSettingsSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setMsg(''); setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setMsg('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/admin/backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* swallow */ } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(''); setRestoreMsg('');
    setRestoreLoading(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setRestoreMsg('Backup restored successfully.');
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  const handleSetupUnlock = async () => {
    setUnlockMsg('');
    setUnlockLoading(true);
    try {
      const res = await fetch('/api/admin/setup-unlock', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setUnlockMsg('Setup page unlocked. New users can now visit /setup.');
    } catch { /* swallow */ } finally {
      setUnlockLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

        {/* App settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Application Settings</h2>

          {msg && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{msg}</p>}
          {error && <p className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</p>}

          {settings && (
            <form onSubmit={handleSettingsSave} className="space-y-4">
              <div>
                <label className={labelClass}>Company Name</label>
                <input type="text" value={settings.companyName} onChange={e => setSettings(s => s ? {...s, companyName: e.target.value} : s)}
                  className={inputClass} maxLength={200} />
              </div>
              <div>
                <label className={labelClass}>Company Tagline</label>
                <input type="text" value={settings.companyTagline} onChange={e => setSettings(s => s ? {...s, companyTagline: e.target.value} : s)}
                  className={inputClass} maxLength={500} />
              </div>
              <div>
                <label className={labelClass}>Default Sales Tax Rate (%)</label>
                <input
                  type="number"
                  min="0" max="100" step="0.01"
                  value={(settings.salesTaxRate * 100).toFixed(2)}
                  onChange={e => setSettings(s => s ? {...s, salesTaxRate: parseFloat(e.target.value) / 100} : s)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter as percentage (e.g. 8.25 for 8.25%)</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Backup & Restore */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Backup & Restore</h2>

          {restoreMsg && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{restoreMsg}</p>}
          {restoreError && <p className="mb-3 text-sm text-red-700 dark:text-red-400">{restoreError}</p>}

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Download a full JSON backup of all data.</p>
              <button onClick={handleBackup} disabled={backupLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
                {backupLoading ? 'Downloading...' : 'Download Backup'}
              </button>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Restore from a backup file. This will overwrite all existing data.
              </p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors">
                  {restoreLoading ? 'Restoring...' : 'Restore Backup'}
                </span>
                <input type="file" accept=".json" className="hidden" disabled={restoreLoading} onChange={handleRestore} />
              </label>
            </div>
          </div>
        </div>

        {/* Setup unlock */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Setup Control</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Re-open the /setup page so additional admins can be created.
          </p>
          {unlockMsg && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{unlockMsg}</p>}
          <button onClick={handleSetupUnlock} disabled={unlockLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50">
            {unlockLoading ? 'Unlocking...' : 'Unlock Setup Page'}
          </button>
        </div>
      </main>
    </div>
  );
}
