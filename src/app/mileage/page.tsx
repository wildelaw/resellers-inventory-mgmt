import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import Header from '@/components/header';
import { formatDate } from '@/lib/utils';
import MileageClient from './MileageClient';

export const dynamic = 'force-dynamic';

export default async function MileagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.set(k, v);
  }

  const startDate = sp.get('startDate');
  const endDate = sp.get('endDate');
  const conditions = [eq(mileage.ownerId, Number(session.user.id))];
  if (startDate) {
    const d = new Date(`${startDate}T00:00:00`);
    if (!Number.isNaN(d.getTime())) conditions.push(gte(mileage.date, d.getTime()));
  }
  if (endDate) {
    const d = new Date(`${endDate}T00:00:00`);
    if (!Number.isNaN(d.getTime())) conditions.push(lte(mileage.date, d.getTime()));
  }
  const rows = db.select().from(mileage).where(and(...conditions)).orderBy(desc(mileage.date)).all();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Mileage</h1>
        <MileageClient rows={rows as never} startDate={startDate ?? ''} endDate={endDate ?? ''} />
      </main>
    </div>
  );
}