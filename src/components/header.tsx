'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Settings {
  company_name: string;
  company_tagline: string;
}

export default function Header() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  if (status === 'loading') {
    return <header className="bg-white dark:bg-gray-800 shadow-sm h-16" />;
  }
  if (!session?.user) return null;

  const isAdmin = session.user.role === 'admin';
  const canViewAll = (session.user as { canViewAll?: boolean }).canViewAll === true;

  const navLinks = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/sales', label: 'Sales' },
    { href: '/mileage', label: 'Mileage' },
    { href: '/imports', label: 'Import' },
    { href: '/reports', label: 'Reports' },
    { href: '/profile', label: 'Profile' },
  ];

  const roleBadge = isAdmin
    ? 'Admin'
    : canViewAll
      ? 'User · Can View All'
      : 'User';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
              {settings?.company_name || 'Resale Manager'}
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                >
                  {l.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <Link href="/admin/users" className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                    User Management
                  </Link>
                  <Link href="/admin/settings" className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
              {session.user.name}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {roleBadge}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
