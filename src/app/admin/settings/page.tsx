'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import Header from '@/components/header';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [salesTaxRate, setSalesTaxRate] = useState('0.0825');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.company_name || '');
        setCompanyTagline(data.company_tagline || '');
        setSalesTaxRate(String(data.sales_tax_rate ?? 0.0825));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user || session.user.role !== 'admin') {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-500">Access denied</p></div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_tagline: companyTagline,
          sales_tax_rate: parseFloat(salesTaxRate),
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) throw new Error('Failed to download backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to download backup' });
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || 'Restore failed');
        }
        setMessage({ type: 'success', text: 'Backup restored successfully' });
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to restore backup' });
      }
    };
    reader.readAsText(file);
  };

  const handleUnlockSetup = async () => {
    if (!confirm('Are you sure you want to re-open the setup page? This will allow creating a new admin account.')) return;
    try {
      const res = await fetch('/api/admin/setup-unlock', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unlock setup');
      setMessage({ type: 'success', text: 'Setup unlocked' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to unlock setup' });
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Tagline</label>
              <input type="text" value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Tax Rate ({salesTaxRate ? (parseFloat(salesTaxRate) * 100).toFixed(2) : '0'}%)</label>
              <input type="number" step="0.0001" min="0" max="1" value={salesTaxRate} onChange={(e) => setSalesTaxRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Backup & Restore</h2>
          <div className="space-y-4">
            <div>
              <button onClick={handleDownloadBackup}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md transition-colors">
                Download Backup
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Restore from Backup</label>
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestoreBackup}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Warning: This will replace all current data.</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Danger Zone</h2>
          <button onClick={handleUnlockSetup}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors">
            Re-open Setup
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This allows creating a new admin account via the setup page.</p>
        </div>
      </main>
    </div>
  );
}