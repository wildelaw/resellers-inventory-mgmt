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
  const [needsSetup, setNeedsSetup] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/setup').then(res => res.json()).then(data => {
      if (!data.needsSetup) {
        router.push('/login');
      }
    }).catch(() => {});
  }, [router]);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Failed to create admin');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Initial Setup</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        {mode === 'choose' && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300 text-center">Welcome! Let&apos;s set up your account.</p>
            <button onClick={() => setMode('create')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Create New Database</button>
            <button onClick={() => setMode('restore')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md transition-colors">Restore from Backup</button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Admin Account</h2>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /><p className="mt-1 text-xs text-gray-500">Min 8 chars, uppercase, lowercase, digit, special character</p></div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50">{loading ? 'Creating...' : 'Create Admin'}</button>
            <button type="button" onClick={() => setMode('choose')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md transition-colors">Back</button>
          </form>
        )}

        {mode === 'restore' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Restore from Backup</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Upload a backup JSON file to restore your data.</p>
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setLoading(true);
              setError('');
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                const res = await fetch('/api/setup', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                if (!res.ok) { const r = await res.json(); throw new Error(r.error || 'Restore failed'); }
                router.push('/login');
              } catch (err: any) { setError(err.message); } finally { setLoading(false); }
            }} className="w-full" disabled={loading} />
            <button type="button" onClick={() => setMode('choose')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md transition-colors">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}