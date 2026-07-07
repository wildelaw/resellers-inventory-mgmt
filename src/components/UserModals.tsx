'use client';
import { useState } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
}

interface UserModalsProps {
  showCreate: boolean;
  showEdit: boolean;
  showDelete: boolean;
  showReset: boolean;
  editUser: User | null;
  deleteUserId: number | null;
  resetUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role, canViewAll }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      setEmail(''); setName(''); setPassword(''); setRole('user'); setCanViewAll(false);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add User</h3>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        <div className="space-y-3">
          <div><label className="block text-sm mb-1">Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
          <div><label className="block text-sm mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></div>
          <div><label className="block text-sm mb-1">Password *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required /><p className="text-xs text-gray-500 mt-1">8+ chars, upper/lower/digit/special</p></div>
          <div><label className="block text-sm mb-1">Role</label><select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')} className={inputClass}><option value="user">User</option><option value="admin">Admin</option></select></div>
          {role === 'user' && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />Can view all data</label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

export function EditUserModal({ open, user, onClose, onSuccess }: { open: boolean; user: User | null; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    if (user) { setEmail(user.email); setName(user.name); setRole(user.role); setCanViewAll(user.canViewAll); setIsActive(user.isActive); }
  });

  if (!open || !user) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, canViewAll, isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit User</h3>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        <div className="space-y-3">
          <div><label className="block text-sm mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm mb-1">Role</label><select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')} className={inputClass}><option value="user">User</option><option value="admin">Admin</option></select></div>
          {role === 'user' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />Can view all data</label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteUserModal({ open, userId, onClose, onSuccess }: { open: boolean; userId: number | null; onClose: () => void; onSuccess: () => void }) {
  const [transferTo, setTransferTo] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open || userId === null) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const url = transferTo ? `/api/admin/users/${userId}?transferDataTo=${transferTo}` : `/api/admin/users/${userId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      setTransferTo('');
      onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Delete User</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">This will permanently delete the user. Optionally transfer their data to another user.</p>
        <div><label className="block text-sm mb-1">Transfer data to (user ID, optional)</label><input type="number" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className={inputClass} /></div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">{saving ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordModal({ open, userId, onClose, onSuccess }: { open: boolean; userId: number | null; onClose: () => void; onSuccess: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open || userId === null) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      setNewPassword('');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Reset Password</h3>
        <p className="text-xs text-orange-600 mb-3">This will invalidate all of the user's active sessions.</p>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        <div><label className="block text-sm mb-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} /><p className="text-xs text-gray-500 mt-1">8+ chars, upper/lower/digit/special</p></div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !newPassword} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">{saving ? 'Resetting...' : 'Reset'}</button>
        </div>
      </div>
    </div>
  );
}
