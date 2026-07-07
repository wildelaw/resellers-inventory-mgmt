'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMsg('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });

      if (!res.ok) throw new Error('Failed to update profile');
      setProfileMsg('Profile updated successfully');
      await update();
    } catch {
      setProfileMsg('Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPassword(true);
    setPasswordMsg('');
    setPasswordError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordMsg('Password changed. You will need to sign in again.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Profile</h1>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Account Information</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-white">{session?.user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{session?.user?.role}</dd>
            </div>
            {session?.user?.canViewAll && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Permissions</dt>
                <dd className="text-gray-900 dark:text-white">Can view all data</dd>
              </div>
            )}
          </dl>
        </div>

        <form onSubmit={handleProfileUpdate} className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Update Name</h2>
          {profileMsg && <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-sm">{profileMsg}</div>}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={loadingProfile} className="btn-primary">{loadingProfile ? 'Saving...' : 'Save'}</button>
        </form>

        <form onSubmit={handlePasswordChange} className="card">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Change Password</h2>
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-4">Changing your password will sign you out of all devices.</p>
          {passwordMsg && <div className="mb-3 p-2 bg-green-100 text-green-700 rounded text-sm">{passwordMsg}</div>}
          {passwordError && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">{passwordError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" />
              <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, digit, special char</p>
            </div>
          </div>
          <button type="submit" disabled={loadingPassword} className="btn-primary mt-4">{loadingPassword ? 'Changing...' : 'Change Password'}</button>
        </form>
      </main>
    </div>
  );
}