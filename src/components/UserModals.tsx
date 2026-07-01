'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  canViewAll: boolean;
  isActive: boolean;
}

interface UserModalsProps {
  modal: { type: 'create' | 'edit' | 'delete' | 'resetPassword'; user?: User } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserModals({ modal, onClose, onSuccess }: UserModalsProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [canViewAll, setCanViewAll] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [transferDataTo, setTransferDataTo] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (modal?.type === 'edit' || modal?.type === 'delete') {
      fetch('/api/admin/users?pageSize=100')
        .then((r) => r.json())
        .then((d) => setUsers(d.users?.filter((u: User) => u.id !== modal.user?.id) || []))
        .catch(() => {});
    }
    if (modal?.user) {
      setEmail(modal.user.email);
      setName(modal.user.name);
      setRole(modal.user.role);
      setCanViewAll(modal.user.canViewAll);
      setIsActive(modal.user.isActive);
    } else {
      setEmail('');
      setName('');
      setPassword('');
      setRole('user');
      setCanViewAll(false);
      setIsActive(true);
    }
    setError('');
  }, [modal]);

  if (!modal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (modal.type === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password, role, canViewAll }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to create user');
        }
      } else if (modal.type === 'edit' && modal.user) {
        const res = await fetch(`/api/admin/users/${modal.user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, role, canViewAll, isActive }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update user');
        }
      } else if (modal.type === 'delete' && modal.user) {
        const url = `/api/admin/users/${modal.user.id}${transferDataTo ? `?transferDataTo=${transferDataTo}` : ''}`;
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to delete user');
        }
      } else if (modal.type === 'resetPassword' && modal.user) {
        const res = await fetch(`/api/admin/users/${modal.user.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to reset password');
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="card max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {modal.type === 'create' && 'Add User'}
          {modal.type === 'edit' && 'Edit User'}
          {modal.type === 'delete' && 'Delete User'}
          {modal.type === 'resetPassword' && 'Reset Password'}
        </h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          {modal.type === 'create' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={8} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {role === 'user' && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} className="mr-2" />
                    <span className="text-sm">Can view all data</span>
                  </label>
                </div>
              )}
            </>
          )}
          {modal.type === 'edit' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {role === 'user' && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={canViewAll} onChange={(e) => setCanViewAll(e.target.checked)} className="mr-2" />
                    <span className="text-sm">Can view all data</span>
                  </label>
                </div>
              )}
              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="mr-2" />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </>
          )}
          {modal.type === 'delete' && (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete <strong>{modal.user?.name}</strong> ({modal.user?.email})? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Transfer data to (optional)</label>
                <select value={transferDataTo} onChange={(e) => setTransferDataTo(e.target.value)} className="input-field">
                  <option value="">Delete all data</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {modal.type === 'resetPassword' && (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Reset password for <strong>{modal.user?.name}</strong>. This will invalidate all their active sessions.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">New Password *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" required minLength={8} />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className={modal.type === 'delete' ? 'btn-danger' : 'btn-primary'}
            >
              {loading ? 'Saving...' : modal.type === 'delete' ? 'Delete' : modal.type === 'resetPassword' ? 'Reset Password' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}