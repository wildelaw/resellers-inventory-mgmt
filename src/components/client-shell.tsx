'use client';

import { useEffect, useState } from 'react';
import Header from './header';
import { apiGet } from '@/lib/api-client';

/**
 * Client-side shell for interactive ('use client') pages — login/profile/edit
 * forms etc. Renders the Header (also a client component) and fetches the
 * company name from the settings API. Server data pages use AppShell instead.
 */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState('Resale Manager');
  useEffect(() => {
    apiGet<{ company_name: string }>('/api/settings').then((res) => {
      if (res.ok && res.data?.company_name) setCompanyName(res.data.company_name);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header companyName={companyName} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}