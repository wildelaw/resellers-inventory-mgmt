'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ id: number; email: string; name: string; role: string; canViewAll: boolean } | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/profile').then((r) => r.json()).then((d) => {
      setProfile(d.user);
      setName(d.user.name);
    });
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update profile');
      }
      setSuccess('Profile updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to change password');
      }
      setSuccess('Password changed. You will need to sign in again.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

        {profile && (
          <div className="card mb-6">
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-gray-500">Email:</dt><dd>{profile.email}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Role:</dt><dd className="capitalize">{profile.role}</dd></div>
              {profile.role === 'user' && <div className="flex justify-between"><dt className="text-gray-500">Can View All:</dt><dd>{profile.canViewAll ? 'Yes' : 'No'}</dd></div>}
            </dl>
          </div>
        )}

        <form onSubmit={handleProfileUpdate} className="card mb-6 space-y-4">
          <h2 className="text-xl font-semibold">Update Name</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">Update Profile</button>
        </form>

        <form onSubmit={handlePasswordChange} className="card space-y-4">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <p className="text-sm text-gray-500">Changing your password will sign you out of all devices.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" required minLength={8} />
            <p className="mt-1 text-xs text-gray-500">Min 8 chars, uppercase, lowercase, digit, special char</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">Change Password</button>
        </form>
      </main>
    </div>
  );
}