'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { CreateUserModal, EditUserModal, ResetPasswordModal, DeleteUserModal } from '@/components/UserModals';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Add User</button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900"><tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Can View All</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{user.name}</td>
                  <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{user.role}</span></td>
                  <td className="px-4 py-3 text-sm">{user.canViewAll ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-sm">{user.isActive ? '✓' : '✗'}</td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button onClick={() => setEditUser(user)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setResetUser(user)} className="text-orange-600 hover:underline">Reset PW</button>
                    <button onClick={() => setDeleteUser(user)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} onRefresh={fetchUsers} />
      <EditUserModal isOpen={!!editUser} user={editUser} onClose={() => setEditUser(null)} onRefresh={fetchUsers} />
      <ResetPasswordModal isOpen={!!resetUser} user={resetUser} onClose={() => setResetUser(null)} />
      <DeleteUserModal isOpen={!!deleteUser} user={deleteUser} onClose={() => setDeleteUser(null)} onRefresh={fetchUsers} />
    </div>
  );
}
