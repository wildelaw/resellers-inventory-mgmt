'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageShell from '@/components/page-shell';
import { CreateUserModal, EditUserModal, ResetPasswordModal, DeleteUserModal, type AdminUser } from '@/components/UserModals';

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | null;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUserId = Number(session?.user?.id ?? 0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  const loadUsers = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/users?pageSize=100');
      if (!res.ok) {
        setError('Failed to load users');
        return;
      }
      const data = await res.json();
      setUsers(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} users</p>
        </div>
        <button
          onClick={() => setModal({ kind: 'create' })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-md text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              {['Name', 'Email', 'Role', 'Data Access', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No users found.</td></tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.name}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.email}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white capitalize">{user.role}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  {user.role === 'admin' ? 'All data' : user.canViewAll ? 'All data (view)' : 'Own data only'}
                </td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {user.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                  <button onClick={() => setModal({ kind: 'edit', user })} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                  <button onClick={() => setModal({ kind: 'reset', user })} className="text-yellow-600 hover:text-yellow-700 mr-3">Reset Password</button>
                  <button onClick={() => setModal({ kind: 'delete', user })} className="text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.kind === 'create' && (
        <CreateUserModal onClose={() => { setModal(null); loadUsers(); }} />
      )}
      {modal?.kind === 'edit' && (
        <EditUserModal user={modal.user} currentUserId={currentUserId} onClose={() => { setModal(null); loadUsers(); }} />
      )}
      {modal?.kind === 'reset' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <DeleteUserModal user={modal.user} users={users} onClose={() => { setModal(null); loadUsers(); }} />
      )}
    </PageShell>
  );
}