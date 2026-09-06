'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Settings {
  company_name: string;
  company_tagline: string;
}

const NAV_LINKS = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/sales', label: 'Sales' },
  { href: '/mileage', label: 'Mileage' },
  { href: '/imports', label: 'Import' },
  { href: '/reports', label: 'Reports' },
  { href: '/profile', label: 'Profile' },
];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings>({ company_name: 'Resale Manager', company_tagline: '' });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.company_name) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  if (!session?.user) return null;

  const role = session.user.role;
  const canViewAll = session.user.canViewAll;

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                {settings.company_name}
              </Link>
            </div>
            <nav className="ml-6 flex items-center space-x-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {role === 'admin' && (
                <>
                  <Link
                    href="/admin/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname.startsWith('/admin/users')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/settings"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname.startsWith('/admin/settings')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">{session.user.name}</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                role === 'admin'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {role === 'admin' ? 'Admin' : canViewAll ? 'User · Can View All' : 'User'}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}