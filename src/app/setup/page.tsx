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
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/setup').then((r) => r.json()).then((d) => {
      if (!d.needsSetup) router.push('/login');
      setNeedsSetup(d.needsSetup);
    }).catch(() => {});
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details?.join(', ') || data.error || 'Setup failed');
      }
      router.push('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(restoreData);
      const res = await fetch('/api/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Restore failed');
      }
      router.push('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid backup data');
    } finally {
      setLoading(false);
    }
  };

  if (!needsSetup) return null;
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-md w-full">
        {mode === 'choose' && (
          <>
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">Initial Setup</h1>
            <div className="space-y-3">
              <button onClick={() => setMode('create')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md">Create New Database</button>
              <button onClick={() => setMode('restore')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-3 rounded-md">Restore from Backup</button>
            </div>
          </>
        )}
        {mode === 'create' && (
          <>
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">Create Admin</h1>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></div>
              <div><label className="block text-sm mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
              <div><label className="block text-sm mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required /><p className="text-xs text-gray-500 mt-1">8+ chars, upper/lower/digit/special</p></div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Creating...' : 'Create Admin'}</button>
            </form>
            <button onClick={() => setMode('choose')} className="w-full text-sm text-gray-500 mt-3">Back</button>
          </>
        )}
        {mode === 'restore' && (
          <>
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">Restore from Backup</h1>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm mb-1">Backup JSON</label><textarea value={restoreData} onChange={(e) => setRestoreData(e.target.value)} className={inputClass} rows={10} placeholder="Paste backup JSON here..." /></div>
              <button onClick={handleRestore} disabled={loading || !restoreData} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Restoring...' : 'Restore'}</button>
            </div>
            <button onClick={() => setMode('choose')} className="w-full text-sm text-gray-500 mt-3">Back</button>
          </>
        )}
      </div>
    </div>
  );
}
