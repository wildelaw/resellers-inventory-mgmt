'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [mode, setMode] = useState<'choose' | 'create' | 'restore'>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backupData, setBackupData] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if setup is needed
    fetch('/api/setup')
      .then(res => res.json())
      .then(data => {
        if (!data.needsSetup) {
          router.push('/login');
        }
      })
      .catch(() => {
        // Allow continuing even if check fails
      });
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Failed to create admin account');
      }

      router.push('/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const parsed = JSON.parse(backupData);
      // This would require admin auth, so during setup it's via PUT /api/setup
      // For now, just show the option
      setError('Restore requires admin authentication. Please create an admin first, then use Admin Settings to restore.');
    } catch {
      setError('Invalid JSON data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Initial Setup</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
          )}

          {mode === 'choose' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 text-center">Welcome! Choose how to set up your system.</p>
              <button onClick={() => setMode('create')} className="btn-primary w-full">
                Create New Database
              </button>
              <button onClick={() => setMode('restore')} className="btn-secondary w-full">
                Restore from Backup
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Admin Account</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
                <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, digit, special char</p>
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setMode('choose')} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Admin'}</button>
              </div>
            </form>
          )}

          {mode === 'restore' && (
            <form onSubmit={handleRestore} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Restore from Backup</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Paste your backup JSON data below.</p>
              <textarea
                required
                value={backupData}
                onChange={(e) => setBackupData(e.target.value)}
                rows={10}
                className="input-field font-mono text-xs"
                placeholder='{"version":2,"tables":{...}}'
              />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setMode('choose')} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Restoring...' : 'Restore'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}