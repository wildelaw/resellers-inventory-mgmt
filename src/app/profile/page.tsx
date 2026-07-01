'use client';

import { useState, useEffect, FormEvent } from 'react';
import Header from '@/components/header';
import { useSession } from 'next-auth/react';

interface Profile {
  id: number;
  email: string;
  name: string;
  role: string;
  canViewAll: boolean;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setName(data.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(''); setProfileError('');
    setProfileLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setProfile(prev => prev ? { ...prev, name } : prev);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(''); setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordMsg('Password changed. All sessions have been invalidated — please log in again.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>

        {profile && (
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{profile.email}</span>
            {' · '}
            <span className="capitalize">{profile.role}</span>
            {profile.canViewAll && ' · Can View All'}
          </div>
        )}

        {/* Profile section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Update Profile</h2>

          {profileMsg && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{profileMsg}</p>}
          {profileError && <p className="mb-3 text-sm text-red-700 dark:text-red-400">{profileError}</p>}

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className={labelClass}>Display Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} maxLength={200} />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={profileLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Password section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>

          {passwordMsg && <p className="mb-3 text-sm text-green-700 dark:text-green-400">{passwordMsg}</p>}
          {passwordError && <p className="mb-3 text-sm text-red-700 dark:text-red-400">{passwordError}</p>}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className={labelClass}>Current Password</label>
              <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Min 8 chars with uppercase, lowercase, digit, and special character
              </p>
            </div>
            <div>
              <label className={labelClass}>Confirm New Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={passwordLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50">
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
