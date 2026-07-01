import type { Metadata } from 'next';
import { SessionProvider } from '@/lib/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resale Manager',
  description: 'Track your resale business inventory, sales, and profitability',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 dark:bg-gray-900">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}