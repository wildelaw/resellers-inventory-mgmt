'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { CreateUserModal, ResetPasswordModal } from '@/components/UserModals';
import ConfirmModal from '@/components/ConfirmModal';
import { useSession } from 'next-auth/react';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<{ id: number; name: string } | null>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
    setDeleteUser(null);
    fetchUsers();
  };

  const toggleViewAll = async (user: any) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canViewAll: !user.canViewAll }),
    });
    fetchUsers();
  };

  const toggleActive = async (user: any) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Add User</button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">View All</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>{user.role === 'admin' ? 'Admin' : 'User'}</span></td>
                  <td className="px-6 py-4"><button onClick={() => toggleViewAll(user)} className={`px-2 py-1 rounded text-xs ${user.canViewAll ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{user.canViewAll ? 'Yes' : 'No'}</button></td>
                  <td className="px-6 py-4"><button onClick={() => toggleActive(user)} className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td className="px-6 py-4 flex space-x-2">
                    <button onClick={() => setResetPwdUser({ id: user.id, name: user.name })} className="text-sm text-orange-600 hover:text-orange-800">Reset Pwd</button>
                    {user.id !== parseInt(session?.user?.id || '0') && <button onClick={() => setDeleteUser(user)} className="text-sm text-red-600 hover:text-red-800">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchUsers} />
        {resetPwdUser && <ResetPasswordModal isOpen={!!resetPwdUser} onClose={() => setResetPwdUser(null)} userId={resetPwdUser.id} userName={resetPwdUser.name} />}
        <ConfirmModal isOpen={!!deleteUser} title="Delete User" message={deleteUser ? `Delete ${deleteUser.name}? This cannot be undone.` : ''} confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteUser(null)} />
      </main>
    </div>
  );
}