'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, apiPut } from '@/lib/api-client';

type Mode = 'choose' | 'create' | 'restore';

export default function SetupPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restorePayload, setRestorePayload] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPost('/api/setup', { name, email, password });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Setup failed'); return; }
    router.push('/login');
  }

  async function doRestore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    let payload: unknown;
    try { payload = JSON.parse(restorePayload); } catch { setSaving(false); setError('Invalid JSON'); return; }
    const res = await apiPut('/api/setup', payload);
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Restore failed'); return; }
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-1">Initial Setup</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create the first admin account or restore from a backup.</p>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button onClick={() => setMode('create')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md">Create new database</button>
            <button onClick={() => setMode('restore')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 px-4 py-3 rounded-md">Restore from backup</button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={createAdmin} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="block text-sm font-medium mb-1">Password</label><input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <p className="text-xs text-gray-500">8+ chars with uppercase, lowercase, digit, and special character.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-60">{saving ? 'Creating…' : 'Create admin'}</button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-sm text-gray-500">Back</button>
          </form>
        )}

        {mode === 'restore' && (
          <form onSubmit={doRestore} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Backup JSON</label>
              <textarea className={inputClass} rows={8} value={restorePayload} onChange={(e) => setRestorePayload(e.target.value)} required placeholder="Paste backup JSON" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-60">{saving ? 'Restoring…' : 'Restore'}</button>
            <button type="button" onClick={() => setMode('choose')} className="w-full text-sm text-gray-500">Back</button>
          </form>
        )}
      </div>
    </div>
  );
}