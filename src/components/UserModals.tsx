'use client';

import { useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
}

interface Props {
  mode: 'create' | 'edit' | 'delete' | 'reset-password' | null;
  user: User | null;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500', 'bg-green-600'];
  return { score, label: labels[Math.min(score, 5)], color: colors[Math.min(score, 5)] };
}

export default function UserModals({ mode, user, users, onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [transferTo, setTransferTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sync state when opening
  const init = useCallback(() => {
    setError(null);
    if (user) {
      setEmail(user.email);
      setName(user.name);
      setRole(user.role);
      setCanViewAll(user.canViewAll);
      setIsActive(user.isActive);
    } else {
      setEmail('');
      setName('');
      setPassword('');
      setRole('user');
      setCanViewAll(false);
      setIsActive(true);
    }
    setTransferTo('');
    setPassword('');
  }, [user]);

  // Run init when modal opens
  useState(() => { if (mode) init(); });

  if (!mode) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password, role, canViewAll }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Create failed' }));
          setError(d.error || 'Create failed');
          return;
        }
      } else if (mode === 'edit' && user) {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, role, canViewAll, isActive }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Update failed' }));
          setError(d.error || 'Update failed');
          return;
        }
      } else if (mode === 'delete' && user) {
        const url = new URL(`/api/admin/users/${user.id}`, window.location.origin);
        if (transferTo) url.searchParams.set('transferDataTo', transferTo);
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Delete failed' }));
          setError(d.error || 'Delete failed');
          return;
        }
      } else if (mode === 'reset-password' && user) {
        const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Reset failed' }));
          setError(d.error || 'Reset failed');
          return;
        }
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const strength = passwordStrength(password);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {mode === 'create' && 'Add user'}
          {mode === 'edit' && 'Edit user'}
          {mode === 'delete' && 'Delete user'}
          {mode === 'reset-password' && 'Reset password'}
        </h3>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-3">
          {mode === 'create' && (
            <>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
                {password && (
                  <div className="mt-1">
                    <div className="h-1.5 bg-gray-200 rounded">
                      <div className={`h-1.5 rounded ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{strength.label}</div>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
                  <option value="user">Standard user</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {role === 'user' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
                  Can view all data across users
                </label>
              )}
            </>
          )}
          {mode === 'edit' && (
            <>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
                  <option value="user">Standard user</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {role === 'user' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
                  Can view all data across users
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </>
          )}
          {mode === 'delete' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Permanently delete <strong>{user?.email}</strong>? This cannot be undone.
              </p>
              <div>
                <label className={labelCls}>Transfer data to (optional)</label>
                <select className={inputCls} value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                  <option value="">— Delete all data —</option>
                  {users.filter((u) => u.id !== user?.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {mode === 'reset-password' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Reset password for <strong>{user?.email}</strong>. This will invalidate all of the user&apos;s active sessions.
              </p>
              <div>
                <label className={labelCls}>New password *</label>
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
                {password && (
                  <div className="mt-1">
                    <div className="h-1.5 bg-gray-200 rounded">
                      <div className={`h-1.5 rounded ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{strength.label}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className={
              mode === 'delete'
                ? 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm'
                : 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm'
            }
            disabled={busy}
          >
            {busy ? 'Saving…' : mode === 'delete' ? 'Delete' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}