'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import { CreateUserModal, EditUserModal, DeleteUserModal, ResetPasswordModal } from '@/components/UserModals';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    params.set('pageSize', '100');

    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
    }
    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Add User</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="card mb-6">
          <div className="flex gap-4">
            <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Search'}</button>
          </div>
        </form>

        <div className="card overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No users found.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">View All</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Active</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-2 text-sm">{user.name}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-sm">{user.canViewAll ? '✓' : '-'}</td>
                    <td className="py-2 px-2 text-sm">{user.isActive ? '✓' : '✗'}</td>
                    <td className="py-2 px-2 text-right">
                      <button onClick={() => setEditUser(user)} className="text-blue-600 dark:text-blue-400 text-sm hover:underline mr-3">Edit</button>
                      <button onClick={() => setResetUser(user)} className="text-orange-600 dark:text-orange-400 text-sm hover:underline mr-3">Reset Password</button>
                      {user.id !== Number(session?.user?.id) && (
                        <button onClick={() => setDeleteUser(user)} className="text-red-500 text-sm hover:underline">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />

        <EditUserModal
          open={!!editUser}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={fetchUsers}
          currentUserId={Number(session?.user?.id)}
        />

        <DeleteUserModal
          open={!!deleteUser}
          user={deleteUser}
          users={users.filter(u => u.id !== deleteUser?.id)}
          onClose={() => setDeleteUser(null)}
          onSuccess={fetchUsers}
        />

        <ResetPasswordModal
          open={!!resetUser}
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSuccess={fetchUsers}
        />
      </main>
    </div>
  );
}