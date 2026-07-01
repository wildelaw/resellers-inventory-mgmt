'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import UserModals from '@/components/UserModals';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  canViewAll: boolean;
  isActive: boolean;
  createdAt: number;
  lastLogin: number | null;
}

interface ModalState {
  type: 'create' | 'edit' | 'delete' | 'resetPassword';
  user?: User;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  const loadUsers = () => {
    fetch('/api/admin/users?pageSize=100')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary">Add User</button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">View All</th>
                  <th className="text-left py-2 px-3">Active</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-2 px-3">{u.name}</td>
                    <td className="py-2 px-3">{u.email}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${u.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{u.canViewAll ? '✓' : '—'}</td>
                    <td className="py-2 px-3">{u.isActive ? '✓' : '✗'}</td>
                    <td className="py-2 px-3 flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', user: u })} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setModal({ type: 'resetPassword', user: u })} className="text-sm text-blue-600 hover:underline">Reset Password</button>
                      <button onClick={() => setModal({ type: 'delete', user: u })} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <UserModals
        modal={modal}
        onClose={() => setModal(null)}
        onSuccess={() => { setModal(null); loadUsers(); }}
      />
    </div>
  );
}