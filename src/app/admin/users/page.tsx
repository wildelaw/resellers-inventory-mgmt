'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header';
import { apiGet } from '@/lib/api-client';
import { CreateUserModal, EditUserModal, DeleteUserModal, ResetPasswordModal, type EditableUser } from '@/components/UserModals';

interface UserRow {
  id: number; email: string; name: string; role: 'admin' | 'user';
  canViewAll: boolean; isActive: boolean;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<EditableUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<EditableUser | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: '100' });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    const res = await apiGet<{ users: UserRow[] }>(`/api/admin/users?${params.toString()}`);
    if (res.ok && res.data) setUsers(res.data.users);
    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const meId = session?.user?.id ? parseInt(session.user.id, 10) : 0;
  const companyName = 'Resale Manager';

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header companyName={companyName} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add User</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex gap-2">
          <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">View all</th><th className="p-3">Active</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">{u.email}{u.id === meId && <span className="ml-2 text-xs text-gray-400">(you)</span>}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">{u.canViewAll ? 'Yes' : 'No'}</td>
                  <td className="p-3">{u.isActive ? 'Yes' : 'No'}</td>
                  <td className="p-3 flex flex-wrap gap-1">
                    <button onClick={() => setEditUser(u)} className="text-blue-600 dark:text-blue-400 text-xs">Edit</button>
                    <button onClick={() => setResetUserId(u.id)} className="text-orange-600 text-xs">Reset pw</button>
                    {u.id !== meId && <button onClick={() => setDeleteUser(u)} className="text-red-600 text-xs">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />
      <EditUserModal open={!!editUser} user={editUser} isSelf={editUser?.id === meId} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load(); }} />
      <DeleteUserModal open={!!deleteUser} user={deleteUser} transferTargets={users.filter((u) => u.id !== deleteUser?.id)} onClose={() => setDeleteUser(null)} onSaved={() => { setDeleteUser(null); load(); }} />
      <ResetPasswordModal open={!!resetUserId} userId={resetUserId} onClose={() => setResetUserId(null)} onSaved={() => setResetUserId(null)} />
    </div>
  );
}