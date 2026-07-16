import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import Header from "@/components/header";
import UserManagement from "./UserManagement";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const list = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canViewAll: users.canViewAll,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        <UserManagement
          currentUserId={Number(session.user.id)}
          initial={list.map((u) => ({ ...u, role: u.role as UserRole }))}
        />
      </main>
    </div>
  );
}
