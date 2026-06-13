'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', name }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setMessage('Name updated'); update?.({ name });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', currentPassword, newPassword }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setMessage('Password changed. Please log in again.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <div className="space-y-6">
          <form onSubmit={handleUpdateName} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold">Update Name</h2>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" /></div>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">Update Name</button>
          </form>
          <form onSubmit={handleChangePassword} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-xs text-gray-500">Changing your password will invalidate all your other active sessions.</p>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" required /><p className="mt-1 text-xs text-gray-500">8+ chars with uppercase, lowercase, digit, and special character</p></div>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">Change Password</button>
          </form>
        </div>
      </main>
    </div>
  );
}
