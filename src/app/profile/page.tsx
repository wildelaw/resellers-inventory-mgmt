'use client';

import { useState, useEffect } from 'react';
import ClientShell from '@/components/client-shell';
import { apiGet, apiPut } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [canViewAll, setCanViewAll] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    apiGet<{ user: { name: string; email: string; role: string; canViewAll: boolean } }>('/api/profile').then((res) => {
      if (res.ok && res.data) {
        setName(res.data.user.name); setEmail(res.data.user.email);
        setRole(res.data.user.role); setCanViewAll(res.data.user.canViewAll);
      }
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true); setProfileMsg(''); setError('');
    const res = await apiPut('/api/profile', { type: 'profile', name });
    setSavingProfile(false);
    if (!res.ok) { setError(res.error || 'Failed to update'); return; }
    setProfileMsg('Profile updated.');
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true); setPwMsg(''); setError('');
    const res = await apiPut('/api/profile', { type: 'password', currentPassword, newPassword });
    setSavingPw(false);
    if (!res.ok) { setError(res.error || 'Failed to change password'); return; }
    setPwMsg('Password changed. You will need to sign in again.');
    setCurrentPassword(''); setNewPassword('');
  }

  return (
    <ClientShell>
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Account</h2>
          <dl className="text-sm mb-4 space-y-1">
            <div><dt className="inline text-gray-500">Email: </dt><dd className="inline">{email}</dd></div>
            <div><dt className="inline text-gray-500">Role: </dt><dd className="inline capitalize">{role}</dd></div>
            <div><dt className="inline text-gray-500">Can view all: </dt><dd className="inline">{canViewAll ? 'Yes' : 'No'}</dd></div>
          </dl>
          <form onSubmit={saveProfile} className="space-y-3">
            <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></div>
            {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={savingProfile} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save name'}</button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Change password</h2>
          <p className="text-xs text-gray-500 mb-3">Changing your password invalidates all your existing sessions.</p>
          <form onSubmit={changePassword} className="space-y-3">
            <div><label className={labelClass}>Current password</label><input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
            <div><label className={labelClass}>New password</label><input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
            {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}
            <button type="submit" disabled={savingPw} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{savingPw ? 'Saving…' : 'Change password'}</button>
          </form>
        </div>
      </div>
    </ClientShell>
  );
}