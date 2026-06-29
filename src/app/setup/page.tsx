'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'choose' | 'create' | 'restore';

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoreText, setRestoreText] = useState('');

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((s) => {
        if (!s.needsSetup) router.replace('/login');
      })
      .catch(() => {});
  }, [router]);

  const onCreate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Setup failed' }));
        setError(d.error || 'Setup failed');
        return;
      }
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [name, email, password, router]);

  const onRestore = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      let data: unknown = restoreText;
      try {
        data = JSON.parse(restoreText);
      } catch {
        setError('Invalid JSON');
        return;
      }
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
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [restoreText, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-1">Initial Setup</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Create the first admin account or restore from a backup.
        </p>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium"
            >
              Create a new database
            </button>
            <button
              onClick={() => setMode('restore')}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-3 rounded-md text-sm font-medium"
            >
              Restore from backup
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                8+ chars, uppercase, lowercase, digit, special character.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
                disabled={busy}
              >
                Back
              </button>
              <button
                onClick={onCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                disabled={busy}
              >
                {busy ? 'Creating…' : 'Create admin'}
              </button>
            </div>
          </div>
        )}

        {mode === 'restore' && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Paste the backup JSON content below. All rows are validated before any changes are written.
            </p>
            <textarea
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs dark:bg-gray-700 dark:text-white"
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
              placeholder='{"version":2,"tables":{...}}'
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
                disabled={busy}
              >
                Back
              </button>
              <button
                onClick={onRestore}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                disabled={busy}
              >
                {busy ? 'Restoring…' : 'Restore backup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}