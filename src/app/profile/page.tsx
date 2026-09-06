'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageShell from '@/components/page-shell';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => {
        setName(data.user?.name ?? '');
        setEmail(data.user?.email ?? '');
      })
      .catch(() => setError('Failed to load profile'));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ? data.details.join('. ') : data.error || 'Failed to save profile');
        return;
      }
      setMessage('Profile updated');
      await update();
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ? data.details.join('. ') : data.error || 'Failed to change password');
        return;
      }
      setMessage('Password changed. You will need to sign in again on other devices.');
      setCurrentPassword('');
      setNewPassword('');
      await update();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>

      {message && (
        <div className="mb-4 max-w-lg p-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md text-sm">{message}</div>
      )}
      {error && (
        <div className="mb-4 max-w-lg p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <form onSubmit={saveProfile} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input value={email} disabled className={`${inputCls} opacity-60`} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Save Profile
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Password (8+ chars, upper, lower, digit, special)
          </label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputCls} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Change Password
          </button>
        </div>
      </form>
    </PageShell>
  );
}