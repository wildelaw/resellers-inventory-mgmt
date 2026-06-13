'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Settings {
  company_name: string;
  company_tagline: string;
}

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  if (!session?.user) return null;

  const isAdmin = session.user.role === 'admin';

  const links = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/sales', label: 'Sales' },
    { href: '/mileage', label: 'Mileage' },
    { href: '/imports', label: 'Import' },
    { href: '/reports', label: 'Reports' },
    { href: '/profile', label: 'Profile' },
    ...(isAdmin
      ? [
          { href: '/admin/users', label: 'Users' },
          { href: '/admin/settings', label: 'Settings' },
        ]
      : []),
  ];

  const roleBadge = session.user.role === 'admin'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
    : session.user.canViewAll
      ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  const roleLabel = session.user.role === 'admin'
    ? 'Admin'
    : session.user.canViewAll
      ? 'User · Can View All'
      : 'User';

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                {settings?.company_name || 'Resale Manager'}
              </Link>
            </div>
            <nav className="ml-6 flex space-x-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {session.user.name || session.user.email}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${roleBadge}`}>
              {roleLabel}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}