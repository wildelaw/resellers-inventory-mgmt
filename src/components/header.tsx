'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState('Resale Manager');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (data.companyName) setCompanyName(data.companyName); })
      .catch(() => {});
  }, []);

  if (!session?.user) return null;

  const isAdmin = session.user.role === 'admin';
  const canViewAll = session.user.canViewAll;

  const navLinks = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/sales', label: 'Sales' },
    { href: '/mileage', label: 'Mileage' },
    { href: '/imports', label: 'Import' },
    { href: '/reports', label: 'Reports' },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  const roleBadge = isAdmin
    ? <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">Admin</span>
    : canViewAll
      ? <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded">User · Can View All</span>
      : <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded">User</span>;

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              {companyName}
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {isAdmin && adminLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <span>{session.user.name}</span>
              {roleBadge}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex flex-wrap gap-3 pb-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium ${
                pathname.startsWith(href)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
          {isAdmin && adminLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium ${
                pathname.startsWith(href)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
