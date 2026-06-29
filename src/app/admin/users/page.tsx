'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import UserModals from '@/components/UserModals';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
  createdAt: number;
  lastLogin: number | null;
}

type ModalMode = 'create' | 'edit' | 'delete' | 'reset-password' | null;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [target, setTarget] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (mode: ModalMode, user: User | null) => {
    setModalMode(mode);
    setTarget(user);
  };

  const closeModal = () => {
    setModalMode(null);
    setTarget(null);
  };

  const onSaved = () => {
    closeModal();
    load();
    router.refresh();
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            You do not have access to this page.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button onClick={() => openModal('create', null)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
            Add user
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-100 text-sm">{error}</div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Can view all</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3 text-sm">{u.name}</td>
                  <td className="px-4 py-3 text-sm capitalize">{u.role}</td>
                  <td className="px-4 py-3 text-sm">{u.canViewAll ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-sm">{u.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openModal('edit', u)} className="text-blue-600 hover:underline text-sm mr-3">Edit</button>
                    <button onClick={() => openModal('reset-password', u)} className="text-orange-600 hover:underline text-sm mr-3">Reset PW</button>
                    <button onClick={() => openModal('delete', u)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <UserModals
        mode={modalMode}
        user={target}
        users={users}
        onClose={closeModal}
        onSaved={onSaved}
      />
    </div>
  );
}