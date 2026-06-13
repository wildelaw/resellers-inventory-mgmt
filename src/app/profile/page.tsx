'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setMessage('Profile updated');
      await update();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to change password'); }
      setMessage('Password changed. You may need to log in again.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Info</h2>
          <p className="text-gray-600 dark:text-gray-300"><strong>Email:</strong> {session?.user?.email}</p>
          <p className="text-gray-600 dark:text-gray-300"><strong>Role:</strong> {session?.user?.role === 'admin' ? 'Administrator' : 'Standard User'}</p>
          {session?.user?.canViewAll && <p className="text-gray-600 dark:text-gray-300"><strong>Can View All Data:</strong> Yes</p>}
        </div>
        <form onSubmit={updateProfile} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Update Name</h2>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" /></div>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Update Name'}</button>
        </form>
        <form onSubmit={changePassword} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Changing your password will invalidate all your active sessions.</p>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /></div>
          <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required /><p className="mt-1 text-xs text-gray-500">Min 8 chars, uppercase, lowercase, digit, special character</p></div>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{loading ? 'Changing...' : 'Change Password'}</button>
        </form>
      </main>
    </div>
  );
}