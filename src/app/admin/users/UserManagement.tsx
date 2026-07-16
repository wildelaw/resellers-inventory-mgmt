"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  CreateUserModal,
  EditUserModal,
  ResetPasswordModal,
  DeleteUserModal,
} from "@/components/UserModals";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  canViewAll: boolean;
  isActive: boolean;
  createdAt: number;
  lastLogin: number | null;
}

export default function UserManagement({
  currentUserId,
  initial,
}: {
  currentUserId: number;
  initial: UserRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          + Add User
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Last Login</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((u) => (
              <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  {ROLE_LABELS[u.role]}
                  {u.role === "user" && u.canViewAll && " · Can View All"}
                </td>
                <td className="px-3 py-2">{u.lastLogin ? formatDate(u.lastLogin) : "—"}</td>
                <td className="px-3 py-2">
                  {u.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-500">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setResetting(u.id)}
                      className="text-orange-500 hover:underline text-xs"
                    >
                      Reset PW
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => setDeleting(u)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserModal
        open={editing !== null}
        user={editing}
        isSelf={editing?.id === currentUserId}
        onClose={() => setEditing(null)}
      />
      <ResetPasswordModal
        open={resetting !== null}
        userId={resetting}
        onClose={() => setResetting(null)}
      />
      <DeleteUserModal
        open={deleting !== null}
        userId={deleting?.id ?? null}
        otherUsers={initial.filter((u) => u.id !== currentUserId && u.id !== deleting?.id)}
        onClose={() => setDeleting(null)}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
