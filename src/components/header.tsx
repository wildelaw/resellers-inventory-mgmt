"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

interface Settings {
  companyName: string;
  companyTagline: string;
  salesTaxRate: number;
  setupComplete: boolean;
}

const links: Array<{ href: string; label: string; admin?: boolean; canViewAllOnly?: boolean }> = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/mileage", label: "Mileage" },
  { href: "/imports", label: "Import" },
  { href: "/reports", label: "Reports" },
  { href: "/admin/users", label: "Users", admin: true },
  { href: "/admin/settings", label: "Settings", admin: true },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d))
      .catch(() => null);
  }, []);

  const user = session?.user;
  if (!user) return null;

  const role = user.role as UserRole;
  const isAdmin = role === "admin";
  const canViewAll = isAdmin || user.canViewAll;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {settings?.companyName || "Resale Manager"}
            </Link>
            {settings?.companyTagline && (
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                {settings.companyTagline}
              </span>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {links
              .filter((l) => !l.admin || isAdmin)
              .map((l) => {
                const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors " +
                      (active
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700")
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ROLE_LABELS[role]}
                {canViewAll && role !== "admin" ? " · Can View All" : ""}
              </span>
            </div>
            <Link
              href="/profile"
              className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
            >
              Profile
            </Link>
            <button
              onClick={() => signOut({ redirect: false }).then(() => router.push("/login"))}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
        <nav className="md:hidden flex flex-wrap gap-1 pb-2">
          {links
            .filter((l) => !l.admin || isAdmin)
            .map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "px-2 py-1 text-xs rounded " +
                    (active
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
        </nav>
      </div>
    </header>
  );
}
