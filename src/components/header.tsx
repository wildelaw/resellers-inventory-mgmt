'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState('Resale Manager');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.company_name) setCompanyName(data.company_name);
        }
      } catch {
        // Use default
      }
    }
    if (session) fetchSettings();
  }, [session]);

  if (!session) return null;

  const isAdmin = session.user.role === 'admin';
  const canViewAll = session.user.canViewAll === true;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {companyName}
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              <Link href="/inventory" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Inventory
              </Link>
              <Link href="/sales" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Sales
              </Link>
              <Link href="/mileage" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Mileage
              </Link>
              <Link href="/imports" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Import
              </Link>
              <Link href="/reports" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                Reports
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1">
                <Link href="/admin/users" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  Users
                </Link>
                <Link href="/admin/settings" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  Settings
                </Link>
              </div>
            )}
            <Link href="/profile" className="flex items-center space-x-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{session.user.name}</span>
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Admin</span>
              ) : canViewAll ? (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">User · Can View All</span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">User</span>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden flex items-center space-x-1 pb-3 overflow-x-auto">
          <Link href="/inventory" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Inventory</Link>
          <Link href="/sales" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Sales</Link>
          <Link href="/mileage" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Mileage</Link>
          <Link href="/imports" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Import</Link>
          <Link href="/reports" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Reports</Link>
          {isAdmin && (
            <>
              <Link href="/admin/users" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Users</Link>
              <Link href="/admin/settings" className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">Settings</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}