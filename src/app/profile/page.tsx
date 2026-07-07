'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white';

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true); setError(null);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', name }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setMessage('Profile updated'); await update();
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setSavingProfile(false); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPassword(true); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', currentPassword, newPassword }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.details?.join(', ') || d.error || 'Failed'); }
      setMessage('Password updated. You will need to sign in again.'); setCurrentPassword(''); setNewPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'An error occurred'); } finally { setSavingPassword(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        {message && <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}
        <form onSubmit={handleProfile} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Name</h2>
          <div><label className="block text-sm mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></div>
          <div><label className="block text-sm mb-1">Email</label><input value={session?.user?.email || ''} disabled className={`${inputClass} opacity-60`} /></div>
          <button type="submit" disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{savingProfile ? 'Saving...' : 'Save'}</button>
        </form>
        <form onSubmit={handlePassword} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h2>
          <p className="text-xs text-orange-600">Changing your password will invalidate all your existing sessions.</p>
          <div><label className="block text-sm mb-1">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} required /></div>
          <div><label className="block text-sm mb-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} required /><p className="text-xs text-gray-500 mt-1">8+ chars, upper/lower/digit/special</p></div>
          <button type="submit" disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50">{savingPassword ? 'Saving...' : 'Update Password'}</button>
        </form>
      </main>
    </div>
  );
}
