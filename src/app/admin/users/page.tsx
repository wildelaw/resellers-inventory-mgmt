'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { CreateUserModal, EditUserModal, DeleteUserModal, ResetPasswordModal } from '@/components/UserModals';
import { formatDate } from '@/lib/utils';

interface User { id: number; email: string; name: string; role: string; canViewAll: boolean; isActive: boolean; createdAt: number; lastLogin: number | null; }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users?pageSize=100');
    if (res.ok) { const d = await res.json(); setUsers(d.users); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add User</button>
        </div>
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">View All</th><th className="px-4 py-3 text-left">Active</th><th className="px-4 py-3 text-left">Last Login</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3">{u.name}</td><td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                    <td className="px-4 py-3">{u.canViewAll ? '✓' : '—'}</td>
                    <td className="px-4 py-3">{u.isActive ? '✓' : '✗'}</td>
                    <td className="px-4 py-3">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                    <td className="px-4 py-3"><div className="flex gap-2 text-xs"><button onClick={() => setEditUser(u)} className="text-blue-600">Edit</button><button onClick={() => setResetUserId(u.id)} className="text-orange-600">Reset PW</button><button onClick={() => setDeleteUserId(u.id)} className="text-red-500">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />
        <EditUserModal open={editUser !== null} user={editUser} onClose={() => setEditUser(null)} onSuccess={fetchUsers} />
        <DeleteUserModal open={deleteUserId !== null} userId={deleteUserId} onClose={() => setDeleteUserId(null)} onSuccess={fetchUsers} />
        <ResetPasswordModal open={resetUserId !== null} userId={resetUserId} onClose={() => setResetUserId(null)} onSuccess={fetchUsers} />
      </main>
    </div>
  );
}
