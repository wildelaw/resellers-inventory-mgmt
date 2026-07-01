'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [mode, setMode] = useState<'choose' | 'create' | 'restore'>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restoreData, setRestoreData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((s) => {
        if (!s.needsSetup) router.push('/login');
      })
      .catch(() => {});
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
        const d = await res.json();
        throw new Error(d.error || d.details?.join(', ') || 'Setup failed');
      }
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = JSON.parse(restoreData);
      const res = await fetch('/api/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.details?.join(', ') || 'Restore failed');
      }
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid backup data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Initial Setup</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        {mode === 'choose' && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">Welcome! Choose how to set up your database:</p>
            <button onClick={() => setMode('create')} className="btn-primary w-full">Create New Database</button>
            <button onClick={() => setMode('restore')} className="btn-secondary w-full">Restore from Backup</button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Admin Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={8} />
              <p className="mt-1 text-xs text-gray-500">Min 8 chars, uppercase, lowercase, digit, special char</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('choose')} className="btn-secondary flex-1">Back</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Admin'}</button>
            </div>
          </form>
        )}

        {mode === 'restore' && (
          <form onSubmit={handleRestore}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Backup JSON *</label>
              <textarea
                value={restoreData}
                onChange={(e) => setRestoreData(e.target.value)}
                className="input-field"
                rows={8}
                placeholder="Paste backup JSON here..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('choose')} className="btn-secondary flex-1">Back</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Restoring...' : 'Restore'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}