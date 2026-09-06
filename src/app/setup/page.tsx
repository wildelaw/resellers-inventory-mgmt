'use client';

import { useState, useEffect } from 'react';

type Mode = 'choose' | 'create' | 'restore';

export default function SetupPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((data) => {
        setNeedsSetup(data.needsSetup);
        if (!data.needsSetup) window.location.href = '/login';
      })
      .catch(() => setNeedsSetup(true));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.details ? data.details.join('. ') : data.error || 'Setup failed');
        return;
      }
      window.location.href = '/login';
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fileInput = document.getElementById('backup-file') as HTMLInputElement | null;
      const file = fileInput?.files?.[0];
      if (!file) {
        setError('Please choose a backup file');
        return;
      }
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setError('Backup file is not valid JSON');
        return;
      }
      const res = await fetch('/api/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.details ? data.details.join('. ') : data.error || 'Restore failed');
        return;
      }
      window.location.href = '/login';
    } finally {
      setSaving(false);
    }
  };

  if (needsSetup === false) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Initial Setup</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        {mode === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-left"
            >
              <span className="font-semibold">Create New Database</span>
              <span className="block text-sm opacity-80">Set up an administrator account</span>
            </button>
            <button
              onClick={() => setMode('restore')}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-3 rounded-md text-left"
            >
              <span className="font-semibold">Restore from Backup</span>
              <span className="block text-sm opacity-70">Upload a previously exported backup JSON</span>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="setup-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input id="setup-name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input id="setup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input id="setup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                At least 8 characters with uppercase, lowercase, digit, and special character.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Back
              </button>
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Admin'}
              </button>
            </div>
          </form>
        )}

        {mode === 'restore' && (
          <form onSubmit={handleRestore} className="space-y-4">
            <div>
              <label htmlFor="backup-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backup File (JSON)</label>
              <input id="backup-file" type="file" accept="application/json,.json"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Back
              </button>
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">
                {saving ? 'Restoring…' : 'Restore Backup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}