'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const updateProfile = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      await updateSession();
      setMessage('Profile updated.');
    } finally {
      setBusy(false);
    }
  }, [name, updateSession]);

  const changePassword = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        setError(d.error || 'Failed');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed. You may need to sign in again on other devices.');
    } finally {
      setBusy(false);
    }
  }, [currentPassword, newPassword]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">{error}</div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-100 text-sm">{message}</div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={session?.user?.email ?? ''} disabled readOnly />
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button onClick={updateProfile} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Update profile'}
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Change password</h2>
          <div>
            <label className={labelCls}>Current password</label>
            <input type="password" className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input type="password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              8+ chars, uppercase, lowercase, digit, special character. Changing your password invalidates all your sessions.
            </p>
          </div>
          <div className="flex justify-end">
            <button onClick={changePassword} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}