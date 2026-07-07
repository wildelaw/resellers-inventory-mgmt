import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/lib/session-provider';

export const metadata: Metadata = {
  title: 'Resell Inventory Manager',
  description: 'Track inventory purchases, sales, profitability, and mileage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}