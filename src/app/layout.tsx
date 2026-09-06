import type { Metadata } from 'next';
import { SessionProvider } from '@/lib/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resell Inventory Manager',
  description: 'Track inventory purchases, sales, profitability, and mileage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}