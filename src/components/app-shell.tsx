import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import Header from './header';

/** Server-side shell for authenticated pages: ensures a session, renders Header. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  let companyName = 'Resale Manager';
  try {
    const row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
    if (row) companyName = row.companyName;
  } catch {
    // settings unavailable — use default
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header companyName={companyName} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}