import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import MileageClient from './MileageClient';

export default async function MileagePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(mileage.ownerId, parseInt(session.user.id));

  const entries = await db.query.mileage.findMany({
    where,
    orderBy: (m, { desc }) => [desc(m.date)],
    limit: 100,
  });

  return <MileageClient initialEntries={entries as any} />;
}
