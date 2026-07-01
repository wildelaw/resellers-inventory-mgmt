'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { CreateUserModal, EditUserModal, DeleteUserModal, ResetPasswordModal } from '@/components/UserModals';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/lib/utils';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  canViewAll: boolean;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
}

type ModalType = 'create' | 'edit' | 'delete' | 'resetPassword' | null;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (type: ModalType, user?: User) => {
    setSelectedUser(user || null);
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  const handleSuccess = () => {
    closeModal();
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <button
            onClick={() => openModal('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Create User
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{user.role}</span>
                      {user.canViewAll && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">· can view all</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal('edit', user)}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Edit</button>
                        <button onClick={() => openModal('resetPassword', user)}
                          className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400">Reset PW</button>
                        {user.id.toString() !== session?.user?.id && (
                          <button onClick={() => openModal('delete', user)}
                            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <CreateUserModal
        isOpen={modalType === 'create'}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

      {selectedUser && (
        <>
          <EditUserModal
            isOpen={modalType === 'edit'}
            onClose={closeModal}
            onSuccess={handleSuccess}
            user={selectedUser}
            currentUserId={session?.user?.id || ''}
          />
          <DeleteUserModal
            isOpen={modalType === 'delete'}
            onClose={closeModal}
            onSuccess={handleSuccess}
            user={selectedUser}
            allUsers={users}
          />
          <ResetPasswordModal
            isOpen={modalType === 'resetPassword'}
            onClose={closeModal}
            onSuccess={handleSuccess}
            user={selectedUser}
          />
        </>
      )}
    </div>
  );
}
