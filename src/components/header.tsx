'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header({ companyName }: { companyName?: string }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'admin';
  const canViewAll = session?.user?.canViewAll === true;

  const navLinks = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/sales', label: 'Sales' },
    { href: '/mileage', label: 'Mileage' },
    { href: '/imports', label: 'Import' },
    { href: '/reports', label: 'Reports' },
    { href: '/profile', label: 'Profile' },
  ];
  const adminLinks = [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const roleBadge = isAdmin
    ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Admin</span>
    : canViewAll
      ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">User · Can View All</span>
      : <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">User</span>;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-4">
        <Link href="/" className="font-bold text-lg text-blue-600 dark:text-blue-400 whitespace-nowrap">
          {companyName || 'Resale Manager'}
        </Link>
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && adminLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 ml-auto">
          {session?.user && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{session.user.name}</span>
              {roleBadge}
            </div>
          )}
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}