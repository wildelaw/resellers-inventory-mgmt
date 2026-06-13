'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [mode, setMode] = useState<'choose' | 'create' | 'restore'>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.details?.join(', ') || 'Failed to create admin');
      }

      // Redirect to login
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const fileInput = document.getElementById('backupFile') as HTMLInputElement;
      const file = fileInput.files?.[0];
      if (!file) throw new Error('Please select a backup file');

      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || result.details?.join(', ') || 'Failed to restore backup');
      }

      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {mode === 'choose' && (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Initial Setup</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              No admin account exists yet. Create one or restore from a backup.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Create New Database
              </button>
              <button
                onClick={() => setMode('restore')}
                className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-md transition-colors"
              >
                Restore from Backup
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Create Admin Account</h1>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required />
                <p className="mt-1 text-xs text-gray-500">8+ characters with uppercase, lowercase, digit, and special character</p>
              </div>
              <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
              <button type="button" onClick={() => setMode('choose')} className="w-full py-2 px-4 text-gray-600 dark:text-gray-400 font-medium">
                Back
              </button>
            </form>
          </>
        )}

        {mode === 'restore' && (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Restore from Backup</h1>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
            <form onSubmit={handleRestore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Backup File (JSON)</label>
                <input type="file" id="backupFile" accept=".json" className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50">
                {loading ? 'Restoring...' : 'Restore Backup'}
              </button>
              <button type="button" onClick={() => setMode('choose')} className="w-full py-2 px-4 text-gray-600 dark:text-gray-400 font-medium">
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}