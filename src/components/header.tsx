'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Settings {
  company_name: string | null;
  company_tagline: string | null;
}

function classNames(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSettings(s))
      .catch(() => {});
  }, [status]);

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

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="text-lg font-bold text-blue-600 truncate">
              {settings?.company_name ?? 'Resell Inventory Manager'}
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={classNames(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === l.href || pathname.startsWith(l.href + '/')
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  {l.label}
                </Link>
              ))}
              {isAdmin && adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={classNames(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(l.href)
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {status === 'authenticated' && session.user && (
              <>
                <div className="text-sm text-right hidden sm:block">
                  <div className="font-medium">{session.user.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isAdmin ? 'Admin' : canViewAll ? 'User · Can View All' : 'User'}
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-sm"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
        {/* Mobile nav row */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={classNames(
                'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap',
                pathname === l.href || pathname.startsWith(l.href + '/')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-gray-700 dark:text-gray-300',
              )}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && adminLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}