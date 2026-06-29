import type { ReactNode } from 'react';
import './globals.css';
import SessionProviderWrapper from '@/lib/session-provider';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Resell Inventory Manager',
  description: 'Track inventory purchases, sales, profitability, and mileage.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}