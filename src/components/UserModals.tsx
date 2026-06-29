'use client';

import { useState, useEffect } from 'react';
import { apiPost, apiPut, apiDelete } from '@/lib/api-client';

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function CreateUserModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPost('/api/admin/users', {
      email, name, password, role,
      canViewAll: role === 'admin' ? true : canViewAll,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to create user'); return; }
    onSaved();
  }
  return (
    <Shell title="Add User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelClass}>Email</label><input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required type="email" /></div>
        <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className={labelClass}>Password</label><input className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required type="password" /></div>
        <div><label className={labelClass}>Role</label>
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'user' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
            Can view all data across users
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button>
        </div>
      </form>
    </Shell>
  );
}

export interface EditableUser {
  id: number; email: string; name: string; role: 'admin' | 'user';
  canViewAll: boolean; isActive: boolean;
}

export function EditUserModal({ open, user, isSelf, onClose, onSaved }: {
  open: boolean; user: EditableUser | null; isSelf: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email); setName(user.name); setRole(user.role);
      setCanViewAll(user.canViewAll); setIsActive(user.isActive);
      setError('');
    }
  }, [user]);

  if (!open || !user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPut(`/api/admin/users/${user!.id}`, { email, name, role, canViewAll, isActive });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to update user'); return; }
    onSaved();
  }
  return (
    <Shell title="Edit User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelClass}>Email</label><input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={labelClass}>Role</label>
          <select className={inputClass} value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="text-xs text-gray-500 mt-1">You cannot change your own role.</p>}
        </div>
        {role === 'user' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
            Can view all data
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} disabled={isSelf} onChange={(e) => setIsActive(e.target.checked)} />
          Active
          {isSelf && <span className="text-xs text-gray-500">(cannot deactivate your own account)</span>}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Shell>
  );
}

export function DeleteUserModal({ open, user, transferTargets, onClose, onSaved }: {
  open: boolean; user: EditableUser | null;
  transferTargets: EditableUser[];
  onClose: () => void; onSaved: () => void;
}) {
  const [transferTo, setTransferTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!open || !user) return null;

  async function confirm() {
    setSaving(true); setError('');
    const url = transferTo
      ? `/api/admin/users/${user!.id}?transferDataTo=${transferTo}`
      : `/api/admin/users/${user!.id}`;
    const res = await apiDelete(url);
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to delete user'); return; }
    onSaved();
  }
  return (
    <Shell title="Delete User" onClose={onClose}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Permanently delete <strong>{user!.email}</strong>? This cannot be undone.
      </p>
      <div className="mb-4">
        <label className={labelClass}>Transfer their data to (optional)</label>
        <select className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
          <option value="">— Delete all their data —</option>
          {transferTargets.map((u) => <option key={u.id} value={String(u.id)}>{u.email}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
        <button type="button" disabled={saving} onClick={confirm} className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm disabled:opacity-60">{saving ? 'Deleting…' : 'Delete'}</button>
      </div>
    </Shell>
  );
}

export function ResetPasswordModal({ open, userId, onClose, onSaved }: {
  open: boolean; userId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open || !userId) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await apiPost(`/api/admin/users/${userId}/reset-password`, { newPassword });
    setSaving(false);
    if (!res.ok) { setError(res.error || 'Failed to reset password'); return; }
    onSaved();
  }
  return (
    <Shell title="Reset Password" onClose={onClose}>
      <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
        This will invalidate all of the user&apos;s active sessions.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelClass}>New password</label>
          <input className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required type="password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Reset'}</button>
        </div>
      </form>
    </Shell>
  );
}