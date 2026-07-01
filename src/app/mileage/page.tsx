import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import MileageClient from './MileageClient';
import Link from 'next/link';

export default async function MileagePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = parseInt(session.user.id, 10);
  const data = await db.query.mileage.findMany({
    where: eq(mileage.ownerId, userId),
    orderBy: [desc(mileage.date)],
  });

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mileage</h1>
          <div className="flex gap-2">
            <Link href="/api/mileage/export" className="btn-secondary">Export CSV</Link>
            <Link href="/mileage/new" className="btn-primary">Add Entry</Link>
          </div>
        </div>
        <MileageClient initialEntries={data as never} />
      </main>
    </div>
  );
}