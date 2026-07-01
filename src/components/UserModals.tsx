'use client';

import { useState, FormEvent } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// ─────────────────────────────────────────────────────────────────
// Create User Modal
// ─────────────────────────────────────────────────────────────────
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, canViewAll: role === 'user' ? canViewAll : false }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setName(''); setEmail(''); setPassword(''); setRole('user'); setCanViewAll(false);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Create User">
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name">
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email Address">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Min 8 chars with uppercase, lowercase, digit, and special character
          </p>
        </Field>
        <Field label="Role">
          <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} className={inputClass}>
            <option value="user">Standard User</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
        {role === 'user' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={canViewAll} onChange={e => setCanViewAll(e.target.checked)} className="text-blue-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data</span>
          </label>
        )}
        <ModalButtons onClose={onClose} loading={loading} confirmLabel="Create User" />
      </form>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// Edit User Modal
// ─────────────────────────────────────────────────────────────────
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  currentUserId: string;
}

export function EditUserModal({ isOpen, onClose, onSuccess, user, currentUserId }: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'admin' | 'user'>(user.role);
  const [canViewAll, setCanViewAll] = useState(user.canViewAll);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSelf = user.id.toString() === currentUserId;

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, canViewAll: role === 'user' ? canViewAll : false, isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Edit User">
      {error && <ErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name">
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email Address">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'user')}
            disabled={isSelf}
            className={inputClass}
          >
            <option value="user">Standard User</option>
            <option value="admin">Administrator</option>
          </select>
          {isSelf && <p className="mt-1 text-xs text-gray-500">You cannot change your own role</p>}
        </Field>
        {role === 'user' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={canViewAll} onChange={e => setCanViewAll(e.target.checked)} className="text-blue-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data</span>
          </label>
        )}
        {!isSelf && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="text-blue-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Account active</span>
          </label>
        )}
        <ModalButtons onClose={onClose} loading={loading} confirmLabel="Save Changes" />
      </form>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// Delete User Modal
// ─────────────────────────────────────────────────────────────────
interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  allUsers: User[];
}

export function DeleteUserModal({ isOpen, onClose, onSuccess, user, allUsers }: DeleteUserModalProps) {
  const [transferTo, setTransferTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const otherUsers = allUsers.filter(u => u.id !== user.id && u.isActive);

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    try {
      const params = transferTo ? `?transferDataTo=${transferTo}` : '';
      const res = await fetch(`/api/admin/users/${user.id}${params}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Delete User">
      {error && <ErrorBanner message={error} />}
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete <strong>{user.name}</strong>? This action is permanent.
        </p>
        {otherUsers.length > 0 && (
          <Field label="Transfer data to (optional)">
            <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className={inputClass}>
              <option value="">-- Delete all their data --</option>
              {otherUsers.map(u => (
                <option key={u.id} value={u.id.toString()}>{u.name} ({u.email})</option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// Reset Password Modal
// ─────────────────────────────────────────────────────────────────
interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
}

export function ResetPasswordModal({ isOpen, onClose, onSuccess, user }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setPassword('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title={`Reset Password — ${user.name}`}>
      {error && <ErrorBanner message={error} />}
      <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4">
        This will invalidate all of the user's active sessions.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New Password">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Min 8 chars with uppercase, lowercase, digit, and special character
          </p>
        </Field>
        <ModalButtons onClose={onClose} loading={loading} confirmLabel="Reset Password" />
      </form>
    </ModalWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────
function ModalWrapper({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function ModalButtons({ onClose, loading, confirmLabel }: { onClose: () => void; loading: boolean; confirmLabel: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Saving...' : confirmLabel}
      </button>
    </div>
  );
}
