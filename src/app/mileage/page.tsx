import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { canViewAllData } from '@/lib/auth-utils';
import { formatDate } from '@/lib/utils';
import Header from '@/components/header';
import MileageClient from './MileageClient';

export default async function MileagePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const viewAll = canViewAllData(session);
  const userId = Number(session.user.id);

  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (!viewAll) {
    conditions.push(eq(mileage.ownerId, userId));
  }

  const vehicle = typeof params.vehicle === 'string' ? params.vehicle : undefined;
  if (vehicle) {
    conditions.push(eq(mileage.vehicle, vehicle));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, countResult] = await Promise.all([
    db.select().from(mileage).where(whereClause).orderBy(desc(mileage.date)).limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(mileage).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Get total miles
  const totalsResult = await db.select({
    totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
  }).from(mileage).where(whereClause).get();

  const totalMiles = totalsResult?.totalMiles ?? 0;

  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <MileageClient
          initialEntries={entries}
          pagination={{ page, pageSize, total, totalPages }}
          totalMiles={Number(totalMiles)}
          vehicleFilter={vehicle}
        />
      </Suspense>
    </>
  );
}