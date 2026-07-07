'use client';

import { useState } from 'react';
import ConfirmModal from './ConfirmModal';

interface UserModalsProps {
  showModal: 'create' | 'edit' | 'delete' | 'resetPassword' | null;
  selectedUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      onSuccess();
      onClose();
      setEmail(''); setName(''); setPassword(''); setRole('user'); setCanViewAll(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add User</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
            <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, digit, special char</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="input-field">
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {role === 'user' && (
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data across users</span>
            </label>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditUserModal({ open, user, onClose, onSuccess, currentUserId }: { open: boolean; user: any; onClose: () => void; onSuccess: () => void; currentUserId: number }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    if (user) {
      setEmail(user.email || '');
      setName(user.name || '');
      setRole(user.role || 'user');
      setCanViewAll(user.canViewAll ?? false);
      setIsActive(user.isActive ?? true);
    }
  });

  if (!open || !user) return null;

  const isSelf = user.id === currentUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit User</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} disabled={isSelf} className="input-field">
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
            {isSelf && <p className="text-xs text-gray-500 mt-1">You cannot change your own role</p>}
          </div>
          {role === 'user' && (
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Can view all data</span>
            </label>
          )}
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isSelf} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            {isSelf && <span className="text-xs text-gray-500">(cannot change own active status)</span>}
          </label>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteUserModal({ open, user, onClose, onSuccess, users }: { open: boolean; user: any; onClose: () => void; onSuccess: () => void; users: any[] }) {
  const [transferDataTo, setTransferDataTo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/users/${user.id}${transferDataTo ? `?transferDataTo=${transferDataTo}` : ''}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      open={open}
      title="Delete User"
      message={`Are you sure you want to delete ${user.name}? This will permanently remove the user.`}
      confirmText={loading ? 'Deleting...' : 'Delete'}
      danger
      onConfirm={handleDelete}
      onCancel={onClose}
    />
  );
}

export function ResetPasswordModal({ open, user, onClose, onSuccess }: { open: boolean; user: any; onClose: () => void; onSuccess: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      onSuccess();
      onClose();
      setNewPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Reset Password</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Reset password for <strong>{user.name}</strong></p>
        <p className="text-sm text-orange-600 dark:text-orange-400 mb-4">This will invalidate all of the user's active sessions.</p>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password *</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" />
            <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, digit, special char</p>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}