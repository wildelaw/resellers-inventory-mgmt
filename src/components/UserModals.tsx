'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
}

interface ModalShellProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  error?: string;
}

function ModalShell({ title, children, onClose, error }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-lg w-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// ---------------------------------------------------------------------------
// Create User Modal — includes the canViewAll checkbox (user role only)
// ---------------------------------------------------------------------------

export function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role, canViewAll }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.details ? data.details.join('. ') : data.error || 'Failed to create user');
        return;
      }
      onCreated?.();
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add User" onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="new-user-email">Email *</label>
          <input id="new-user-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-user-name">Name *</label>
          <input id="new-user-name" type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-user-password">Password *</label>
          <input id="new-user-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            At least 8 characters with uppercase, lowercase, digit, and special character.
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="new-user-role">Role</label>
          <select id="new-user-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'user' && (
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data</span>
          </label>
        )}
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Edit User Modal — includes canViewAll toggle; admins can't deactivate or
// role-change their own account.
// ---------------------------------------------------------------------------

export function EditUserModal({
  user,
  currentUserId,
  onClose,
}: {
  user: AdminUser;
  currentUserId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [canViewAll, setCanViewAll] = useState(user.canViewAll);
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSelf = user.id === currentUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          ...(isSelf ? {} : { role, isActive }),
          ...(role === 'user' ? { canViewAll } : { canViewAll: false }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update user');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Edit User: ${user.name}`} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="edit-user-email">Email *</label>
          <input id="edit-user-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-user-name">Name *</label>
          <input id="edit-user-name" type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-user-role">Role</label>
          <select
            id="edit-user-role"
            className={inputClass}
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You cannot change your own role.</p>}
        </div>
        {role === 'user' && (
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data</span>
          </label>
        )}
        {!isSelf && (
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
        )}
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Reset Password Modal — notes that this invalidates active sessions
// ---------------------------------------------------------------------------

export function ResetPasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = (() => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();
  const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.details ? data.details.join('. ') : data.error || 'Failed to reset password');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Reset Password: ${user.name}`} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="reset-password-input">New Password *</label>
          <input
            id="reset-password-input"
            type="password"
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {newPassword && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Strength: {strengthLabels[strength]}
            </p>
          )}
        </div>
        <p className="text-sm text-orange-600 dark:text-orange-400">
          This will invalidate all of the user&apos;s active sessions.
        </p>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {saving ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Delete User Modal — optional data transfer to another user
// ---------------------------------------------------------------------------

export function DeleteUserModal({
  user,
  users,
  onClose,
}: {
  user: AdminUser;
  users: AdminUser[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [transferTo, setTransferTo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const others = users.filter((u) => u.id !== user.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const params = transferTo ? `?transferDataTo=${transferTo}` : '';
      const res = await fetch(`/api/admin/users/${user.id}${params}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete user');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Delete User: ${user.name}`} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          This will permanently delete the user{transferTo ? '' : ' and all of their data'}. This cannot be undone.
        </p>
        <div>
          <label className={labelClass} htmlFor="transfer-user">Transfer data to</label>
          <select id="transfer-user" className={inputClass} value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
            <option value="">Delete all data</option>
            {others.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {saving ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}